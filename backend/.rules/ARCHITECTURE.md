# Arquitectura y Estructura de Archivos

## Patrón Arquitectónico
El proyecto utiliza un enfoque inspirado en la **Arquitectura Hexagonal (Puertos y Adaptadores)** y el **Domain-Driven Design (DDD)**. 

El objetivo principal de este patrón es separar estrictamente la lógica de negocio (dominio y aplicación) de los detalles técnicos y de infraestructura (bases de datos, frameworks de red, librerías externas). Esto permite que el sistema sea totalmente agnóstico a las tecnologías utilizadas, facilitando precisamente lo que buscas: **poder migrar o adaptar la lógica a cualquier otro framework** (como Express, NestJS, Fastify, etc.) con un esfuerzo de refactorización mínimo y concentrado.

---

## Estructura Global de Carpetas

La raíz del código fuente (`src/`) está organizada de la siguiente manera:

```text
src/
├── config/       # Configuraciones globales (variables de entorno, conexiones, constantes)
├── middleware/   # Interceptores de red (autenticación, manejo de errores globales)
├── models/       # Definiciones de esquemas de Base de Datos centralizados
├── modules/      # Lógica de negocio dividida por dominios (Agrupación principal)
├── shared/       # Lógica y recursos compartidos entre múltiples módulos
└── sockets/      # Configuración y controladores para conexiones en tiempo real (WebSockets)
```

### ¿Por qué se estructuró así a nivel global?
- **Modularidad por Funcionalidad (`modules`)**: En lugar de la clásica agrupación por tipo de archivo (todos los controladores juntos, todos los servicios juntos en carpetas raíz), el proyecto se divide por "dominios de negocio" (ej. `auth`, `tasks`, `shopping`). Esto favorece un bajo acoplamiento y hace que cada módulo funcione casi como un microservicio interno.
- **Modelos Centralizados (`models`)**: Aunque la arquitectura fomenta la máxima separación, la definición de los esquemas de persistencia se mantuvo centralizada en la raíz para facilitar las relaciones y poblado de datos entre diferentes colecciones/tablas.
- **Recursos Comunes (`shared`)**: Previene la duplicación de código alojando lógica transversal, como el envío de notificaciones o utilidades globales que varios módulos necesitan.

---

## Estructura Interna de un Módulo (`src/modules/[modulo]`)

Esta es la parte más importante para tu migración. Cada carpeta de módulo (por ejemplo, `tasks`, `auth` o `shopping`) sigue una división estricta en tres capas concéntricas:

```text
modules/tasks/
├── application/
│   ├── schemas/     # Validadores de datos de entrada y salida (Data Transfer Objects)
│   └── useCases/    # Casos de uso (Servicios): Orquestación de la lógica de negocio
├── domain/          # Entidades puras, interfaces de repositorios y errores propios
└── infrastructure/
    ├── http/        # Controladores y definición de Rutas (El punto de entrada del framework)
    └── persistence/ # Implementación de repositorios (Acceso real a la Base de Datos)
```

### 1. Capa de Dominio (`domain`)
- **Qué contiene**: El corazón inmutable del negocio. Contiene las definiciones de tipos, entidades, reglas de negocio puras y los contratos/interfaces de lo que espera de la persistencia (ej. la interfaz `ITaskRepository`).
- **Por qué se usa**: No debe importar nada de `application` ni `infrastructure`. Su única responsabilidad es modelar el negocio sin saber si existe la web o qué base de datos se está usando.

### 2. Capa de Aplicación (`application`)
- **Qué contiene**: Los "Casos de Uso" (o Servicios). Aquí se dicta el flujo paso a paso (ej. "Para crear una tarea: primero valida los datos en `schemas`, luego verifica en DB, guárdalo y finalmente emite un evento al sistema de notificaciones").
- **Por qué se usa**: Orquesta las piezas del dominio, utilizando las interfaces abstractas (nunca herramientas de base de datos directas). Al estar desacoplado del entorno de red, **un caso de uso puede ser llamado por un controlador HTTP, por un socket, o por una consola de comandos**, sin cambiar ni una línea de código.

### 3. Capa de Infraestructura (`infrastructure`)
- **Qué contiene**: Todos los detalles técnicos y adaptadores externos.
  - `http/`: Los Controladores. Su única labor es recibir la petición del framework web, extraer el `body` o `params`, pasarle esa información cruda al Caso de Uso correspondiente, recibir el resultado y devolverlo al cliente en un formato de respuesta estándar.
  - `persistence/`: Aquí se implementan de verdad los contratos del `domain` utilizando el ORM o driver de base de datos elegido.
- **Por qué se usa**: Actúa como un escudo para el resto del sistema. **Esta es la única capa que "conoce" las tecnologías de terceros.**

---

## Beneficios Directos para tu Adaptación a Otro Framework

1. **Aislamiento del Framework de Red**: Al cambiar de framework, **únicamente tendrás que reescribir los archivos dentro de `infrastructure/http/`**, los archivos en `middleware/` y el entry-point de la aplicación (`src/app.ts` o `src/index.ts`).
2. **Reutilización Total del Negocio**: Todo el código de las carpetas `application/` y `domain/` de cada módulo puede ser copiado y pegado a tu nuevo proyecto casi sin modificaciones.
3. **Cambio de Base de Datos Indoloro**: Si el día de mañana el nuevo proyecto decide cambiar de base de datos, solo deberás crear nuevos archivos en `infrastructure/persistence/` y `models/`, respetando los contratos de las interfaces del dominio, y el resto del sistema funcionará perfectamente sin enterarse del cambio.
