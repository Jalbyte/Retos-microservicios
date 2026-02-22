# **Servicio Gestión de Empleados**

Microservicio desarrollado en Node.js utilizando Express y Prisma.
Gestiona empleados y su relación con departamentos.

---

## **Tecnologías utilizadas**

- Node.js
- Express
- Prisma ORM
- PostgreSQL
- Docker
- Swagger UI (swagger-ui-express)
- Axios (comunicación entre microservicios)
---

## **Variables de entorno**
El servicio requiere la siguiente variable:

```go
PORT=8080
DATABASE_URL=postgresql://postgres:postgres@empleados_db:5432/empleados
DEPARTAMENTOS_URL=http://departamentos_api:8081
```

## **Despliegue con Docker**

Construir imagen 
```Docker 
docker build -t empleados_api 
```
Ejecutar contendor
```Docker 
docker run -p 8080:8080 \
-e DATABASE_URL="postgresql://postgres:postgres@localhost:5432/empleados" \
-e DEPARTAMENTOS_URL="http://localhost:8081" \
empleados_api
```
## **Endpoints disponibles**

* Crear empleado: **POST /empleados**
* Listar empleados: **GET /empleados?page=1&size=5**
* Obtener empleado por ID: **GET /empleado/{id}**

## **Documentación Swagger**

Disponible en:
http://localhost:8080/docs

Desde ahí se puede:
* Probar endpoints
* Ver modelos
* Revisar códigos HTTP
* Ejecutar requests interactivos

## **Migracioens - PRISMA**

La base de datos de empleados se crea vacía, por lo que es necesario ejecutar la migración.

Desde la raíz del proyecto:
```docker 
docker compose run --rm empleados-service npx prisma migrate deploy
```
Si es la primera vez y no existen migraciones:

```docker 
docker compose run --rm empleados-service npx prisma migrate dev --name init
```
