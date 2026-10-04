# Aceros Quintana - Sistema Administrativo

Este repositorio contiene el código fuente completo (Frontend y Backend) para el sistema de control de inventario y gestión de obras de Aceros Quintana. Está estructurado como un monorepo para facilitar el desarrollo y el versionado conjunto de ambas piezas.

## Estructura del Proyecto

- `/backend`: API RESTful construida con Node.js, Express y MongoDB. Contiene toda la lógica de negocio, reglas de validación y conexión a base de datos.
- `/frontend`: Panel administrativo interactivo (SPA) construido con React, Vite, Tailwind CSS y Shadcn UI.

## Requisitos Previos

- Node.js (v18 o superior recomendado)
- MongoDB (local o nube - Atlas)
- Git

## Guía Rápida de Inicio

1. **Instalación de Dependencias**
   Debes instalar los paquetes en ambos subproyectos:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. **Configuración de Entorno**
   - En `/backend`: Copia el archivo `.env.example` a `.env` y asegúrate de configurar tu `MONGO_URI` y un `JWT_SECRET` seguro.

3. **Ejecución (Modo Desarrollo)**
   Para trabajar localmente, levanta ambos entornos de manera independiente:
   
   **Terminal 1 (Backend):**
   ```bash
   cd backend
   npm run dev
   ```
   *El servidor escuchará peticiones en `http://localhost:4000`*

   **Terminal 2 (Frontend):**
   ```bash
   cd frontend
   npm run dev
   ```
   *La interfaz de usuario cargará en `http://localhost:5173`*

## Módulos del Sistema (MVP - Fases 1 a 5)

1. **Inventario**: Catálogo dinámico de materiales y herramientas categorizadas.
2. **Obras**: Asignación y costeo de materiales para proyectos y clientes.
3. **Aprobaciones (Admin)**: Bandeja de entrada estricta para validar ingresos y salidas afectando los precios ocultos.
4. **Auditoría (Admin)**: Logs inmutables que muestran cambios en la DB antes y después de operaciones críticas.
5. **Reportes**: Descarga nativa de data a Excel.

> Para consultar el detalle técnico específico de la UI o de la Arquitectura de la API, consulta los respectivos archivos `README.md` ubicados dentro de las carpetas `/backend` y `/frontend`.
