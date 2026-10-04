# Aceros Quintana - Backend

Este es el backend del sistema administrativo y de inventario de Aceros Quintana, construido bajo un patrón de Diseño Basado en Funcionalidades (*Feature-First*).

## Stack Tecnológico
- **Node.js** + **Express**
- **TypeScript**
- **MongoDB** + **Mongoose**
- **Zod** para validación rigurosa de contratos.
- **JWT** (JSON Web Tokens) para autenticación y sistema de roles (Admin / User).
- **Vitest** para pruebas automatizadas.

## Módulos Principales
- `auth`: Autenticación y gestión de sesiones.
- `inventory`: Gestión del catálogo, control de stock y cálculo de costos promedios ponderados.
- `works`: Gestión de obras y registro de materiales extraídos.
- `approvals`: Sistema de cola de peticiones (Change Requests) para auditoría de acciones que involucren costos (exclusivo para Admins).
- `audit`: Registro inmutable (Auditoría) de operaciones para trazabilidad (`before` vs `after`).
- `exports`: Exportación robusta a formato Excel.

## Scripts 
- `npm run dev`: Inicia el servidor en modo desarrollo con HMR.
- `npm run build`: Compila el código hacia `dist`.
- `npm run seed`: Puebla la base de datos con un usuario super administrador base.
- `npm test`: Ejecuta los test de integración.
