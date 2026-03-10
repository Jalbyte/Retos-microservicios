const express = require('express');
const { authenticate, requireRole } = require('./middleware/auth');
// Cargar variables de entorno
const app = express();
app.use(express.json());

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Conectar a RabbitMQ
const { connectRabbit, publishEvent } = require("./rabbitmq");

connectRabbit().catch(err => console.error('[RabbitMQ] Error al iniciar conexión:', err.message));

// CORS middleware
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

// Cargar URL del servicio de departamentos desde variables de entorno
const axios = require('axios');
const PORT = process.env.PORT || 8080;
const DEPARTAMENTOS_URL = process.env.DEPARTAMENTOS_URL;
const CircuitBreaker = require('opossum');

// Crear instancia axios con timeout
const axiosInstance = axios.create({
  baseURL: DEPARTAMENTOS_URL,
  timeout: 3000, // 3 segundos
});


async function getDepartamentoWithRetry(id, retries = 3, delay = 500) {
  try {
    return await axiosInstance.get(`/departamentos/${id}`);
  } catch (error) {
    if (retries === 0) throw error;

    console.log(`Retrying departamento ${id}... intentos restantes: ${retries}`);
    await new Promise(resolve => setTimeout(resolve, delay));

    return getDepartamentoWithRetry(id, retries - 1, delay * 2);
  }
}

const breakerOptions = {
  timeout: 5000, // tiempo máximo que espera opossum
  errorThresholdPercentage: 50, // % errores para abrir circuito
  resetTimeout: 10000, // 10s antes de intentar cerrar circuito
};

const departamentoBreaker = new CircuitBreaker(
  (id) => getDepartamentoWithRetry(id),
  breakerOptions
);

departamentoBreaker.fallback(() => {
  throw new Error("Servicio de departamentos no disponible");
});
// Configuración de Swagger
const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API Gestión de Empleados",
      version: "1.0.0",
      description: "Microservicio para la gestión de empleados"
    },
    servers: [
      {
        url: "http://localhost:8080"
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT obtenido en POST /auth/login del auth-service (puerto 3001)"
        }
      }
    },
    security: [{ BearerAuth: [] }]
  },
  apis: ["./index.js"],
};

const specs = swaggerJsdoc(options);

app.use("/docs", swaggerUi.serve, swaggerUi.setup(specs));


// ─── Helper: estructura de error estandarizada ───────────────────────────────
const HTTP_TEXTS = {
  400: 'Bad Request',
  404: 'Not Found',
  409: 'Conflict',
  500: 'Internal Server Error',
};

function errorResponse(res, { status, message, path, errors = [] }) {
  return res.status(status).json({
    status,
    error: HTTP_TEXTS[status] ?? 'Error',
    message,
    timestamp: new Date().toISOString(),
    path,
    errors,
  });
}
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /empleado:
 *   post:
 *     summary: Registrar un nuevo empleado
 *     description: Crea un nuevo empleado en el sistema y valida que el departamento exista
 *     tags:
 *       - Empleados
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - apellido
 *               - cargo
 *               - email
 *               - departamento_id
 *               - fechaIngreso
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: "Juan"
 *               apellido:
 *                 type: string
 *                 example: "Pérez"
 *               cargo:
 *                 type: string
 *                 example: "Desarrollador"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "juan@example.com"
 *               departamento_id:
 *                 type: integer
 *                 example: 1
 *               fechaIngreso:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-01-15T00:00:00Z"
 *     responses:
 *       201:
 *         description: Empleado creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 nombre:
 *                   type: string
 *                 apellido:
 *                   type: string
 *                 cargo:
 *                   type: string
 *                 email:
 *                   type: string
 *                 departamento_id:
 *                   type: integer
 *                 fecha_ingreso:
 *                   type: string
 *                   format: date-time
 *                 is_active:
 *                   type: boolean
 *                   example: true
 *                   description: Indica si el empleado está activo en el sistema
 *       400:
 *         description: Error de validación - campos requeridos faltantes o departamento no válido
 *       409:
 *         description: Conflicto - empleado ya existe
 *       500:
 *         description: Error interno del servidor
 */
app.post('/empleado', authenticate, requireRole('ADMIN'), async (req, res) => {

  const { nombre, apellido, cargo, email, departamento_id, fechaIngreso } = req.body;

  // Validación de campos requeridos

  const camposRequeridos = { nombre, apellido, cargo, email, departamento_id, fechaIngreso };

  const faltantes = Object.entries(camposRequeridos)
    .filter(([, v]) => v === undefined || v === null || v === '')
    .map(([field]) => ({
      field,
      message: `El campo '${field}' es requerido`,
      rejectedValue: camposRequeridos[field] ?? null,
    }));

  if (faltantes.length > 0) {
    return errorResponse(res, {
      status: 400,
      message: 'Validation failed',
      path: '/empleado',
      errors: faltantes,
    });
  }


  // Validación de fecha

  const fecha = new Date(fechaIngreso);

  if (isNaN(fecha.getTime())) {
    return errorResponse(res, {
      status: 400,
      message: 'Fecha inválida',
      path: '/empleado',
      errors: [{
        field: 'fechaIngreso',
        message: 'Formato de fecha inválido',
        rejectedValue: fechaIngreso,
      }],
    });
  }

  try {


    // Validar departamento con Circuit Breaker

    try {
      await departamentoBreaker.fire(departamento_id);
    } catch (err) {

      console.error("ERROR VALIDANDO DEPARTAMENTO:", err);

      return errorResponse(res, {
        status: 503,
        message: 'Servicio de departamentos no disponible',
        path: '/empleado',
        errors: [{
          field: 'departamento_id',
          message: 'No se pudo validar el departamento',
          rejectedValue: departamento_id,
        }],
      });
    }

    // 
    // Insert en base de datos
    // 
    const insertQuery = `
            INSERT INTO empleado (nombre, apellido, cargo, email, departamento_id, fecha_ingreso)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
        `;

    const values = [
      nombre,
      apellido,
      cargo,
      email,
      departamento_id,
      fecha
    ];

    const result = await pool.query(insertQuery, values);

    const empleadoCreado = result.rows[0];

    //  Publicar evento en RabbitMQ (NO afecta a la BD si falla)
    try {
      await publishEvent({
        event: "empleado.creado",
        data: {
          id: empleadoCreado.id,
          nombre: empleadoCreado.nombre,
          email: empleadoCreado.email,
          departamentoId: empleadoCreado.departamento_id,
          fechaIngreso: empleadoCreado.fecha_ingreso
        }
      });

      console.log("Evento empleado.creado publicado");
    } catch (err) {
      console.error("Error publicando evento:", err);
    }

    // Respuesta normal
    return res.status(201).json(empleadoCreado);

  } catch (error) {

    console.error("ERROR AL CREAR EMPLEADO:", error);

    // Error por email duplicado (constraint UNIQUE)
    if (error.code === '23505') {
      return errorResponse(res, {
        status: 409,
        message: 'El email ya está registrado',
        path: '/empleado',
        errors: [{
          field: 'email',
          message: 'Ya existe un empleado con este email',
          rejectedValue: email,
        }],
      });
    }

    return errorResponse(res, {
      status: 500,
      message: 'Error interno al registrar el empleado',
      path: '/empleado',
    });
  }
});
/**
 * @swagger
 * /empleado:
 *   get:
 *     summary: Listar todos los empleados activos
 *     description: Obtiene una lista paginada de empleados activos (is_active = true). Los empleados desactivados mediante soft delete no aparecen en este listado.
 *     tags:
 *       - Empleados
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página (empieza en 1)
 *       - in: query
 *         name: size
 *         schema:
 *           type: integer
 *           default: 5
 *           maximum: 100
 *         description: Cantidad de registros por página
 *     responses:
 *       200:
 *         description: Lista paginada de empleados activos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       nombre:
 *                         type: string
 *                       apellido:
 *                         type: string
 *                       cargo:
 *                         type: string
 *                       email:
 *                         type: string
 *                       departamento_id:
 *                         type: integer
 *                       fecha_ingreso:
 *                         type: string
 *                         format: date-time
 *                       is_active:
 *                         type: boolean
 *                         example: true
 *                         description: Siempre true en este listado (solo se devuelven activos)
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     size:
 *                       type: integer
 *                     totalElements:
 *                       type: integer
 *                       description: Total de empleados activos
 *                     totalPages:
 *                       type: integer
 *       500:
 *         description: Error interno del servidor
 */
app.get('/empleado', authenticate, requireRole('ADMIN', 'USER'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const size = Math.min(100, Math.max(1, parseInt(req.query.size) || 5));
    const skip = (page - 1) * size;

    // Total de registros activos
    const countResult = await pool.query('SELECT COUNT(*) FROM empleado WHERE is_active = true');
    const totalElements = parseInt(countResult.rows[0].count);

    // Datos paginados (solo activos)
    const dataResult = await pool.query(
      'SELECT * FROM empleado WHERE is_active = true ORDER BY id LIMIT $1 OFFSET $2',
      [size, skip]
    );

    const totalPages = Math.ceil(totalElements / size);

    res.json({
      data: dataResult.rows,
      pagination: { page, size, totalElements, totalPages },
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 500,
      error: "Internal Server Error",
      message: "Error al obtener empleados"
    });
  }
});
/**
 * @swagger
 * /empleado/{id}:
 *   get:
 *     summary: Obtener empleado por ID
 *     description: Obtiene los detalles de un empleado activo por su ID. Retorna 404 si el empleado no existe o ha sido desactivado (soft delete).
 *     tags:
 *       - Empleados
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del empleado
 *     responses:
 *       200:
 *         description: Empleado activo encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 nombre:
 *                   type: string
 *                 apellido:
 *                   type: string
 *                 cargo:
 *                   type: string
 *                 email:
 *                   type: string
 *                 departamento_id:
 *                   type: integer
 *                 fecha_ingreso:
 *                   type: string
 *                   format: date-time
 *                 is_active:
 *                   type: boolean
 *                   example: true
 *       404:
 *         description: Empleado no encontrado o inactivo
 *       500:
 *         description: Error interno del servidor
 */
app.get('/empleado/:id', authenticate, requireRole('ADMIN', 'USER'), async (req, res) => {
  const { id } = req.params;
  const result = await pool.query(
    'SELECT * FROM empleado WHERE id = $1 AND is_active = true',
    [parseInt(id)]
  );

  if (result.rows.length > 0) {
    return res.json(result.rows[0]);
  }

  return errorResponse(res, {
    status: 404,
    message: `El empleado con id ${id} no existe`,
    path: `/empleado/${id}`,
    errors: [{
      field: 'id',
      message: 'No se encontró ningún empleado con este id',
      rejectedValue: id,
    }],
  });
});

/**
 * @swagger
 * /empleado/{id}:
 *   delete:
 *     summary: Desactivar empleado (soft delete)
 *     description: |
 *       Desactiva un empleado marcándolo como inactivo (`is_active = false`).
 *       El registro **no se elimina físicamente** de la base de datos.
 *       Tras la desactivación se publica el evento `empleado.eliminado` en RabbitMQ.
 *       Los endpoints `GET /empleado` y `GET /empleado/{id}` dejarán de devolver este empleado.
 *     tags:
 *       - Empleados
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del empleado a desactivar
 *     responses:
 *       200:
 *         description: Empleado desactivado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Empleado desactivado exitosamente"
 *                 empleado:
 *                   type: object
 *                   description: Estado final del empleado en la base de datos
 *                   properties:
 *                     id:
 *                       type: integer
 *                     nombre:
 *                       type: string
 *                     apellido:
 *                       type: string
 *                     cargo:
 *                       type: string
 *                     email:
 *                       type: string
 *                     departamento_id:
 *                       type: integer
 *                     fecha_ingreso:
 *                       type: string
 *                       format: date-time
 *                     is_active:
 *                       type: boolean
 *                       example: false
 *                       description: Siempre false tras la desactivación
 *       404:
 *         description: Empleado no encontrado o ya estaba inactivo
 *       500:
 *         description: Error interno del servidor
 */
app.delete('/empleado/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'UPDATE empleado SET is_active = false WHERE id = $1 AND is_active = true RETURNING *',
      [parseInt(id)]
    );

    if (result.rowCount === 0) {
      return errorResponse(res, {
        status: 404,
        message: `El empleado con id ${id} no existe`,
        path: `/empleado/${id}`,
        errors: [{
          field: 'id',
          message: 'No se encontró ningún empleado con este id',
          rejectedValue: id,
        }],
      });
    }

    // Publicar evento de eliminación
    try {
      await publishEvent({
        event: "empleado.eliminado",
        data: {
          id: result.rows[0].id,
          nombre: result.rows[0].nombre,
          apellido: result.rows[0].apellido,
          cargo: result.rows[0].cargo,
          email: result.rows[0].email,
          departamento_id: result.rows[0].departamento_id,
          fechaIngreso: result.rows[0].fecha_ingreso
        }
      });
      console.log("Evento empleado.eliminado publicado");
    } catch (err) {
      console.error("Error publicando evento:", err);
    }

    return res.json({
      message: "Empleado desactivado exitosamente",
      empleado: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    return errorResponse(res, {
      status: 500,
      message: 'Error interno al eliminar el empleado',
      path: `/empleado/${id}`,
    });
  }
});

// Ruta de health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'UP' });
  } catch (error) {
    res.status(503).json({ status: 'DOWN' });
  }
});

// Ruta 404
app.use((req, res) => {
  return errorResponse(res, {
    status: 404,
    message: 'Recurso no encontrado',
    path: req.originalUrl,
  });
});

app.listen(PORT, () => {
  console.log(`Servidor listo en http://localhost:${PORT}`);
});

