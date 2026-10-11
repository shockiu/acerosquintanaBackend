# Adenda — Piezas y retazos (seguimiento híbrido opcional)

Complementa `AGENTE_INSTRUCCIONES.md`. Aplica solo a ítems con `kind: 'material'`. Todo lo no mencionado aquí (aprobaciones, auditoría, visibilidad de precios R3, transacciones) **se mantiene igual**. La arquitectura de carpetas/capas la define el desarrollador.

## 1. Objetivo

Hay materiales que se compran y cuentan **por pieza** (ej. tubo de 3 m), pero se consumen **por medida** (ej. 2,7 m). El sobrante (retazo) debe seguir existiendo en el sistema y poder reutilizarse.

**Es opcional por ítem.** Si un ítem no tiene `pieceSpec`, se comporta exactamente como antes (stock y consumo en su unidad). El cliente puede no usar esta función y el sistema no cambia.

## 2. Cambios en colecciones

### `inventoryItems` — campo opcional nuevo `pieceSpec`

| Campo | Tipo | Notas |
|---|---|---|
| pieceSpec | subdocumento \| null | si es null/ausente ⇒ ítem sin seguimiento de piezas |
| pieceSpec.pieceSize | Decimal128 | medida estándar de **una** pieza (ej. 3 ó 6) |
| pieceSpec.measureUnit | ref `units` | unidad de medida de uso (ej. metro; en láminas puede ser m²) |
| pieceSpec.minUsableMeasure | Decimal128 (opcional) | por debajo de esto, el sobrante se considera merma automáticamente |

Cuando `pieceSpec` existe:
- `stock` = **piezas enteras** disponibles (no incluye retazos).
- `avgUnitCost` = costo promedio **por pieza** (R4 sin cambios).
- Costo por medida: `costPerMeasure = avgUnitCost / pieceSize` (derivado, no se almacena en el ítem).
- Medida total disponible = `stock × pieceSize + Σ longitud de retazos disponibles`.
- Se necesita una unidad **"Pieza"** en el seed de `units` (stock se cuenta siempre en piezas, aunque `subcategory.unit` sea la de medida).

Validaciones: `pieceSize > 0`; `measureUnit` debe existir en `units`; las cantidades de medida respetan `units.allowsDecimals`.
Solo se puede quitar `pieceSpec` si no hay retazos `available` del ítem.

### `remnants` (colección nueva)

| Campo | Tipo | Notas |
|---|---|---|
| item | ref `inventoryItems` | |
| measure | Decimal128 | medida actual del retazo (ej. 0,3) |
| costPerMeasureSnapshot | Decimal128 | **solo admin**; costo por medida al momento de crearse; no cambia después |
| status | `'available' \| 'used' \| 'discarded'` | |
| originWork | ref `works` | obra que lo generó |
| parentRemnant | ref `remnants` (opcional) | si proviene de cortar otro retazo |
| usedInWork | ref `works` (opcional) | obra que lo consumió |
| createdBy / approvedBy | ref `users` | |

Los retazos son **inmutables en medida**: al cortar uno se marca `used` y, si sobra algo, se crea otro con `parentRemnant`. Esto conserva la trazabilidad.

Índices: `{item, status}`, `originWork`.

### `works.items[]` (workItem) — campos nuevos, solo para ítems con `pieceSpec`

| Campo | Tipo | Notas |
|---|---|---|
| source | `'whole_piece' \| 'remnant'` | de dónde se corta |
| remnant | ref `remnants` | obligatorio si `source = 'remnant'` |
| measureUsed | Decimal128 | medida realmente consumida |

Para estos ítems, `quantity` no aplica; el consumo se expresa en `measureUsed`. `unitCostSnapshot` pasa a ser el **costo por medida** usado y `subtotal = measureUsed × unitCostSnapshot`.

### `inventoryMovements` — tipos nuevos

| type | Cuándo | Efecto |
|---|---|---|
| `cut` | consumo desde pieza entera | `quantity = -1` (pieza); guarda `measureUsed` y `work` |
| `remnant_consumption` | consumo desde retazo | sin cambio en `stock`; referencia al retazo |
| `waste` | retazo descartado o sobrante < `minUsableMeasure` | referencia al retazo; guarda costo (solo admin) |

Campos opcionales nuevos en el movimiento: `measureUsed`, `remnant`.

### `changeRequests`
Agregar `'remnant'` a `entity` (para que un `user` solicite descartar un retazo). Crear retazos **no** pasa por solicitud: se generan automáticamente al aprobar una obra.

## 3. Reglas de negocio

**P1 — Consumo desde pieza entera** (al aprobar la obra, dentro de la misma transacción de R5):
1. Validar `stock ≥ 1` y `0 < measureUsed ≤ pieceSize`.
2. `stock -= 1`; crear movimiento `cut`.
3. `sobrante = pieceSize − measureUsed`.
4. Si `sobrante > 0`:
   - si `minUsableMeasure` está definido y `sobrante < minUsableMeasure` ⇒ registrar movimiento `waste` (no se crea retazo);
   - si no ⇒ crear retazo `available` con `costPerMeasureSnapshot = avgUnitCost / pieceSize`.

**P2 — Consumo desde retazo:**
1. Validar retazo `available` y `0 < measureUsed ≤ retazo.measure`.
2. Marcar retazo `used` (`usedInWork`); movimiento `remnant_consumption`.
3. Si sobra medida, crear retazo hijo (`parentRemnant`) con el mismo `costPerMeasureSnapshot`, o `waste` según `minUsableMeasure`.
4. `unitCostSnapshot` del workItem = `costPerMeasureSnapshot` del retazo.

**P3 — Costo de la obra:** `subtotal = measureUsed × costPerMeasure`. Solo cuenta lo **realmente usado**; el sobrante no se carga a la obra.

**P4 — Merma (decisión asumida, pendiente de confirmar con el cliente):** el costo de un retazo descartado se registra como **merma aparte**, no se carga a la obra que lo generó. Mantenerlo como un único punto configurable (constante o setting) por si el cliente prefiere cargarlo a la obra.

**P5 — Descarte manual:** `admin` descarta directo; `user` genera `changeRequest`. Al aprobar: retazo → `discarded` + movimiento `waste`.

**P6 — Valor de inventario (solo admin):**
`stock × avgUnitCost + Σ (retazo.measure × retazo.costPerMeasureSnapshot)` de retazos `available`.

**P7 — Reversión de obra (extiende R5):** al revertir, devolver la pieza a `stock` y anular los retazos que esa obra creó **solo si siguen `available`**. Si alguno ya fue usado, **bloquear** la reversión y avisar al admin.

**P8 — Visibilidad (extiende R3):** `costPerMeasureSnapshot` y cualquier valor derivado son campos sensibles. El `user` ve medidas, piezas y retazos disponibles, nunca costos.

**P9 — Stock insuficiente:** al validar una obra con ítem de piezas, verificar contra la fuente elegida (pieza entera o retazo concreto). Si otra obra aprobada antes consumió ese retazo, abortar y avisar (el estado se verifica dentro de la transacción).

## 4. Ejemplo numérico (usar como prueba)

Tubo, `pieceSize = 3` m, `avgUnitCost = 30` por pieza, `stock = 2`, `minUsableMeasure = 0,2`.

| Paso | Resultado |
|---|---|
| Costo por metro | 30 / 3 = **10** |
| Obra A usa 2,7 m de pieza entera | `stock = 1`; costo obra = 27; retazo de **0,3 m** (valor 3) |
| Obra B usa 0,25 m del retazo | retazo anterior `used`; costo = 2,5; sobrante 0,05 < 0,2 ⇒ `waste` (valor 0,5) |
| Valor de inventario final (admin) | 1 pieza × 30 = **30** |
| Merma acumulada | **0,5** |

## 5. Exportación a Excel
- Añadir hoja **"Retazos"**: ítem, medida, estado, obra de origen. El admin ve además costo y valor; el user no.
- En la hoja de inventario, mostrar para ítems con `pieceSpec`: piezas enteras, retazos disponibles y medida total.

## 6. Comportamiento esperado en la interfaz (solo lo funcional)
- Formulario del ítem: sección opcional "Seguimiento por piezas" (medida de la pieza + unidad). Oculta por defecto.
- En una obra, al elegir un ítem con `pieceSpec`: escoger **pieza entera** o **retazo disponible**, ingresar la medida usada y mostrar el sobrante resultante antes de enviar.
- Vista de retazos por ítem, con filtro por estado.

## 7. Orden sugerido
1. Campo `pieceSpec` + seed de la unidad "Pieza" + validaciones.
2. Colección `remnants` y tipos nuevos de movimiento.
3. Lógica P1/P2/P3 dentro de la aprobación de obras.
4. Descarte (P5), reversión (P7) y valor de inventario (P6).
5. Serialización por rol (P8) y exportación.
6. Pruebas con el ejemplo de la sección 4 y los casos: retazo ya usado (P9), reversión bloqueada, `minUsableMeasure`, ítem **sin** `pieceSpec` sin cambios de comportamiento.

## 8. Criterios de aceptación
- Un ítem sin `pieceSpec` funciona igual que antes.
- Consumir parte de una pieza descuenta 1 pieza y crea el retazo correcto.
- El costo de la obra refleja solo la medida usada.
- Un retazo nunca se consume dos veces.
- El `user` no ve ningún costo de piezas ni retazos, ni por API ni por Excel.
- Todo movimiento y descarte queda en `auditLogs`.
