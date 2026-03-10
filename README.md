# Reto 3 — Sistema de Microservicios con Message Broker
# Reto 4 — Seguridad y Control de Acceso con JWT

Arquitectura de microservicios desacoplados con comunicación asíncrona vía RabbitMQ. Cada servicio posee su propia base de datos, corre en un contenedor Docker independiente e implementa patrones de resiliencia. Se agrega en el Reto 3 un broker de mensajes que conecta cuatro servicios especializados.

---

## Arquitectura General

```
┌─────────────────────────────────────────────────────────────────┐
│                         Docker Network                          │
│                                                                 │
│  ┌──────────────┐   HTTP    ┌──────────────────┐               │
│  │  Empleados   │ ────────► │  Departamentos   │               │
│  │  (Node.js)   │           │     (Go/Gin)     │               │
│  │  Port: 8080  │           │   Port: 8081     │               │
│  └──────┬───────┘           └──────────────────┘               │
│         │  Publish events                                       │
│         ▼                                                       │
│  ┌──────────────┐                                               │
│  │   RabbitMQ   │  fanout exchange: empleados_exchange          │
│  │  Port: 5672  │                                               │
│  └──────┬───────┘                                               │
│         │                                                       │
│    ┌────┴────┐                                                  │
│    ▼         ▼                                                  │
│  ┌──────────────┐     ┌──────────────────┐                     │
│  │ Servicio de  │     │  Gestión de      │                     │
│  │Notificaciones│     │    Perfiles      │                     │
│  │   (Java)     │     │    (Java)        │                     │
│  │ Port: 8084   │     │  Port: 8085      │                     │
│  └──────────────┘     └──────────────────┘                     │
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
│ auth-service │  :3001
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

Se eligió la estrategia **Middleware/Interceptor por Servicio** (opción 2):

- **Por qué**: Evita introducir un nuevo componente de infraestructura (API Gateway) que agregaría latencia adicional y complejidad operacional. Para un sistema académico con pocos servicios, cada servicio valida el JWT directamente usando la misma clave simétrica HMAC-SHA256 inyectada vía variable de entorno.
- **Clave simétrica compartida**: `JWT_SECRET=super_secret_reto4_jwt_key_2024` (solo para fines académicos — en producción usar clave asimétrica RS256 y compartir la clave pública).
- Cada lenguaje implementa la validación con sus herramientas nativas: `jsonwebtoken` en Node.js, librería estándar `crypto/hmac` en Go, `javax.crypto.Mac` en Java.

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

### Cómo obtener un token (flujo completo)

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

### Secret Key (solo fines académicos)

```
JWT_SECRET=super_secret_reto4_jwt_key_2024
```

Definida en `docker-compose.yml` como variable de entorno e inyectada en **todos** los contenedores.
Ver `.env.example` para configuración local sin Docker.

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

```env
# JWT — misma clave en todos los servicios
JWT_SECRET=super_secret_reto4_jwt_key_2024

# auth-service
PORT=3001
DATABASE_URL=postgres://postgres:postgres@localhost:5436/auth_db
RABBITMQ_URL=amqp://admin:admin@localhost:5672
RABBITMQ_EXCHANGE=empleados_exchange
AUTH_EXCHANGE=auth_exchange
```
