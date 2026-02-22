# **Retos Microservicios**

Proyecto compuesto por dos microservicios independientes con bases de datos separadas:

### **Reto 1 – Gestión de Empleados**

* Node.js + Express
* Prisma ORM
* PostgreSQL

### **Reto 2 – Gestión de Departamentos**

* Go + Gin
* PostgreSQL

Cada servicio tiene su propia base de datos, cumpliendo el principio de aislamiento de microservicios.


## **Cómo desplegar TODO el proyecto**

Desde la raíz del proyecto ejecutar: 


```Docker 
docker compose up --build -d
```

## **Migraciones (Solo Empleados – Prisma)**

La base de datos de empleados se crea vacía, por lo que es necesario ejecutar la migración.

Desde la raíz del proyecto:
```docker 
docker compose run --rm empleados-service npx prisma migrate deploy
```
Si es la primera vez y no existen migraciones:

```docker 
docker compose run --rm empleados-service npx prisma migrate dev --name init
```

## **Base de datos Departamentos**

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