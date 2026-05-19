# Documentación de Observabilidad - Reto 7

Este documento presenta la implementación del stack de observabilidad para nuestros microservicios. El objetivo principal fue dotar al sistema de capacidad para responder preguntas sobre su estado, comportamiento y trazabilidad ante fallos.

---

## 1. Arquitectura del Stack

Hemos implementado un stack de observabilidad, orquestado mediante Docker Compose y totalmente integrado con la red `microservices-network`.

| Componente | Función |
|------------|----------|
| **Prometheus** | Recolección de métricas (modelo Pull). |
| **Grafana** | Visualización (Dashboards) y Alertas proactivas. |
| **Loki** | Agregación centralizada de logs. |
| **Promtail** | Agente de envío de logs hacia Loki. |
| **Zipkin** | Trazabilidad distribuida (seguimiento de peticiones). |

---

## 2. Patrones de Diseño Implementados

### A. Trazabilidad Distribuida (Distributed Tracing)
Utilizamos **OpenTelemetry** para inyectar *Trace Contexts* en todas las cabeceras HTTP y eventos de RabbitMQ. Esto permite seguir el flujo completo de una solicitud (Gateway → Servicio Backend → Broker) a través de un `trace_id` único.

### B. Logging Estructurado (Structured Logging)
Se reemplazaron los logs planos por **JSON estructurado** en todos los servicios (`Winston` para Node.js, `Logstash Encoder` para Java/Logback, `Zap` para Go). Cada entrada de log contiene:
- `timestamp`
- `level` (INFO, ERROR)
- `service` (Nombre del servicio)
- `trace_id` (vinculado a OTel)

### C. Health Checks & Metrics
Todos los servicios exponen endpoints estandarizados:
- `/health`: Verificación de disponibilidad.
- `/metrics` o `/actuator/prometheus`: Métricas en formato Prometheus (PromQL).

---

## 3. Guía de Acceso a Servicios (URLs)

Para acceder a las herramientas, utiliza los siguientes puertos en `localhost`:

| Servicio | URL | Credenciales |
|----------|-----|--------------|
| **Grafana** | [http://localhost:3001](http://localhost:3001) | admin / admin |
| **Prometheus**| [http://localhost:9091](http://localhost:9091) | N/A |
| **Zipkin** | [http://localhost:9411](http://localhost:9411) | N/A |

---

## 4. Estrategia de Alertas

Se ha configurado Grafana para monitoreo proactivo:
1.  **Disponibilidad:** Alerta crítica si `up{job="<servicio>"} == 0` por más de 1 minuto.
2.  **Salud del Sistema:** Alerta de alta tasa de errores si la suma de peticiones 5xx > 10% en un lapso de 2 minutos.

*Las notificaciones están configuradas vía Webhook hacia un canal de Discord.*

---

## 5. Análisis de Rendimiento

Para identificar cuellos de botella:
1. Accede a **Zipkin** y realiza una búsqueda (`Run Query`).
2. Identifica las peticiones con mayor "Duration".
3. Examina la cascada de llamadas; los bloques más extensos visualmente corresponden a los servicios más lentos.
4. Complementa esta información en el dashboard de **Grafana** bajo el panel "Average Latency" para identificar patrones de rendimiento a lo largo del tiempo.
