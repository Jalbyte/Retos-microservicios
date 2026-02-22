
const express = require('express');
const { PrismaClient } = require('@prisma/client');
// Cargar variables de entorno
const app = express();
const prisma = new PrismaClient();
app.use(express.json());
// CORS middleware
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

// Cargar URL del servicio de departamentos desde variables de entorno
const axios = require('axios');
const PORT = process.env.PORT || 8080;
const DEPARTAMENTOS_URL = process.env.DEPARTAMENTOS_URL;

console.log("URL Departamentos:", DEPARTAMENTOS_URL);

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
    ]
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
 *               - departamentoId
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
 *               departamentoId:
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
 *                 departamentoId:
 *                   type: integer
 *                 fechaIngreso:
 *                   type: string
 *       400:
 *         description: Error de validación - campos requeridos faltantes o departamento no válido
 *       409:
 *         description: Conflicto - empleado ya existe
 *       500:
 *         description: Error interno del servidor
 */
app.post('/empleado', async (req, res) => {
    const { nombre, apellido, cargo, email, departamentoId, fechaIngreso } = req.body;
    // Validación de campos requeridos
    const camposRequeridos = { nombre, apellido, cargo, email, departamentoId, fechaIngreso };

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

    try {
        //Se valida que el departamento exista antes de crear el empleado
        try {
            await axios.get(`${DEPARTAMENTOS_URL}/departamentos/${departamentoId}`)
        } catch (err) {
            return errorResponse(res, {
                status: 400,
                message: 'Departamento no válido',
                path: '/empleado',
                errors: [{
                    field: 'departamentoId',
                    message: 'El departamento no existe',
                    rejectedValue: departamentoId,
                }],
            })
        }

        const nuevo = await prisma.empleado.create({
            data: {nombre, apellido, cargo, email, departamentoId, fechaIngreso: new Date(fechaIngreso) },
        });
        res.status(201).json(nuevo); // 201 Creado

    } catch (error) {
        if (error.code === 'P2002') {
            return errorResponse(res, {
                status: 409, // Conflicto (credenciales duplicadas)
                message: `Ya existe un empleado con el id ${id}`,
                path: '/empleado',
                errors: [{
                    field: 'id',
                    message: 'El id ya está registrado',
                    rejectedValue: id,
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
 *     summary: Listar todos los empleados
 *     description: Obtiene una lista paginada de empleados del sistema
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
 *         description: Lista de empleados obtenida exitosamente
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
 *                       departamentoId:
 *                         type: integer
 *                       fechaIngreso:
 *                         type: string
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     size:
 *                       type: integer
 *                     totalElements:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       500:
 *         description: Error interno del servidor
 */
app.get('/empleado', async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const size = Math.min(100, Math.max(1, parseInt(req.query.size) || 5));
    const skip = (page - 1) * size;

    const [totalElements, data] = await Promise.all([
        prisma.empleado.count(),
        prisma.empleado.findMany({ skip, take: size }),
    ]);

    const totalPages = Math.ceil(totalElements / size);

    res.json({
        data,
        pagination: { page, size, totalElements, totalPages },
    });
});

/**
 * @swagger
 * /empleado/{id}:
 *   get:
 *     summary: Obtener empleado por ID
 *     description: Obtiene los detalles de un empleado específico
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
 *         description: Empleado encontrado
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
 *                 departamentoId:
 *                   type: integer
 *                 fechaIngreso:
 *                   type: string
 *       404:
 *         description: Empleado no encontrado
 *       500:
 *         description: Error interno del servidor
 */
app.get('/empleado/:id', async (req, res) => {
    const { id } = req.params;
    const empleado = await prisma.empleado.findUnique({
        where: { id: parseInt(id) },
    });

    if (empleado) {
        return res.json(empleado);
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