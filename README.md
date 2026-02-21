# RETO 1

## **Cómo desplegar el proyecto**
Construir y levantar los contenedores

Desde la carpeta Reto1 ejecutar:

```java
docker compose up --build
```

Esto:
* Construye la imagen del microservicio
* Descarga la imagen oficial de PostgreSQL
* Crea la red interna
* Levanta ambos contenedores

Cuando te salga: 
Servidor listo en http://localhost:8080
La API estará activa.

**Ejecutar migraciones de Prisma**

La base de datos se crea vacía, por lo tanto es necesario ejecutar la migración para crear las tablas.
En otra terminal ejecutar:

```java
docker compose exec empleados-service npx prisma migrate dev --name init
```

Esto:
* Lee el archivo schema.prisma
* Genera la migración
* Crea la tabla Empleado en PostgreSQL