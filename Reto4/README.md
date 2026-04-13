#  Reto 4 – API Gateway + Sistema de Microservicios

##  Descripción General

Este proyecto implementa un sistema distribuido para la gestión de empleados (onboarding y offboarding), compuesto por múltiples microservicios y un **API Gateway** que centraliza el acceso a todos ellos.

El API Gateway actúa como único punto de entrada para:

- Autenticación
- Gestión de empleados
- Gestión de departamentos
- Perfiles
- Notificaciones

Además, expone la documentación Swagger de cada servicio de forma unificada.

---

## 🏗️ Arquitectura del Sistema

El sistema está compuesto por los siguientes servicios:

| Servicio                  | Descripción                        |
|---------------------------|------------------------------------|
| `auth-service`            | Autenticación y generación de JWT  |
| `empleados-service`       | Gestión de empleados               |
| `departamentos-service`   | Gestión de departamentos           |
| `perfiles-service`        | Gestión de perfiles                |
| `notificaciones-service`  | Envío de eventos (RabbitMQ)        |
| `api-gateway`             | Punto de entrada centralizado      |

Todos los servicios se comunican a través de:

- **HTTP** (sincrónico)
- **RabbitMQ** (asincrónico)

---

## 🚪 API Gateway

El API Gateway (puerto **3000**) centraliza todas las peticiones del sistema.

###  Características principales

- Enrutamiento de solicitudes hacia microservicios
- Control de acceso mediante JWT
- Proxy de documentación Swagger
- Manejo de CORS
- Unificación de endpoints

---

## 🌐 URL Base

```
http://localhost:3000
```

---

## 🔐 Autenticación

### Login

```http
POST /auth/login
```

**Body:**

```json
{
  "email": "admin@empresa.com",
  "password": "password"
}
```

**Respuesta:**

```json
{
  "accessToken": "JWT",
  "tokenType": "Bearer",
  "expiresIn": 3600
}
```

>  Este token debe enviarse en las siguientes peticiones como header:
> ```
> Authorization: Bearer <token>
> ```

---

##  Endpoints por Servicio

### 👤 Empleados

Base: `/empleados`

| Método   | Endpoint        | Descripción         | Rol          |
|----------|-----------------|---------------------|--------------|
| `GET`    | `/empleados`    | Listar empleados    | USER / ADMIN |
| `POST`   | `/empleado`     | Crear empleado      | ADMIN        |
| `PUT`    | `/empleado/:id` | Actualizar empleado | ADMIN        |
| `DELETE` | `/empleado/:id` | Eliminar empleado   | ADMIN        |

---

### 🏢 Departamentos

Base: `/departamentos`

| Método   | Endpoint              | Descripción          | Rol          |
|----------|-----------------------|----------------------|--------------|
| `GET`    | `/departamentos`      | Listar departamentos | USER / ADMIN |
| `POST`   | `/departamentos`      | Crear departamento   | ADMIN        |
| `PUT`    | `/departamentos/:id`  | Actualizar           | ADMIN        |
| `DELETE` | `/departamentos/:id`  | Eliminar             | ADMIN        |

---

### 🧾 Perfiles

Base: `/perfiles`

| Método | Endpoint    | Descripción     | Rol          |
|--------|-------------|-----------------|--------------|
| `GET`  | `/perfiles` | Listar perfiles | USER / ADMIN |

---

### 🔔 Notificaciones

Base: `/notificaciones`

| Método | Endpoint          | Descripción       | Rol          |
|--------|-------------------|-------------------|--------------|
| `GET`  | `/notificaciones` | Consultar eventos | USER / ADMIN |

---

## 📚 Swagger (Documentación)

El API Gateway expone la documentación de cada servicio:

| Servicio        | URL                                         |
|-----------------|---------------------------------------------|
| Auth            | http://localhost:3000/docs/auth/            |
| Empleados       | http://localhost:3000/docs/empleados/       |
| Departamentos   | http://localhost:8081/swagger/index.html   |
| Perfiles        | http://localhost:8085/swagger-ui/index.html       |
| Notificaciones  | http://localhost:8084/swagger-ui/index.html  |

> 📌 **Importante:** usar `/` al final de cada URL.

---

## 🔄 Flujo de Onboarding

1. Se crea un empleado (`empleados-service`)
2. Se emite evento `empleado.creado`
3. `auth-service` crea usuario inactivo
4. Se genera token de activación
5. `notificaciones-service` simula envío del token
6. Usuario activa cuenta con `/auth/reset-password`
7. Usuario puede hacer login

---

## 🔴 Flujo de Offboarding

1. Se elimina empleado
2. Se emite evento `empleado.eliminado`
3. Usuario se desactiva en `auth-service`
4. Ya no puede iniciar sesión

---

## ⚙️ Ejecución del Proyecto

### 1. Levantar servicios

```bash
docker-compose up --build
```

### 2. Verificar servicios

```bash
docker ps
```

### 3. Probar API

```bash
GET http://localhost:3000/departamentos
```

---

## 🧠 Consideraciones Técnicas

- El API Gateway usa `http-proxy-middleware`
- Autenticación manejada con **JWT**
- Se implementa **RBAC** (roles: `USER` / `ADMIN`)
- Swagger de cada servicio está desacoplado
- Comunicación asincrónica con **RabbitMQ**

---

## ⚠️ Problemas Comunes

### ❌ POST/PUT no funcionan

**Solución:** manejar correctamente el body en el proxy.

---

### ❌ Swagger falla (NetworkError)

**Verificar:**
- La URL termina en `/`
- La configuración `servers` apunta al gateway

---

### ❌ Error ECONNREFUSED

**Solución:** verificar que el gateway esté corriendo.
