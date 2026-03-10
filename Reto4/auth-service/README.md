# Auth Service — Reto 4

Microservicio desarrollado en **Node.js 20 + Express**.  
Actúa como el **proveedor de identidad central** del ecosistema. Emite tokens JWT de acceso, gestiona el ciclo de vida de los usuarios y se integra con el broker de mensajes para automatizar la creación/inhabilitación de cuentas.

---

## Tecnologías

| Tecnología | Versión | Uso |
|---|---|---|
| Node.js | 20 | Runtime |
| Express | 4.x | Framework HTTP |
| jsonwebtoken | 9.x | Firma y verificación de JWT (HS256) |
| bcryptjs | 2.x | Hash de contraseñas |
| pg | 8.x | Cliente PostgreSQL |
| amqplib | 0.10.x | Cliente RabbitMQ |
| uuid | 9.x | Generación de IDs únicos |
| swagger-jsdoc + swagger-ui-express | 6.x / 5.x | Documentación OpenAPI |
| Docker | 20+ | Contenerización |

---

## Responsabilidades

1. **Autenticar** usuarios mediante email y contraseña, retornando un JWT de acceso
2. **Gestionar recuperación de contraseñas** mediante tokens JWT de tipo `RESET_PASSWORD`
3. **Consumir** el evento `empleado.creado` → crear usuario inhabilitado y publicar `usuario.creado`
4. **Consumir** el evento `empleado.eliminado` → inhabilitar el usuario en la base de datos
5. **Publicar** eventos `usuario.creado` y `usuario.recuperacion` hacia `notificaciones-service`

---

## Arquitectura de Seguridad

```
                       ┌─────────────────────────────────────────┐
                       │            Docker Network               │
                       │                                         │
  Cliente HTTP         │  ┌───────────────────┐                  │
  (Postman/App)  ────► │  │   auth-service    │                  │
                       │  │   Node.js :3001   │                  │
  1. POST /auth/login  │  │                   │                  │
  ◄── 2. retorna JWT   │  │  ┌─────────────┐  │                  │
                       │  │  │   db-auth   │  │                  │
  3. Bearer JWT ──────►│  │  │ PostgreSQL  │  │                  │
     en header         │  │  └─────────────┘  │                  │
                       │  └────────┬──────────┘                  │
                       │           │                             │
                       │    consume│empleados_exchange            │
                       │           │ (empleado.creado/eliminado)  │
                       │           │                             │
                       │    publica│auth_exchange                 │
                       │           │ (usuario.creado/recuperacion)│
                       │           ▼                             │
                       │  ┌─────────────────────┐               │
                       │  │ notificaciones-serv  │               │
                       │  │ simula envío de email│               │
                       │  └─────────────────────┘               │
                       └─────────────────────────────────────────┘
```

---

## Integración con RabbitMQ

### Eventos consumidos (exchange: `empleados_exchange`)

| Evento | Acción |
|---|---|
| `empleado.creado` | Crea usuario con `enabled = false` y sin contraseña. Genera un Reset JWT y publica `usuario.creado` |
| `empleado.eliminado` | Establece `enabled = false` al usuario, impidiendo futuros logins |

### Eventos publicados (exchange: `auth_exchange`)

| Evento | Payload | Disparador |
|---|---|---|
| `usuario.creado` | `{ "email": "...", "token": "<reset-jwt>" }` | Consumo de `empleado.creado` |
| `usuario.recuperacion` | `{ "email": "...", "token": "<reset-jwt>" }` | `POST /auth/recover-password` |

### Formato de mensajes RabbitMQ

```json
// usuario.creado / usuario.recuperacion
{
  "event": "usuario.creado",
  "data": {
    "email": "juan@empresa.com",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

## Tipos de Tokens JWT

El servicio maneja dos tipos de tokens con propósitos distintos:

### 1. Token de Acceso (Access JWT)

Retornado en `POST /auth/login`. Válido por **1 hora**.

```json
{
  "sub": "admin@empresa.com",
  "role": "ADMIN",
  "iat": 1741564800,
  "exp": 1741568400
}
```

### 2. Token de Recuperación (Reset JWT)

Generado al crear un empleado o al solicitar recuperación. Válido por **1 hora**.

```json
{
  "sub": "juan@empresa.com",
  "type": "RESET_PASSWORD",
  "iat": 1741564800,
  "exp": 1741568400
}
```

> **Implementación elegida: Opción A — Stateless con JWT**
> El token de recuperación es un JWT firmado con un claim `type: "RESET_PASSWORD"`.
> Ventaja: el servicio valida matemáticamente su autenticidad y expiración sin consultar la base de datos.

---

## Control de Acceso Basado en Roles (RBAC)

El JWT de acceso incluye el `role` del usuario. Todos los demás microservicios del ecosistema aplican estas reglas:

| Operación | Rol requerido | HTTP Status si falla |
|---|---|---|
| `GET` (lectura) | `USER` o `ADMIN` | `401` si no hay token |
| `POST / PUT / DELETE` (escritura) | `ADMIN` | `403` si el rol es insuficiente |
| Sin token | — | `401 Unauthorized` |
| Rol insuficiente | — | `403 Forbidden` |

### Roles disponibles

| Rol | Descripción |
|---|---|
| `ADMIN` | Acceso total — creación, modificación y eliminación de recursos |
| `USER` | Acceso de solo lectura |

---

## Endpoints

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/health` | Público | Estado del servicio |
| `POST` | `/auth/login` | Público | Login con email/contraseña → retorna JWT |
| `POST` | `/auth/recover-password` | Público | Solicita recuperación → publica `usuario.recuperacion` |
| `POST` | `/auth/reset-password` | Público | Establece nueva contraseña con Reset JWT |

### POST /auth/login

**Request:**
```json
{
  "email": "admin@empresa.com",
  "password": "password"
}
```

**Response 200:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "expiresIn": 3600
}
```

**Response 401:**
```json
{
  "status": 401,
  "error": "Unauthorized",
  "message": "Credenciales inválidas o usuario inhabilitado"
}
```

### POST /auth/recover-password

**Request:**
```json
{
  "email": "juan@empresa.com"
}
```

**Response 200** *(siempre, para no revelar si el email existe)*:
```json
{
  "message": "Si el email está registrado, recibirá instrucciones para restablecer su contraseña"
}
```

### POST /auth/reset-password

**Request:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "newPassword": "MiNuevaContraseña123"
}
```

**Response 200:**
```json
{
  "message": "Contraseña actualizada exitosamente. Ya puede hacer login."
}
```

---

## Base de Datos

```sql
CREATE TABLE IF NOT EXISTS users (
    id         SERIAL PRIMARY KEY,
    email      VARCHAR(100) UNIQUE NOT NULL,
    password   VARCHAR(255),          -- bcrypt hash, NULL hasta reset-password
    role       VARCHAR(20)  NOT NULL DEFAULT 'USER',
    enabled    BOOLEAN      NOT NULL DEFAULT true,
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Usuario semilla ADMIN
INSERT INTO users (email, password, role, enabled)
VALUES (
    'admin@empresa.com',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- "password"
    'ADMIN',
    true
);
```

> La contraseña del admin semilla es `password`. Nunca se guarda en texto plano — siempre se almacena como hash bcrypt.

---

## Variables de entorno

```env
PORT=3001
DATABASE_URL=postgres://postgres:postgres@db-auth:5432/auth_db
JWT_SECRET=super_secret_reto4_jwt_key_2024
RABBITMQ_URL=amqp://admin:admin@rabbitmq:5672
RABBITMQ_EXCHANGE=empleados_exchange
AUTH_EXCHANGE=auth_exchange
```

> **Nota de seguridad:** `JWT_SECRET` debe ser la misma en todos los microservicios del ecosistema. En producción usar una clave asimétrica (RS256) y compartir solo la clave pública.

---

## Despliegue individual con Docker

```bash
# Desde la carpeta del servicio
docker build -t auth_api .

docker run -p 3001:3001 \
  -e PORT=3001 \
  -e DATABASE_URL="postgres://postgres:postgres@localhost:5436/auth_db" \
  -e JWT_SECRET="super_secret_reto4_jwt_key_2024" \
  -e RABBITMQ_URL="amqp://admin:admin@localhost:5672" \
  -e RABBITMQ_EXCHANGE="empleados_exchange" \
  -e AUTH_EXCHANGE="auth_exchange" \
  auth_api
```

## Despliegue completo (todos los servicios)

```bash
# Desde la raíz del proyecto
docker compose up --build
```

---

## Documentación Swagger

Disponible en: **http://localhost:3001/docs**

La UI incluye el esquema **BearerAuth** — haz clic en **Authorize**, pega el token obtenido en `/auth/login` y prueba todos los endpoints directamente.

---

## Flujo completo de prueba

### 1. Login con el admin semilla

```bash
curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@empresa.com","password":"password"}'
```

Guarda el `accessToken` → úsalo como `$ADMIN_TOKEN`.

### 2. Crear un empleado (dispara el ciclo de vida del usuario)

```bash
curl -s -X POST http://localhost:8080/empleado \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"nombre":"Juan","apellido":"Perez","cargo":"Dev","email":"juan@empresa.com","departamento_id":1,"fechaIngreso":"2026-03-09T00:00:00Z"}'
```

### 3. Obtener el reset token desde los logs

```bash
docker logs notificaciones_api --tail 20 | grep SEGURIDAD
# → [NOTIFICACIÓN] Tipo: SEGURIDAD | Para: juan@empresa.com | Mensaje: "...token: eyJ..."
```

### 4. Establecer contraseña

```bash
curl -s -X POST http://localhost:3001/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"<reset-token-del-log>","newPassword":"MiPass123"}'
```

### 5. Login del nuevo usuario (rol USER)

```bash
curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"juan@empresa.com","password":"MiPass123"}'
```

### 6. Verificar petición denegada sin token (401)

```bash
curl -s http://localhost:8080/empleado
# → 401 Unauthorized
```

### 7. Lectura exitosa con rol USER (200)

```bash
curl -s http://localhost:8080/empleado \
  -H "Authorization: Bearer $USER_TOKEN"
# → 200 OK con lista de empleados
```

### 8. Escritura denegada con rol USER (403)

```bash
curl -s -X DELETE http://localhost:8080/empleado/1 \
  -H "Authorization: Bearer $USER_TOKEN"
# → 403 Forbidden
```

### 9. Recuperación de contraseña

```bash
curl -s -X POST http://localhost:3001/auth/recover-password \
  -H "Content-Type: application/json" \
  -d '{"email":"juan@empresa.com"}'

# Ver nuevo token en logs
docker logs notificaciones_api --tail 10 | grep SEGURIDAD
```

### 10. Offboarding — inhabilitar usuario (como Admin)

```bash
curl -s -X DELETE http://localhost:8080/empleado/1 \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Intentar login del usuario eliminado → debe fallar
curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"juan@empresa.com","password":"MiPass123"}'
# → 401 Unauthorized (usuario inhabilitado)
```

---

## Estructura del servicio

```
Reto4/auth-service/
├── Dockerfile
├── package.json
├── index.js          # Endpoints REST + lógica de autenticación
├── rabbitmq.js       # Consumidor de empleados_exchange + publicador en auth_exchange
├── db.js             # Pool de conexión PostgreSQL
├── init.sql          # Schema + usuario semilla ADMIN
└── README.md
```
