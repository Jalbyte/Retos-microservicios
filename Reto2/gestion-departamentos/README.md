# **Servicio: Gestión de Departamentos**

Microservicio desarrollado en Go utilizando Gin y PostgreSQL.
Incluye documentación Swagger para pruebas de API.

---

## **Tecnologías utilizadas**

- Go 1.25
- Gin
- PostgreSQL
- Docker
- Swagger (swaggo)

---

## **Variables de entorno**

El servicio requiere la siguiente variable:

```go
DATABASE_URL=postgres://usuario:password@host:puerto/database?sslmode=disable
```

---

## 🐳 **Despliegue individual con Docker**

Desde la carpeta del servicio:

```bash
docker build -t departamentos_api .
docker run -p 8081:8081 \
  -e DATABASE_URL="postgres://postgres:postgres@localhost:5432/departamentos?sslmode=disable" \
  departamentos_api
```

## **Endpoints disponibles**

* Crear departamento: **POST /departamentos**
* Listar departamentos: **GET /departamentos?page=1&size=5**
* Obtener departamento por ID: **GET /departamentos/{id}**

## **Documentación Swagger**

Una vez el servicio esté corriendo:

http://localhost:8081/swagger/index.html

## **Base de datos**
El servicio de departamentos usa PostgreSQL independiente.

Para crear la tabla manualmente:


```docker
docker exec -it departamentos_db psql -U camilo -d departamentos_db
```

Luego:
```SQL
CREATE TABLE "Departamento" (
    id VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT
);
```

