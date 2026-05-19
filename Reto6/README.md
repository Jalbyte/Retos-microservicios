# Reto 6 - Integración Continua (CI) con Jenkins y SonarQube

Este reto se enfoca en la implementación de un pipeline de Integración Continua (CI) para automatizar la compilación, pruebas y análisis de calidad del sistema de microservicios.

## ¿Qué es la Integración Continua (CI)?

La Integración Continua es una práctica de desarrollo donde los miembros del equipo integran su trabajo frecuentemente. Cada integración es verificada por un build automático (incluyendo pruebas) para detectar errores de integración tan pronto como sea posible.

En este proyecto, CI nos permite:
- Detectar fallos en las pruebas unitarias en minutos.
- Garantizar que el código cumple con los estándares de calidad (SonarQube).
- Automatizar la creación de imágenes Docker.
- Validar el sistema completo con pruebas E2E (Cucumber) antes de considerar un cambio como exitoso.

## Acceso a Herramientas

| Herramienta | URL | Credenciales (Por Defecto) |
|-------------|-----|----------------------------|
| **Jenkins** | [http://localhost:9090](http://localhost:9090) | `admin` / `admin123` |
| **SonarQube** | [http://localhost:9000](http://localhost:9000) | `admin` / `admin` (Cambiar al primer ingreso) |

## Instrucciones de Configuración

### 1. Levantar el Entorno
Desde la raíz del proyecto, ejecute:
```bash
docker-compose up -d --build
```
Esto levantará Jenkins, SonarQube, las bases de datos y los microservicios necesarios.

### 2. Configuración Inicial de Jenkins
El sistema utiliza **Jenkins Configuration as Code (JCasC)**. Al iniciar, los pipelines `reto6-express-ci` y `reto2-go-ci` ya deberían estar creados automáticamente.

### 3. Ejecución de un Pipeline
1. Ingrese a Jenkins ([http://localhost:9090](http://localhost:9090)).
2. Seleccione el job `reto6-express-ci`.
3. Haga clic en **Build Now**.

## Descripción de las Etapas del Pipeline

1. **Docker Preflight:** Verifica que el cliente Docker esté disponible dentro de Jenkins.
2. **Checkout:** Obtiene el código fuente del repositorio Git.
3. **Build:** Instala dependencias y compila el microservicio (usando contenedores efímeros).
4. **Test:** Ejecuta las pruebas unitarias y genera reportes de cobertura (LCOV para Node.js, coverage.out para Go).
5. **SonarQube:** Envía el código y los reportes de cobertura a SonarQube para análisis estático.
6. **Quality Gate:** Espera el resultado de SonarQube. Si no se cumple el umbral del 70% de cobertura o hay bugs críticos, el pipeline falla.
7. **Package:** Construye la imagen Docker del microservicio y la etiqueta con el número de build.
8. **E2E Tests:** Levanta el servicio en el entorno de microservicios y ejecuta las pruebas BDD de Cucumber.

## Cómo interpretar los resultados

- **Verde (Success):** El cambio es seguro para ser desplegado. Pasó todas las pruebas y cumple con la calidad mínima.
- **Rojo (Failure):** Hubo un error. Puede ser una prueba fallida, falta de cobertura, error de sintaxis o fallo en la construcción de la imagen. Revise el **Console Output** en Jenkins para identificar la causa.

---
*Nota: Para que el Quality Gate funcione correctamente, asegúrese de que el token de SonarQube esté configurado en Jenkins como una credencial de tipo 'Secret Text' con el ID `sonar-token`.*
