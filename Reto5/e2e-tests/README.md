# Reto 5 - Pruebas E2E (Cucumber)

Suite de pruebas end-to-end para validar el flujo completo del sistema de microservicios del proyecto:

- disponibilidad del API Gateway,
- seguridad y control de acceso por roles,
- onboarding de empleados,
- offboarding de empleados.

Las pruebas estan implementadas con Cucumber, Axios y Chai.

## Estructura

```
e2e-tests/
|-- features/
|   |-- 01_smoke.feature
|   |-- 02_security.feature
|   |-- 03_onboarding.feature
|   `-- 04_offboarding.feature
|-- step_definitions/
|   |-- smoke.steps.js
|   |-- security.steps.js
|   |-- onboarding.steps.js
|   `-- offboarding.steps.js
|-- support/
|   |-- hooks.js
|   |-- polling.js
|   `-- world.js
|-- reports/
|   `-- cucumber-report.json
|-- package.json
`-- .env
```

## Prerrequisitos

- Node.js 18+ (recomendado 20)
- npm 9+
- El stack de microservicios levantado y operativo (incluyendo `api-gateway` y `auth-service`)
- Datos base de autenticacion existentes (usuarios ADMIN y USER)

## Instalacion

Desde la carpeta `Reto5/e2e-tests`:

```bash
npm install
```

## Configuracion (`.env`)

La suite usa variables de entorno cargadas con `dotenv`.

Archivo sugerido `Reto5/e2e-tests/.env`:



### Variables importantes

- `BASE_URL`: URL base del API Gateway.
- `ADMIN_EMAIL` / `ADMIN_PASSWORD`: credenciales para escenarios de administracion.
- `USER_EMAIL` / `USER_PASSWORD`: credenciales para escenarios de permisos de usuario.
- `POLLING_MAX_ATTEMPTS`: intentos maximos para esperar eventos asincronos.
- `POLLING_INTERVAL_MS`: intervalo de espera entre intentos de polling.

## Como ejecutar

Ejecutar toda la suite:

```bash
npm test
```

El comando ejecuta:

```bash
cucumber-js
```

## Ejecutar por feature

```bash
```bash
npx cucumber-js features/01_smoke.feature
npx cucumber-js features/02_security.feature
npx cucumber-js features/03_onboarding.feature
npx cucumber-js features/04_offboarding.feature
```
```

## Reportes

La configuracion de Cucumber genera:

- salida de progreso en consola,
- reporte JSON en `reports/cucumber-report.json`.

## Cobertura funcional

### 1) Smoke

Valida que el gateway este vivo (respuesta esperada `200` en la URL base).

### 2) Seguridad

Valida que:

- sin token no hay acceso (`401`),
- con token invalido no hay acceso (`401`),
- `USER` puede consultar pero no crear empleados (`200` / `403`),
- `ADMIN` si puede crear empleados (`201`).

### 3) Onboarding

Valida que al crear un empleado:

- se registre correctamente (`201`),
- se creen credenciales en el servicio de autenticacion,
- se genere notificacion de bienvenida,
- el empleado pueda establecer contrasena y autenticarse.

### 4) Offboarding

Valida que al desvincular un empleado:

- se procese la eliminacion (`200`),
- se genere notificacion de desvinculacion,
- el usuario desvinculado no pueda volver a autenticarse,
- la recuperación de contraseña deba retornar `200` por seguridad (u omitir detalles), pero el usuario debe seguir inhabilitado.

## Notas de estabilidad

- Los escenarios que dependen de eventos asincronos usan polling configurable.
- Se usan emails unicos con timestamp para evitar colisiones entre ejecuciones.
- El `BeforeAll` espera disponibilidad inicial del gateway para reducir falsos negativos por arranque.

## Troubleshooting rapido

### Falla con `BASE_URL no esta definida en .env`

Verifica que exista `Reto5/e2e-tests/.env` y que tenga `BASE_URL`.

### Falla login de USER o ADMIN

Verifica que las credenciales de `.env` correspondan a usuarios reales en `auth-service`.

### Fallan escenarios de onboarding/offboarding por timeout

Puede haber latencia en RabbitMQ o en consumidores. Incrementa:

```env
POLLING_MAX_ATTEMPTS=25
POLLING_INTERVAL_MS=2500
```

### Errores 401/403 inesperados

Revisa:

- token usado en el escenario,
- rol del usuario autenticado,
- que el gateway y los servicios esten corriendo contra el mismo entorno de datos.

## Comandos utiles

```bash
# Ejecutar solo un escenario por nombre
npx cucumber-js --name "Usuario ADMIN puede crear un empleado"

# Ejecutar en formato progreso (ya incluido por defecto)
npx cucumber-js --format progress

# Regenerar reporte JSON explicitamente
npx cucumber-js --format json:reports/cucumber-report.json
```

## Resultado esperado

Con el entorno correcto, todos los escenarios deben pasar y generar el reporte JSON en `reports/cucumber-report.json`.
