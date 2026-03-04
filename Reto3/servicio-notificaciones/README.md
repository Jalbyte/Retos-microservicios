# Servicio de Notificaciones — Reto 3

Microservicio desarrollado en **Java 17 + Spring Boot 3.2**.  
Reacciona **autónomamente** a eventos del sistema consumidos desde RabbitMQ. No es invocado por REST desde otros servicios.

---

## Tecnologías

| Tecnología | Versión | Uso |
|---|---|---|
| Java | 17 | Lenguaje |
| Spring Boot | 3.2.3 | Framework principal |
| Spring AMQP | (incluido) | Cliente RabbitMQ |
| Spring Data JPA | (incluido) | Acceso a MySQL |
| MySQL Connector/J | 8.x | Driver JDBC |
| Hibernate | (incluido) | ORM / DDL automático |
| springdoc-openapi | 2.3.0 | Documentación Swagger UI |
| Lombok | (incluido) | Reducción de boilerplate |
| Docker | 20+ | Contenerización (multi-stage build) |

---

## Responsabilidades

1. **Consumir eventos** de la cola `notificaciones.queue` (vinculada al fanout exchange `empleados_exchange`)
2. **Simular notificaciones** mediante logs estructurados en consola
3. **Persistir historial** de notificaciones en MySQL
4. **Exponer endpoints REST** de consulta

---

## Eventos consumidos

| Evento RabbitMQ | Tipo de notificación | Log simulado |
|---|---|---|
| `empleado.creado` | `BIENVENIDA` | `[NOTIFICACIÓN] Tipo: BIENVENIDA \| Para: juan@empresa.com \| Mensaje: "Bienvenido Juan..."` |
| `empleado.eliminado` | `DESVINCULACION` | `[NOTIFICACIÓN] Tipo: DESVINCULACIÓN \| Para: juan@empresa.com \| Mensaje: "Su cuenta ha sido..."` |

### Formato del mensaje recibido (publicado por Reto1)

El mensaje se recibe como JSON crudo (sin headers Spring/Jackson):

```json
// empleado.creado
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

// empleado.eliminado
{
  "event": "empleado.eliminado",
  "data": {
    "id": "123",
    "nombre": "Juan",
    "apellido": "Pérez",
    "email": "juan@empresa.com",
    "cargo": "Desarrollador",
    "departamento_id": "DEPT-01"
  }
}
```

---

## Estructura de una Notificación

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "tipo": "BIENVENIDA",
  "destinatario": "juan@empresa.com",
  "mensaje": "Bienvenido Juan. Su cuenta ha sido creada exitosamente.",
  "fechaEnvio": "2026-03-04T10:00:00",
  "empleadoId": "123"
}
```

---

## Endpoints REST

| Método | Ruta | Descripción | Respuesta |
|--------|------|-------------|-----------|
| `GET` | `/health` | Health check | `200 { "status": "UP" }` |
| `GET` | `/notificaciones` | Lista todas las notificaciones | `200 [ ]` |
| `GET` | `/notificaciones/{empleadoId}` | Notificaciones de un empleado | `200 [ ]` |

---

## Documentación Swagger

Disponible en: **http://localhost:8084/swagger-ui.html**

API docs (JSON): http://localhost:8084/api-docs

---

## Variables de entorno

| Variable | Descripción | Default local |
|---|---|---|
| `PORT` | Puerto del servidor | `8084` |
| `DB_HOST` | Host de MySQL | `localhost` |
| `DB_PORT` | Puerto de MySQL | `3306` |
| `DB_USER` | Usuario MySQL | `root` |
| `DB_PASSWORD` | Contraseña MySQL | `rootpassword` |
| `DB_NAME` | Nombre de la BD | `notifications` |
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
        │         └──▶ NotificacionService.registrarBienvenida()
        │                     ├──▶ Construye Notificacion (UUID, tipo=BIENVENIDA)
        │                     ├──▶ NotificacionRepository.save() → MySQL
        │                     └──▶ log.info("[NOTIFICACIÓN] Tipo: BIENVENIDA ...")
        │
        └──▶ event = "empleado.eliminado"
                  └──▶ NotificacionService.registrarDesvinculacion()
                              ├──▶ Construye Notificacion (UUID, tipo=DESVINCULACION)
                              ├──▶ NotificacionRepository.save() → MySQL
                              └──▶ log.info("[NOTIFICACIÓN] Tipo: DESVINCULACIÓN ...")
```

### Decisiones de diseño clave

- **`SimpleMessageConverter`** en el listener: los mensajes de Node.js no incluyen headers MIME/Spring, por lo que se deserializan como `String` y luego se parsean con Jackson manualmente.
- **Errores aislados**: el `try/catch` en el consumer evita que un mensaje malformado detenga el consumidor.
- **MySQL** como base de datos: diferente motor al de otros servicios para demostrar heterogeneidad.

---

## Despliegue individual

```bash
# Desde Reto3/servicio-notificaciones/
docker build -t notificaciones_api .

docker run -p 8084:8084 \
  -e DB_HOST=localhost \
  -e DB_USER=root \
  -e DB_PASSWORD=rootpassword \
  -e DB_NAME=notifications \
  -e RABBITMQ_URL=amqp://admin:admin@localhost:5672 \
  notificaciones_api
```

---

## Despliegue con docker-compose (sistema completo)

```bash
# Desde la raíz del proyecto
docker compose up --build -d
```
