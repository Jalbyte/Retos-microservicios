
---

# **Servicio Gestión de Empleados (Reto1)**

Microservicio desarrollado en Node.js utilizando Express.
Gestiona empleados y valida su relación con departamentos mediante comunicación HTTP.

---

## **Tecnologías utilizadas**

- Node.js
- Express
- PostgreSQL
- Docker
- Swagger (swagger-ui-express)
- Axios
- Opossum (Circuit Breaker)

---

## **Patrones de Resiliencia**

El servicio implementa:

- Timeout en llamadas HTTP
- Retry con backoff exponencial
- Circuit Breaker (opossum)
- Fallback controlado
- Healthcheck endpoint

Esto evita fallos en cascada cuando el servicio de departamentos no está disponible.

---

## **Variables de entorno**

```env
PORT=8080
DATABASE_URL=postgresql://camilo:camilo@database-empleados:5432/empleados_db
DEPARTAMENTOS_URL=http://departamentos-service:8081
```

## **Despliegue individual con Docker**
```docker
docker build -t empleados_api .
docker run -p 8080:8080 \
-e DATABASE_URL="postgresql://camilo:camilo@localhost:5432/empleados_db" \
-e DEPARTAMENTOS_URL="http://localhost:8081" \
empleados_api
```

## **Endpoints disponibles**

- Crear empleado: **POST /empleado**
- Listar empleados: **GET /empleado?page=1&size=5**
- Obtener empleado por ID: **GET /empleado/{id}**
- Healthcheck: **GET /health**

## **Documentación Swagger**

Disponible en: http://localhost:8080/docs

## **Base de Datos**

La tabla utilizada es:

```sql
CREATE TABLE "Departamento" (
    id VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT
);
```

## **Reconexión Automática**

El servicio implementa:

- Verificación de conexión en cada request
- Reapertura del pool si la conexión se pierde
- Configuración de límites de conexiones

Esto permite que el servicio continúe funcionando incluso si la base de datos se reinicia.
