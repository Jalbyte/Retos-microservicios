const express = require('express');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();
app.use(express.json());

const axios = require('axios');

const DEPARTAMENTOS_URL = process.env.DEPARTAMENTOS_URL;

console.log("URL Departamentos:", DEPARTAMENTOS_URL);

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

// Registrar empleado (POST)
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

// Consultar todos los empleados (GET) con paginación
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

// Consultar empleado por ID (GET)
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

app.listen(8080, () => console.log('Servidor listo en http://localhost:8080'))