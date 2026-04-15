# Retos implementados usando arquitectura de microservicios

Arquitectura de microservicios desacoplados con comunicación asíncrona vía RabbitMQ. Cada servicio posee su propia base de datos, corre en un contenedor Docker independiente e implementa patrones de resiliencia. Se agrega en el Reto 3 un broker de mensajes que conecta cuatro servicios especializados.

---

## Arquitectura General

```
┌─────────────────────────────────────────────────────────────────┐
│                         Docker Network                          │
│                                                                 │
│  ┌──────────────┐   HTTP    ┌──────────────────┐                │
│  │  Empleados   │ ────────► │  Departamentos   │                │
│  │  (Node.js)   │           │     (Go/Gin)     │                │
│  │  Port: 8080  │           │   Port: 8081     │                │
│  └──────┬───────┘           └──────────────────┘                │
│         │  Publish events                                       │
│         ▼                                                       │
│  ┌──────────────┐                                               │
│  │   RabbitMQ   │  fanout exchange: empleados_exchange          │
│  │  Port: 5672  │                                               │
│  └──────┬───────┘                                               │
│         │                                                       │
│    ┌────┴────┐                                                  │
│    ▼         ▼                                                  │
│  ┌──────────────┐     ┌──────────────────┐                      │
│  │ Servicio de  │     │  Gestión de      │                      │
│  │Notificaciones│     │    Perfiles      │                      │
│  │   (Java)     │     │    (Java)        │                      │
│  │ Port: 8084   │     │  Port: 8085      │                      │
│  └──────────────┘     └──────────────────┘                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Servicios

| Servicio               | Lenguaje    | Puerto | Base de Datos            | Rol                                      |
|------------------------|-------------|--------|--------------------------|------------------------------------------|
| Gestión de Empleados   | Node.js 20  | 8080   | PostgreSQL (5433)        | CRUD empleados, publica eventos RabbitMQ |
| Gestión de Departamentos | Go 1.25   | 8081   | PostgreSQL (5434)        | CRUD departamentos, autoconexión DB      |
| Servicio de Notificaciones | Java 17 | 8084   | MySQL (3306)             | Consume eventos, genera notificaciones   |
| Gestión de Perfiles    | Java 17     | 8085   | PostgreSQL (5435)        | Consume eventos, gestiona perfiles       |

---

## Message Broker — RabbitMQ

### ¿Por qué RabbitMQ?

RabbitMQ es la opción ideal para este sistema porque:

- **Desacoplamiento total**: Los servicios productores y consumidores no se conocen entre sí
- **Entrega garantizada**: Los mensajes persisten en colas incluso si el consumidor está caído
- **Fanout exchange**: Un solo evento se enruta automáticamente a múltiples consumidores
- **Escalabilidad horizontal**: Se pueden agregar nuevos consumidores sin modificar el productor
- **Protocolo AMQP**: Estándar industrial con soporte nativo en Node.js, Go y Java

### Configuración del Exchange

```
Exchange: empleados_exchange (tipo: fanout, durable: true)
├── Queue: notificaciones.queue  → Servicio de Notificaciones
└── Queue: perfiles.queue        → Gestión de Perfiles
```

### Formato de Mensajes

**Evento empleado creado:**
```json
{
  "event": "empleado.creado",
  "empleadoId": "uuid-del-empleado",
  "nombre": "Juan Pérez",
  "email": "juan@empresa.com",
  "departamentoId": 1
}
```

**Evento empleado eliminado:**
```json
{
  "event": "empleado.eliminado",
  "empleadoId": "uuid-del-empleado",
  "nombre": "Juan Pérez",
  "email": "juan@empresa.com"
}
```

---

## Flujo de Eventos

### Al crear un empleado (`POST /empleados`)

```
Cliente → Empleados Service
              │
              ├─► PostgreSQL (persiste empleado)
              │
              └─► RabbitMQ [empleados_exchange]
                        │
                   ┌────┴────┐
                   ▼         ▼
          notificaciones   perfiles
             .queue          .queue
                │               │
                ▼               ▼
        Registra          Crea perfil
        BIENVENIDA        por defecto
        en MySQL          en PostgreSQL
```

### Al eliminar un empleado (`DELETE /empleados/:id`)

```
Cliente → Empleados Service
              │
              ├─► PostgreSQL (elimina empleado)
              │
              └─► RabbitMQ [empleados_exchange]
                        │
                        ▼
               notificaciones.queue
                        │
                        ▼
               Registra DESVINCULACION
               en MySQL
               (Perfiles ignora este evento)
```

---

## Patrones de Resiliencia

| Servicio               | Patrón                              | Tecnología           |
|------------------------|-------------------------------------|----------------------|
| Gestión de Empleados   | Circuit Breaker                     | opossum              |
| Gestión de Empleados   | Retry con backoff exponencial       | axios-retry          |
| Gestión de Empleados   | Timeout en llamadas HTTP            | axios timeout        |
| Gestión de Empleados   | Fallback controlado                 | opossum fallback     |
| Gestión de Departamentos | Reconexión automática a DB        | Go custom middleware |
| Gestión de Departamentos | Health check con retry            | Docker healthcheck   |
| Notificaciones         | Health check con retry              | Docker healthcheck   |
| Notificaciones         | Idempotencia en consumer            | try/catch + log      |
| Gestión de Perfiles    | Idempotencia en creación de perfil  | existsByEmpleadoId() |
| Gestión de Perfiles    | Health check con retry              | Docker healthcheck   |

---

## Bases de Datos

| Servicio               | Motor      | Puerto | Base de datos     | Volumen             |
|------------------------|------------|--------|-------------------|---------------------|
| Gestión de Empleados   | PostgreSQL | 5433   | empleados_db      | empleados_data      |
| Gestión de Departamentos | PostgreSQL | 5434 | departamentos_db  | departamentos_data  |
| Servicio de Notificaciones | MySQL  | 3306   | notificaciones_db | notifications_data  |
| Gestión de Perfiles    | PostgreSQL | 5435   | perfiles_db       | perfiles_data       |

---

## Documentación Swagger / OpenAPI

| Servicio               | Swagger UI                                  | API Docs (JSON)                           |
|------------------------|---------------------------------------------|-------------------------------------------|
| Gestión de Departamentos | http://localhost:8081/swagger/index.html  | http://localhost:8081/swagger/doc.json    |
| Servicio de Notificaciones | http://localhost:8084/swagger-ui.html   | http://localhost:8084/api-docs            |
| Gestión de Perfiles    | http://localhost:8085/swagger-ui.html       | http://localhost:8085/api-docs            |

---

## Despliegue Completo

```bash
# Desde la raíz del proyecto
docker compose up --build -d
```

Verificar que todos los servicios estén saludables:

```bash
docker compose ps
```

### Verificación del flujo completo

**1. Crear un empleado:**
```bash
curl -X POST http://localhost:8080/empleados \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Ana García","email":"ana@empresa.com","departamentoId":1}'
```

**2. Verificar notificación de bienvenida:**
```bash
curl http://localhost:8084/notificaciones
```

**3. Verificar perfil creado automáticamente:**
```bash
curl http://localhost:8085/perfiles
```

**4. Eliminar el empleado:**
```bash
curl -X DELETE http://localhost:8080/empleados/<id-del-empleado>
```

**5. Verificar notificación de desvinculación:**
```bash
curl http://localhost:8084/notificaciones
```

**6. Actualizar perfil manualmente:**
```bash
curl -X PUT http://localhost:8085/perfiles/<empleadoId> \
  -H "Content-Type: application/json" \
  -d '{"telefono":"555-1234","ciudad":"Bogotá","biografia":"Desarrolladora Senior"}'
```

---


## Estructura del Proyecto

```
.
├── docker-compose.yml
├── README.md
├── Reto1/
│   └── gestion-empleados/          # Node.js 20 + Express + RabbitMQ publisher
│       ├── Dockerfile
│       ├── index.js                # CRUD endpoints + Circuit Breaker + Retry
│       ├── rabbitmq.js             # Módulo publicador de eventos
│       ├── init.sql                # Schema inicial PostgreSQL
│       ├── package.json
│       └── README.md
├── Reto2/
│   └── gestion-departamentos/      # Go 1.25 + Gin + Swagger
│       ├── Dockerfile
│       ├── main.go                 # CRUD endpoints + auto-reconnect middleware
│       ├── go.mod
│       ├── init.sql
│       ├── docs/                   # OpenAPI generado por swaggo
│       └── README.md
└── Reto3/
    ├── servicio-notificaciones/    # Java 17 + Spring Boot 3.2 + MySQL
    │   ├── Dockerfile
    │   ├── pom.xml
    │   ├── src/main/java/com/notificaciones/
    │   │   ├── NotificacionesApplication.java
    │   │   ├── config/             # RabbitMQConfig, OpenApiConfig
    │   │   ├── consumer/           # EmpleadoEventConsumer
    │   │   ├── controller/         # NotificacionController (Swagger anotado)
    │   │   ├── model/              # Notificacion entity
    │   │   ├── repository/         # NotificacionRepository
    │   │   └── service/            # NotificacionService
    │   ├── src/main/resources/application.properties
    │   └── README.md
    └── gestion-perfiles/           # Java 17 + Spring Boot 3.2 + PostgreSQL
        ├── Dockerfile
        ├── pom.xml
        ├── src/main/java/com/perfiles/
        │   ├── PerfilesApplication.java
        │   ├── config/             # RabbitMQConfig, OpenApiConfig
        │   ├── consumer/           # EmpleadoEventConsumer
        │   ├── controller/         # PerfilController (Swagger anotado)
        │   ├── dto/                # ActualizarPerfilRequest
        │   ├── model/              # Perfil entity
        │   ├── repository/         # PerfilRepository
        │   └── service/            # PerfilService
        ├── src/main/resources/application.properties
        └── README.md

---

## Reto 4 — Seguridad y Control de Acceso con JWT

### Nuevos Servicios

| Servicio       | Lenguaje   | Puerto | Base de Datos          | Rol                                               |
|----------------|------------|--------|------------------------|---------------------------------------------------|
| auth-service   | Node.js 20 | 3001   | PostgreSQL (5436)      | Autenticación, emisión y validación de JWT, RBAC  |

### Arquitectura de Seguridad

```
Cliente HTTP
     │
     ▼  POST /auth/login → JWT de acceso
┌─────────────┐
│ auth-service│  :3001
│  (Node.js)  │◄── empleado.creado  (RabbitMQ empleados_exchange)
│             │──► usuario.creado   (RabbitMQ auth_exchange)
│             │──► usuario.recuperacion (RabbitMQ auth_exchange)
└──────┬──────┘
       │ empleado.eliminado → inhabilita usuario
       │
       └─► auth_exchange ──► notificaciones.auth.queue
                                     │
                                     ▼
                            notificaciones-service
                            (simula envío de email con token)

Todos los demás servicios validan el Bearer JWT en CADA petición:
  empleados-service  (Node.js – jsonwebtoken middleware)
  departamentos-service (Go – HMAC-SHA256 manual)
  perfiles-service   (Java – HandlerInterceptor HMAC-SHA256)
  notificaciones-service (Java – HandlerInterceptor HMAC-SHA256)
```

### Estrategia de Validación de Token

#### Opción A: API Gateway centralizado

Un único componente (p. ej. Kong, Nginx, AWS API Gateway) intercepta todas las peticiones, valida el JWT y las reenvía al servicio destino solo si son válidas.

| Ventajas | Desventajas |
|----------|-------------|
| Lógica de seguridad en un solo lugar | Punto único de fallo |
| Los microservicios quedan sin lógica de auth | Mayor latencia (hop extra) |
| Fácil de cambiar algoritmo/clave | Nuevo componente de infraestructura a operar |

#### Opción B: Middleware/Interceptor por servicio *Elegida*

Cada microservicio incorpora su propio middleware que valida el JWT con la clave compartida antes de procesar la petición.

| Ventajas | Desventajas |
|----------|-------------|
| Sin componente extra de infraestructura | La clave simétrica debe distribuirse a todos los servicios |
| Latencia mínima (validación local) | Lógica de validación replicada (aunque trivial con libs nativas) |
| Independencia total entre servicios | Cambio de clave requiere redespliegue de todos los servicios |

**Justificación de la elección:** Para un sistema académico con cinco servicios bien delimitados, introducir un API Gateway añadiría complejidad operacional sin beneficio proporcional. La validación local es inmediata, cada servicio sigue siendo autónomo y el cambio de estrategia (a RS256 asimétrico, por ejemplo) solo requiere actualizar la función de verificación en cada servicio sin modificar la arquitectura.

Cada lenguaje usa sus herramientas nativas:
- **Node.js** → `jsonwebtoken` (`jwt.verify`)
- **Go** → `github.com/golang-jwt/jwt/v4`
- **Java** → `javax.crypto.Mac` con `HmacSHA256`

### Tipos de Tokens

| Token          | Algoritmo | Payload clave                            | TTL    | Propósito                             |
|----------------|-----------|------------------------------------------|--------|---------------------------------------|
| Access JWT     | HS256     | `{ sub, role, iat, exp }`               | 1 hora | Autenticar peticiones REST            |
| Reset JWT      | HS256     | `{ sub, type: "RESET_PASSWORD", exp }`  | 1 hora | Establecer/recuperar contraseña       |

### Control de Acceso Basado en Roles (RBAC)

| Método HTTP   | Rol requerido | Ejemplo                          |
|---------------|---------------|----------------------------------|
| GET           | USER o ADMIN  | `GET /empleado`, `GET /perfiles` |
| POST          | ADMIN         | `POST /empleado`                 |
| PUT / PATCH   | ADMIN         | `PUT /perfiles/:id`              |
| DELETE        | ADMIN         | `DELETE /empleado/:id`           |
| Sin token     | —             | → 401 Unauthorized               |
| Rol insuficiente | —          | → 403 Forbidden                  |

### Pruebas con Postman / Bruno

Importar la siguiente configuración como **Environment** en Postman o Bruno:

```
Variable         | Valor inicial
-----------------|--------------------------------
base_auth        | http://localhost:3001
base_empleados   | http://localhost:8080
base_departamentos | http://localhost:8081
base_notificaciones | http://localhost:8084
base_perfiles    | http://localhost:8085
token            | (vacío — se llena tras el login)
reset_token      | (vacío — se llena con el log de notificaciones)
```

**Requests de colección sugeridos:**

| # | Nombre | Método | URL | Body / Header |
|---|--------|--------|-----|---------------|
| 1 | Login Admin | POST | `{{base_auth}}/auth/login` | `{"email":"admin@empresa.com","password":"password"}` |
| 2 | Crear Departamento | POST | `{{base_departamentos}}/departamentos` | Auth: `Bearer {{token}}` + body |
| 3 | Crear Empleado | POST | `{{base_empleados}}/empleado` | Auth: `Bearer {{token}}` + body |
| 4 | Establecer Contraseña | POST | `{{base_auth}}/auth/reset-password` | `{"token":"{{reset_token}}","newPassword":"MiPass123"}` |
| 5 | Login USER | POST | `{{base_auth}}/auth/login` | `{"email":"juan@empresa.com","password":"MiPass123"}` |
| 6 | GET Empleados (autenticado) | GET | `{{base_empleados}}/empleado` | Auth: `Bearer {{token}}` |
| 7 | GET Empleados (sin token) | GET | `{{base_empleados}}/empleado` | — (debe retornar 401) |
| 8 | DELETE Empleado (USER → 403) | DELETE | `{{base_empleados}}/empleado/{{id}}` | Auth: `Bearer {{token}}` de USER |
| 9 | Recuperar Contraseña | POST | `{{base_auth}}/auth/recover-password` | `{"email":"juan@empresa.com"}` |
| 10 | DELETE Empleado (ADMIN → 200) | DELETE | `{{base_empleados}}/empleado/{{id}}` | Auth: `Bearer {{token}}` de ADMIN |

> **Tip Postman:** En el request de Login (paso 1 y 5) agregar un script **Tests** para guardar el token automáticamente:
> ```js
> const { accessToken } = pm.response.json();
> pm.environment.set("token", accessToken);
> ```

---

### Cómo obtener un token (flujo completo — curl)

#### 1. Login con el Admin semilla

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@empresa.com","password":"password"}'
```

Respuesta:
```json
{ "accessToken": "<jwt>", "tokenType": "Bearer", "expiresIn": 3600 }
```

#### 2. Usar el token en peticiones protegidas

```bash
curl http://localhost:8080/empleado \
  -H "Authorization: Bearer <jwt>"
```

#### 3. Crear un empleado como Admin (genera usuario automáticamente)

```bash
curl -X POST http://localhost:8080/empleado \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt-admin>" \
  -d '{"nombre":"Juan","apellido":"Pérez","cargo":"Dev","email":"juan@empresa.com","departamento_id":1,"fechaIngreso":"2026-03-09T00:00:00Z"}'
```

→ El `auth-service` detecta `empleado.creado`, crea el usuario inhabilitado, genera un reset token y publica `usuario.creado`.
→ El `notificaciones-service` imprime en logs el token de activación:

```
[NOTIFICACIÓN] Tipo: SEGURIDAD | Para: juan@empresa.com | Mensaje: "Para establecer o recuperar su contraseña, utilice el siguiente token: <reset-jwt>..."
```

#### 4. Establecer contraseña con el reset token

```bash
curl -X POST http://localhost:3001/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"<reset-jwt-del-log>","newPassword":"MiPass123"}'
```

#### 5. Login del nuevo usuario (rol USER)

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"juan@empresa.com","password":"MiPass123"}'
```

#### 6. Recuperar contraseña olvidada

```bash
curl -X POST http://localhost:3001/auth/recover-password \
  -H "Content-Type: application/json" \
  -d '{"email":"juan@empresa.com"}'
```

→ Nuevo reset token aparece en los logs de `notificaciones-service`. Repetir paso 4 y 5.

### Secret Key JWT

```
JWT_SECRET=super_secret_reto4_jwt_key_2026
```

> Esta clave simétrica se incluye aquí **únicamente por propósitos académicos**. En un entorno productivo se debe usar el algoritmo **RS256** (asimétrico): la clave privada solo la conoce el `auth-service` para firmar; los demás servicios usan la clave pública para verificar. Así, comprometer un microservicio consumidor no expone la capacidad de emitir tokens.

Definida en `docker-compose.yml` como variable de entorno e inyectada en **todos** los contenedores. Para ejecución local sin Docker, copiar `.env.example` a `.env`:

```bash
cp .env.example .env
```

### Swagger UI (con BearerAuth)

| Servicio               | Swagger UI                                  |
|------------------------|---------------------------------------------|
| auth-service           | http://localhost:3001/docs                  |
| empleados-service      | http://localhost:8080/docs                  |
| departamentos-service  | http://localhost:8081/swagger/index.html    |
| notificaciones-service | http://localhost:8084/swagger-ui.html       |
| perfiles-service       | http://localhost:8085/swagger-ui.html       |

En todos los Swagger UI con BearerAuth: haga clic en **Authorize**, ingrese el JWT del login y pruebe los endpoints directamente.

### Variables de entorno (.env.example)

El archivo `.env.example` en la raíz del proyecto contiene todas las variables necesarias para ejecutar los servicios localmente sin Docker. Las variables más relevantes para la seguridad son:

```env
#  Solo para fines académicos — ver nota en sección "Secret Key JWT"
JWT_SECRET=super_secret_reto4_jwt_key_2026

# auth-service
PORT=3001
DATABASE_URL=postgres://postgres:postgres@localhost:5436/auth_db
RABBITMQ_URL=amqp://admin:admin@localhost:5672
RABBITMQ_EXCHANGE=empleados_exchange
AUTH_EXCHANGE=auth_exchange
```

Ver `.env.example` para el listado completo de variables de todos los servicios.

---

## Reto 5 — Pruebas End-to-End (E2E) con Cucumber

### Propósito

Validar flujos de negocio completos que involucran múltiples microservicios, el API Gateway y la comunicación asíncrona por RabbitMQ. Estas pruebas garantizan que los cambios en un servicio no rompan la integración global.

### Escenarios Cubiertos

1.  **Smoke Tests (01)**: Verificación de salud y disponibilidad del API Gateway.
2.  **Seguridad (02)**: Control de acceso RBAC (ADMIN/USER), validación de tokens y denegación de acceso.
3.  **Onboarding (03)**: Registro de empleado, creación de usuario en Auth, perfil en Perfiles y notificación de bienvenida.
4.  **Offboarding (04)**: Desactivación de empleado, inhabilitación de usuario en Auth y notificación de desvinculación.

### Ejecución de Pruebas

```bash
# Navegar a la carpeta de pruebas
cd Reto5/e2e-tests

# Instalar dependencias
npm install

# Ejecutar toda la suite en orden lógico
npm test
```

Para más detalles, consulte el [README de pruebas E2E](Reto5/e2e-tests/README.md).
