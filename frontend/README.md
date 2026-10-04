# Aceros Quintana - Frontend

Panel Administrativo (*Single Page Application*) para Aceros Quintana.

## Stack Tecnológico
- **React 19** + **Vite**
- **TypeScript** estricto.
- **Tailwind CSS v3** + **Shadcn UI** (Componentes Radix).
- **React Query (TanStack Query v5)** para caché global y peticiones eficientes.
- **Zod** para validación de datos en cliente.

## Funcionalidades Principales
- **Inventario**: Vista de catálogo inteligente, agrupado por jerarquía. Permite a los Admins aprovisionar stock directamente o a usuarios solicitar compras.
- **Obras**: Control exacto de uso de materiales para un cliente, controlando fugas.
- **Bandeja de Aprobaciones**: Panel exclusivo de Administradores para dar luz verde a operaciones sensibles (asignando precios y costos ocultos para operarios).
- **Módulo de Auditoría**: Trazabilidad completa con visores JSON que documentan cambios "Antes y Después" de las operaciones sensibles, protegiendo contra pérdida de información.
- **Exportación**: Descargas directas de reportes a Excel.

## Scripts 
- `npm run dev`: Entorno local de desarrollo.
- `npm run build`: Compilación de producción en la carpeta `dist`.
- `npm run lint`: Análisis estático de código.
