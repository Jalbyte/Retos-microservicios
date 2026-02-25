# Sistema de Microservicios

Este proyecto implementa una arquitectura basada en microservicios desacoplados, aplicando principios de resiliencia, aislamiento y comunicación HTTP entre servicios.

Cada servicio:

- Tiene su propia base de datos PostgreSQL independiente
- Se ejecuta en contenedores Docker separados
- Se comunica vía HTTP REST
- Implementa patrones de resiliencia
- Posee documentación Swagger propia

---

## Arquitectura General

El sistema está compuesto por:

- Servicio de Gestión de Empleados (Node.js + Express)
- Servicio de Gestión de Departamentos (Go + Gin)
- Base de datos PostgreSQL para Empleados
- Base de datos PostgreSQL para Departamentos

Cada microservicio mantiene independencia total de datos.

---

## Patrones de Resiliencia Implementados

El sistema implementa:

- Timeout en llamadas HTTP entre microservicios
- Retry con backoff exponencial
- Circuit Breaker (opossum)
- Fallback controlado
- Healthchecks en todos los servicios
- Reconexión automática a base de datos (Go)
- Prevención de fallo en cascada

Esto permite degradación controlada del sistema ante fallos.

---

## Despliegue Completo del Sistema

Desde la raíz del proyecto ejecutar:

```docker
docker compose up --build -d
```