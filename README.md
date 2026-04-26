# Proyecto de Microservicios - Retos Integrados

Este proyecto implementa una arquitectura de microservicios desacoplados con comunicacion asincrona via RabbitMQ, bases de datos dedicadas por servicio, seguridad JWT y una plataforma de CI/CD con Jenkins + SonarQube. Todo corre en contenedores Docker y se orquesta con Docker Compose.

---

## Definiciones clave

- **Microservicios**: Servicios pequenos, independientes y desplegables por separado, cada uno con su propia base de datos.
- **Arquitectura orientada a eventos**: Servicios publican y consumen eventos a traves de RabbitMQ.
- **CI/CD**: Integracion y despliegue continuo automatizado con build, test, analisis de calidad, empaquetado y pruebas E2E.
- **JWT (RBAC)**: Autenticacion y control de acceso basado en roles en todas las APIs.

---

## Tecnologias usadas

- **Node.js 20 + Express** (servicios REST)
- **Go 1.25 + Gin** (servicios REST)
- **Java 17 + Spring Boot** (servicios REST)
- **RabbitMQ** (mensajeria AMQP, exchange fanout)
- **PostgreSQL + MySQL** (bases de datos por servicio)
- **Docker + Docker Compose** (contenedores y orquestacion local)
- **Jenkins** (pipelines CI/CD)
- **SonarQube** (calidad de codigo)
- **Jest + Cucumber** (unitarias y E2E)
- **Swagger/OpenAPI** (documentacion de APIs)

---

## Estructura general del repositorio

```
.
├── docker-compose.yml
├── README.md
├── jenkins/                  # Imagen Jenkins + plugins + JCasC
├── Reto1/                    # Servicios Node.js
├── Reto2/                    # Servicios Go
├── Reto3/                    # Servicios Java
├── Reto4/                    # Auth service y API Gateway
└── Reto6/                    # Microservicio Express + pruebas + Jenkinsfile
```

---

## URLs y puertos (servicios principales)

### APIs y Swagger

- API Gateway: http://localhost:3000
- Empleados API: http://localhost:8080
- Departamentos API: http://localhost:8081
- Notificaciones API: http://localhost:8084
- Perfiles API: http://localhost:8085
- Auth API: http://localhost:3001

Swagger / OpenAPI:
- Departamentos: http://localhost:8081/swagger/index.html
- Notificaciones: http://localhost:8084/swagger-ui.html
- Perfiles: http://localhost:8085/swagger-ui.html
- Auth: http://localhost:3001/docs
- Empleados: http://localhost:8080/docs

### Mensajeria

- RabbitMQ AMQP: amqp://localhost:5672
- RabbitMQ Management: http://localhost:15672 (admin / admin)

### CI/CD

- Jenkins: http://localhost:9090 (admin / admin123)
- SonarQube: http://localhost:9000 (admin / admin, cambiar al primer login)

---

## Variables de entorno relevantes

- JWT_SECRET (clave compartida para validacion JWT)
- DATABASE_URL (auth-service)
- RABBITMQ_URL (servicios que publican o consumen eventos)
- GIT_USERNAME y GIT_TOKEN (credenciales GitHub para Jenkins via JCasC)

Ver `.env.example` para el listado completo.

---

## Como levantar el sistema completo

```bash
docker compose up --build -d
```

Ver estado:
```bash
docker compose ps
```

---

## CI/CD (vision general)

Cada pipeline ejecuta:
- Checkout
- Build
- Test (unitarias)
- SonarQube + Quality Gate
- Package (Docker build)
- E2E (Cucumber)

Jenkins y SonarQube estan configurados para correr sin pasos manuales en los pipelines, con tokens y credenciales en Jenkins.

---

## Resultado esperado

Al hacer `git push`:

```
Jenkins detecta -> Build -> Test -> SonarQube -> Quality Gate -> Docker build -> E2E -> Resultado final
```
