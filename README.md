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

### Pruebas End-to-End (E2E)
Se implementa una suite de pruebas E2E con Cucumber para validar flujos completos del sistema a través del API Gateway, asegurando la correcta integración entre microservicios y la mensajería con RabbitMQ.

Cobertura
- Smoke tests: Verificación de disponibilidad del sistema (API Gateway).
- Seguridad (RBAC): Validación de autenticación JWT y control de acceso por roles.
- Onboarding: Creación de empleado con propagación a Auth, Perfiles y notificaciones.
- Offboarding: Desactivación de empleado con impacto en Auth y envío de notificación.

### Observabilidad (Reto 7)
El sistema cuenta con un stack completo de observabilidad para logs, métricas, trazas y alertas:

- **Prometheus**: Métricas (puerto 9091)
- **Grafana**: Dashboards y Alertas (puerto 3001)
- **Loki**: Agregación de logs
- **Zipkin**: Trazabilidad distribuida (puerto 9411)

**Alertas:**
- Se configuraron reglas de alerta para detectar:
  1. Caída de servicios (`up == 0`).
  2. Alta tasa de error HTTP (>10% de errores 5xx).
- **Canal de notificación:** Se configuró un Webhook de Discord. Para configurar tu propio canal:
  1. En Grafana > Alerting > Contact Points > New > Discord.
  2. Pega tu Webhook URL del canal de Discord deseado.
  3. Asegúrate de configurar la política de alerta en Alerting > Alert Rules.

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
