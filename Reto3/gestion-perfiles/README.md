# Gestión de Perfiles — Reto 3

Microservicio desarrollado en **Java 17 + Spring Boot 3.2**.  
Combina **comunicación asincrónica** (consume eventos de RabbitMQ) y **comunicación sincrónica** (expone endpoints REST).

---

## Tecnologías

| Tecnología | Versión | Uso |
|---|---|---|
| Java | 17 | Lenguaje |
| Spring Boot | 3.2.3 | Framework principal |
| Spring AMQP | (incluido) | Cliente RabbitMQ |
| Spring Data JPA | (incluido) | Acceso a PostgreSQL |
| PostgreSQL Driver | 42.x | Driver JDBC |
| Hibernate | (incluido) | ORM / DDL automático |
| springdoc-openapi | 2.3.0 | Documentación Swagger UI |
| Lombok | (incluido) | Reducción de boilerplate |
| Docker | 20+ | Contenerización (multi-stage build) |

---

## Responsabilidades

1. **Consumir el evento** `empleado.creado` desde la cola `perfiles.queue` (vinculada al fanout exchange `empleados_exchange`)
2. **Crear automáticamente** un perfil por defecto para cada nuevo empleado
3. **Exponer endpoints REST** para consultar y actualizar perfiles
4. **Actualización parcial (PATCH semántica)**: solo se actualizan los campos enviados en el body

---

## Evento consumido

| Evento RabbitMQ | Acción |
|---|---|
| `empleado.creado` | Crea perfil por defecto con nombre y email del evento |
| `empleado.eliminado` | **Ignorado** (el perfil permanece como historial) |

### Formato del mensaje recibido

```json
{
  "event": "empleado.creado",
  "data": {
    "id": "123",
    "nombre": "Juan",
    "email": "juan@empresa.com",
    "departamentoId": "DEPT-01",
    "fechaIngreso": "2026-03-04"
  }
}
```

---

## Perfil por defecto creado automáticamente

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "empleadoId": "123",
  "nombre": "Juan",
  "email": "juan@empresa.com",
  "telefono": "",
  "direccion": "",
  "ciudad": "",
  "biografia": "",
  "fechaCreacion": "2026-03-04T10:00:00"
}
```

---

## Endpoints REST

| Método | Ruta | Descripción | Respuesta exitosa |
|--------|------|-------------|-------------------|
| `GET` | `/health` | Health check | `200 { "status": "UP" }` |
| `GET` | `/perfiles` | Lista todos los perfiles | `200 [ ]` |
| `GET` | `/perfiles/{empleadoId}` | Consulta el perfil de un empleado | `200 { perfil }` |
| `PUT` | `/perfiles/{empleadoId}` | Actualiza el perfil (parcial) | `200 { perfilActualizado }` |

### Respuestas de error

| Código | Escenario |
|--------|-----------|
| `404 Not Found` | El empleado no tiene perfil registrado |

### Ejemplo de actualización

```bash
PUT /perfiles/123
Content-Type: application/json

{
  "telefono": "+57 300 123 4567",
  "ciudad": "Bogotá",
  "biografia": "Ingeniero de software con 5 años de experiencia."
}
```

Solo los campos enviados son modificados — `id`, `empleadoId` y `fechaCreacion` son inmutables.

---

## Documentación Swagger

Disponible en: **http://localhost:8085/swagger-ui.html**

API docs (JSON): http://localhost:8085/api-docs

---

## Variables de entorno

| Variable | Descripción | Default local |
|---|---|---|
| `PORT` | Puerto del servidor | `8085` |
| `DB_HOST` | Host de PostgreSQL | `localhost` |
| `DB_PORT` | Puerto de PostgreSQL | `5432` |
| `DB_USER` | Usuario PostgreSQL | `camilo` |
| `DB_PASSWORD` | Contraseña PostgreSQL | `camilo` |
| `DB_NAME` | Nombre de la BD | `perfiles_db` |
| `RABBITMQ_URL` | URI AMQP completa | `amqp://admin:admin@localhost:5672` |
| `RABBITMQ_EXCHANGE` | Nombre del fanout exchange | `empleados_exchange` |

---

## Arquitectura interna

```
EmpleadoEventConsumer (@RabbitListener)
        │
        │  parseJSON (Jackson ObjectMapper)
        │
        ├──▶ event = "empleado.creado"
        │         └──▶ PerfilService.crearPerfilPorDefecto()
        │                     ├──▶ existsByEmpleadoId() → idempotencia
        │                     ├──▶ Construye Perfil (UUID, campos vacíos)
        │                     └──▶ PerfilRepository.save() → PostgreSQL
        │
        └──▶ otros eventos → log.debug() + ignorado

PerfilController (REST)
        ├── GET  /perfiles            → PerfilService.listarTodos()
        ├── GET  /perfiles/{id}       → PerfilService.obtenerPorEmpleadoId()
        └── PUT  /perfiles/{id}       → PerfilService.actualizar()
                                               └──▶ Solo actualiza campos no-nulos
```

### Decisiones de diseño clave

- **Idempotencia garantizada**: si el evento `empleado.creado` se procesa más de una vez (reenvío del broker), `existsByEmpleadoId()` evita duplicados.
- **`SimpleMessageConverter`** en el listener: mismo enfoque que el servicio de notificaciones para compatibilidad con mensajes de Node.js.
- **Actualización parcial (PATCH semántica en PUT)**: el método `actualizar()` solo modifica campos que llegan no-nulos, evitando que una actualización parcial borre campos ya cargados.
- **PostgreSQL** como base de datos: mismo motor que Reto1/Reto2 pero base completamente aislada.

---

## Despliegue individual

```bash
# Desde Reto3/gestion-perfiles/
docker build -t perfiles_api .

docker run -p 8085:8085 \
  -e DB_HOST=localhost \
  -e DB_PORT=5432 \
  -e DB_USER=camilo \
  -e DB_PASSWORD=camilo \
  -e DB_NAME=perfiles_db \
  -e RABBITMQ_URL=amqp://admin:admin@localhost:5672 \
  perfiles_api
```

---

## Despliegue con docker-compose (sistema completo)

```bash
# Desde la raíz del proyecto
docker compose up --build -d
```
