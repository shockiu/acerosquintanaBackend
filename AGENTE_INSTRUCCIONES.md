# Sistema de Inventario y Obras (Aceros) — Instrucciones para el agente

## 1. Contexto y alcance

Sistema web multiusuario de inventario para una empresa de aceros. Dos roles: **admin** y **user**.

**Stack (obligatorio):** React + Vite · Node.js + Express · Mongoose + MongoDB. TypeScript en ambos lados (si el desarrollador prefiere JS, ajustar).

**Qué NO debe hacer el agente:** imponer una arquitectura de carpetas/capas. La arquitectura de backend y frontend la define el desarrollador. Este documento cubre **inicialización, colecciones, relaciones y reglas de negocio**.

### Módulos
1. **Usuarios y aprobaciones** — roles, solicitudes pendientes, auditoría.
2. **Inventario** — categorías, subcategorías, unidades, ítems, compras/movimientos.
3. **Obras** — trabajos para clientes, materiales usados, costo y ganancia real.
4. **Exportación Excel** — con precios para admin, sin precios para user.

---

## 2. Inicialización del proyecto

```bash
mkdir inventario-aceros && cd inventario-aceros
npm create vite@latest client -- --template react-ts
mkdir server && cd server && npm init -y
```

**Dependencias del servidor**
```bash
npm i express mongoose dotenv cors helmet morgan bcrypt jsonwebtoken zod exceljs cookie-parser
npm i -D typescript tsx @types/node @types/express @types/cors @types/bcrypt @types/jsonwebtoken @types/cookie-parser @types/morgan
```

**Dependencias del cliente** (mínimas; el resto lo decide el desarrollador)
```bash
cd ../client && npm i axios react-router-dom
```

**Variables de entorno (`server/.env`)**
```
PORT=4000
MONGODB_URI=mongodb://localhost:27017/inventario_aceros
JWT_SECRET=cambiar_esto
JWT_EXPIRES_IN=8h
CLIENT_ORIGIN=http://localhost:5173
SEED_ADMIN_EMAIL=admin@empresa.com
SEED_ADMIN_PASSWORD=cambiar_esto
```

**Requisito de MongoDB:** las transacciones (aprobaciones y descuento de stock) necesitan **replica set**. En local usar un replica set de un nodo (o MongoDB Atlas, que ya lo trae).

**Script de seed (obligatorio):** crear
- el usuario admin inicial (hash con bcrypt),
- las **unidades de medida** predefinidas (ver colección `units`).

---

## 3. Colecciones

Convenciones: todas con `timestamps: true`. Dinero y cantidades como **Decimal128** (o enteros en centavos para dinero). Referencias con `ObjectId` + `ref`.

### `users`
| Campo | Tipo | Notas |
|---|---|---|
| name | String | |
| email | String | único, lowercase |
| passwordHash | String | `select: false` |
| role | `'admin' \| 'user'` | |
| isActive | Boolean | desactivar en lugar de borrar |

### `units` (precargadas por seed, no editables desde la app)
| Campo | Tipo | Notas |
|---|---|---|
| name | String | "Metro", "Kilogramo", "Unidad", "Pieza"… |
| symbol | String | "m", "kg", "u" |
| allowsDecimals | Boolean | |

### `categories` (solo admin crea/edita)
| Campo | Tipo |
|---|---|
| name | String (único) |
| description | String |
| isActive | Boolean |

### `subcategories` (solo admin crea/edita)
| Campo | Tipo | Notas |
|---|---|---|
| category | ref `categories` | |
| name | String | único dentro de su categoría |
| unit | ref `units` | la unidad de medida de la subcategoría |
| isActive | Boolean | |

### `inventoryItems`
Un ítem es un producto concreto dentro de una subcategoría (ej. "Tubo redondo 2\" cal. 16").

| Campo | Tipo | Notas |
|---|---|---|
| subcategory | ref `subcategories` | la unidad se hereda de aquí |
| name | String | |
| description | String | |
| kind | `'material' \| 'tool'` | `tool` = herramienta/equipo (martillo, taladro) |
| stock | Decimal128 | para `tool`: cantidad de equipos, no se mueve por obras |
| avgUnitCost | Decimal128 | **solo admin**; costo promedio ponderado |
| isActive | Boolean | |

### `inventoryMovements` (libro de movimientos; fuente de verdad del stock)
| Campo | Tipo | Notas |
|---|---|---|
| item | ref `inventoryItems` | |
| type | `'purchase' \| 'adjustment' \| 'work_consumption' \| 'work_reversal'` | |
| quantity | Decimal128 | positiva entra, negativa sale |
| unitCost | Decimal128 | **solo admin**; en compras |
| totalCost | Decimal128 | **solo admin**; el usuario puede registrar precio unitario **o** total, el sistema calcula el otro |
| work | ref `works` | solo en consumos/reversiones |
| createdBy | ref `users` | |
| approvedBy | ref `users` | |
| note | String | |

> `stock` en `inventoryItems` es un valor derivado/cacheado de los movimientos; se actualiza en la misma transacción que crea el movimiento.

### `changeRequests` (cola de aprobación)
Toda acción de un `user` que modifique inventario u obras se guarda aquí en lugar de aplicarse.

| Campo | Tipo | Notas |
|---|---|---|
| entity | `'inventoryItem' \| 'inventoryMovement' \| 'work'` | |
| action | `'create' \| 'update' \| 'delete'` | |
| targetId | ObjectId (opcional) | null en `create` |
| payload | Mixed | datos propuestos (incluye precios si el user… ver regla R3) |
| status | `'pending' \| 'approved' \| 'rejected'` | |
| requestedBy | ref `users` | |
| reviewedBy | ref `users` | |
| reviewedAt | Date | |
| rejectionReason | String | |

### `works` (Obras)
| Campo | Tipo | Notas |
|---|---|---|
| clientName | String | |
| description | String | |
| performedAt | Date | fecha y hora de la obra |
| chargedPrice | Decimal128 | **solo admin** lo ingresa y lo ve |
| status | `'pending_approval' \| 'approved' \| 'rejected'` | |
| items | `[ workItem ]` | subdocumentos, ver abajo |
| materialsCost | Decimal128 | **solo admin**; suma de `subtotal` de materiales |
| profit | Decimal128 | **solo admin**; `chargedPrice - materialsCost` |
| createdBy | ref `users` | |
| approvedBy | ref `users` | |

**`workItem` (subdocumento)**
| Campo | Tipo | Notas |
|---|---|---|
| item | ref `inventoryItems` | |
| kind | `'material' \| 'tool'` | copia del ítem al momento |
| quantity | Decimal128 | |
| unitCostSnapshot | Decimal128 | **solo admin**; costo promedio al aprobar; 0/null en `tool` |
| subtotal | Decimal128 | **solo admin**; `quantity × unitCostSnapshot` (solo `material`) |

### `auditLogs`
| Campo | Tipo |
|---|---|
| actor | ref `users` |
| action | String (ej. `inventory.update`, `request.approve`, `work.create`) |
| entity / entityId | String / ObjectId |
| before / after | Mixed |
| ip | String (opcional) |

---

## 4. Relaciones

```
categories 1──N subcategories N──1 units
subcategories 1──N inventoryItems
inventoryItems 1──N inventoryMovements
works 1──N workItems(embebidos) N──1 inventoryItems
users 1──N changeRequests / works / inventoryMovements / auditLogs
changeRequests ──(al aprobar)──> crea/actualiza inventoryItems | inventoryMovements | works
```

Índices sugeridos: `users.email` (unique), `subcategories {category, name}` (unique), `inventoryItems.subcategory`, `inventoryMovements.item`, `changeRequests {status, createdAt}`, `works.performedAt`.

---

## 5. Reglas de negocio (críticas)

**R1 — Permisos**
- Solo `admin`: crear/editar categorías y subcategorías, gestionar usuarios, aprobar/rechazar, ver auditoría completa.
- `admin` y `user` pueden proponer altas/ediciones/bajas de ítems, compras y obras.
- Las unidades **no** se crean desde la app.

**R2 — Aprobaciones**
- Si el actor es `admin`: la acción se aplica directamente (y se audita).
- Si el actor es `user`: se crea un `changeRequest` en `pending`; **no se toca el inventario**.
- Al aprobar: aplicar el cambio dentro de una **transacción** de Mongo (cambio + movimiento + auditoría + actualización del request).
- Al rechazar: no se aplica nada; guardar motivo.
- Una solicitud solo puede resolverse una vez (idempotencia: verificar `status === 'pending'` dentro de la transacción).

**R3 — Visibilidad de precios (se aplica en el backend, no solo en la UI)**
- Campos sensibles: `avgUnitCost`, `unitCost`, `totalCost`, `chargedPrice`, `materialsCost`, `profit`, `unitCostSnapshot`, `subtotal`, y cualquier valor de inventario.
- Para `role === 'user'`: **excluir** estos campos en todas las respuestas (proyección/DTO por rol) y en las exportaciones.
- Mantener un único punto de serialización por rol para que ningún endpoint olvide filtrar.
- Pendiente de decisión del desarrollador: si un `user` registra una compra, ¿puede enviar precio? El requisito dice que solo admin ve precios; se sugiere que el precio de compra lo complete el admin al aprobar.

**R4 — Compras y costo**
- Una compra acepta precio unitario **o** total; calcular el faltante.
- Costo del ítem: **promedio ponderado** al ingresar compras.
  `nuevoCosto = (stock·costoActual + cantidad·costoCompra) / (stock + cantidad)`

**R5 — Obras**
- Crear obra por `user` → `works.status = 'pending_approval'` + `changeRequest`. Por `admin` → aprobada directo.
- **El descuento de inventario ocurre solo cuando la obra queda aprobada**, nunca antes.
- Al aprobar, en una transacción:
  1. Validar stock suficiente de cada `material` (si falta, abortar y avisar).
  2. Crear `inventoryMovements` tipo `work_consumption` (cantidad negativa).
  3. Fijar `unitCostSnapshot` y `subtotal` de cada material.
  4. Calcular `materialsCost` y `profit = chargedPrice − materialsCost`.
- **Herramientas (`kind: 'tool'`)**: se pueden listar en la obra, pero **no descuentan stock ni suman costo**.
- Editar/eliminar una obra aprobada: generar `work_reversal` para devolver stock y recalcular, siempre vía el mismo flujo de aprobación.
- `chargedPrice` solo lo ingresa el admin. Si el `user` crea la obra, el admin lo completa al revisar.

**R6 — Stock**
- Nunca permitir stock negativo.
- `allowsDecimals = false` en la unidad ⇒ rechazar cantidades fraccionarias.

**R7 — Auditoría**
- Registrar en `auditLogs` toda creación, edición, borrado, aprobación y rechazo, con el estado antes/después.

**R8 — Borrados**
- Preferir desactivación (`isActive: false`) sobre borrado físico en categorías, subcategorías, ítems y usuarios, para no romper referencias históricas.

---

## 6. Exportación a Excel (`exceljs`)

- Endpoint por sección (inventario, obras). Mismo endpoint, columnas según rol.
- **Admin:** incluye costos, valor total por ítem/subcategoría/categoría, y en obras: precio cobrado, costo de materiales y ganancia.
- **User:** solo categoría, subcategoría, ítem, cantidad y unidad. Sin ninguna columna de precio.
- Generar el archivo en el servidor, usando el mismo serializador por rol de R3.

---

## 7. Orden sugerido de implementación

1. Conexión a Mongo, modelos, seed (admin + unidades).
2. Autenticación y autorización por rol.
3. Categorías y subcategorías (admin).
4. Inventario + movimientos + compras (con `changeRequests` y aprobaciones).
5. Serialización por rol (R3) y auditoría.
6. Obras (cálculo de costo/ganancia y descuento al aprobar).
7. Exportación a Excel.
8. Pruebas de los casos críticos: stock insuficiente, doble aprobación, fuga de precios a `user`, herramientas sin afectar costo.

---

## 8. Criterios de aceptación

- Un `user` nunca recibe un campo de precio, ni por API ni por Excel.
- Una acción de `user` no cambia el inventario hasta que el admin la aprueba.
- Aprobar una obra descuenta solo materiales y calcula `profit` correctamente.
- Las herramientas no alteran stock ni costo de la obra.
- Toda acción queda trazada en `auditLogs`.
