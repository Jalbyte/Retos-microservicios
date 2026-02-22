# **Sistema de Microservicios**

Este proyecto implementa una arquitectura basada en microservicios desacoplados, donde cada servicio:

- Tiene su propia base de datos
- Se despliega en contenedores independientes
- Se comunica vía HTTP
- Mantiene aislamiento de responsabilidades

## **Arquitectura General**

El sistema está compuesto por:

* Servicio de Empleados
* Servicio de Departamentos
* Dos bases de datos PostgreSQL independientes

Cada microservicio expone su propia API REST y documentación Swagger.


## **🐳 Despliegue Completo del Sistema**

Desde la raíz del proyecto ejecutar: 


```Docker 
docker compose up --build -d
```

Esto levantará:

* Contenedor (Servicio) de empleados
* Base de datos empleados
* Contenedor (Servicio) de departamentos
* Base de datos departamentos

## **Orden de Inicialización**

El orden correcto de despliegue es:

1. Bases de datos
2. Servicio de Departamentos
3. Servicio de Empleados

Docker Compose gestiona automáticamente la red interna entre servicios.


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
## **Acceso a los Servicios**

Una vez levantado el sistema:

| Servicio              | URL                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------ |
| Empleados API         | [http://localhost:8080](http://localhost:8080)                                       |
| Empleados Swagger     | [http://localhost:8080/docs](http://localhost:8080/docs)                             |
| Departamentos API     | [http://localhost:8081](http://localhost:8081)                                       |
| Departamentos Swagger | [http://localhost:8081/swagger/index.html](http://localhost:8081/swagger/index.html) |

## **Comunicación Entre Servicios**

El servicio de empleados:

* Consulta al servicio de departamentos antes de registrar un empleado.
* Si el departamento no existe, rechaza la operación.

Esto asegura integridad lógica sin compartir base de datos.     


