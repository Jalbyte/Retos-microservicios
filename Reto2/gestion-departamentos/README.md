# Servicio: Gestión de Departamentos

Microservicio desarrollado en Go utilizando Gin y PostgreSQL.  
Forma parte de una arquitectura basada en microservicios y expone una API REST documentada con Swagger.

Este servicio es responsable de la gestión de departamentos y funciona de manera independiente del servicio de empleados.


## Arquitectura 

- Gestiona departamentos
- Expone API REST
- Tiene su propia base de datos PostgreSQL
- Implementa healthcheck
- Implementa reconexión automática a base de datos
- No comparte base de datos con otros microservicios


## Tecnologías utilizadas

- Go 1.25
- Gin (Framework HTTP)
- PostgreSQL
- Docker
- Swaggo (Swagger)
- database/sql
- lib/pq

---

## **Características de Resiliencia**

El servicio implementa:

- Healthcheck (`/health`)
- Middleware de verificación de conexión a base de datos
- Reconexión automática si la conexión se pierde
- Pool de conexiones configurado
- Manejo estructurado de errores

Esto permite que el servicio continúe operando incluso si la base de datos se reinicia.

---

## **Variables de entorno**

El servicio requiere las siguientes variables:

```env
PORT=8081
DATABASE_URL=postgresql://usuario:password@host:puerto/database?sslmode=disable
```

## **Despliegue individual con Docker**

Desde la carpeta del servicio:

```docker
docker build -t departamentos_api .
docker run -p 8081:8081 \
  -e PORT=8081 \
  -e DATABASE_URL="postgresql://camilo:camilo@localhost:5432/departamentos_db?sslmode=disable" \
  departamentos_api
```

## **Endpoints disponibles**

- Crear departamento: **POST /departamentos**
- Listar departamentos (paginado): **GET /departamentos?page=1&size=5**
- Obtener departamento por ID: **GET /departamentos/{id}**
Healthcheck: **GET /health**

## **Documentación Swagger**

Disponible en: http://localhost:8081/swagger/index.html

## **Base de datos**

El servicio utiliza una base de datos PostgreSQL independiente.
Tabla utilizada:
```sql
CREATE TABLE "Departamento" (
    id VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT
);
```