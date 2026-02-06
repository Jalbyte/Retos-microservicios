const express = require('express');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();
app.use(express.json());

// Registrar empleado (POST)
app.post('/registrar-empleado', async (req, res) => {
    const { id, nombre, apellido, cargo, email } = req.body;
    try {
        const nuevo = await prisma.empleado.create({
            data: { id: parseInt(id), nombre, apellido, cargo, email }
        });
        res.status(201).json(nuevo);
    } catch (error) {
        res.status(400).json({ error: "Error al registrar: ID duplicado o datos faltantes" });
    }
});

// Consultar todos los empleados (GET)
app.get('/obtener-empleados', async (req, res) => {
    const empleados = await prisma.empleado.findMany();
    res.json(empleados);
});

// Consultar empleado por ID (GET)
app.get('/obtener-empleado/:id', async (req, res) => {
    const { id } = req.params;
    const empleado = await prisma.empleado.findUnique({
        where: { id: parseInt(id) }
    });

    if (empleado) {
        res.json(empleado);
    } else {
        res.status(404).send(`El empleado con id ${id} no existe`);
    }
});

// Ruta 404
app.use((req, res) => {
    res.status(404).send("Recurso no encontrado");
});

app.listen(8080, () => console.log("Servidor listo en http://localhost:8080"));