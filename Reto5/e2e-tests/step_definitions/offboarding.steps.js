const { Given, When, Then } = require('@cucumber/cucumber');
const axios = require('axios');
const { poll } = require('../support/polling');
require('dotenv').config();

const BASE_URL = process.env.BASE_URL;
const MAX_ATTEMPTS = parseInt(process.env.POLLING_MAX_ATTEMPTS) || 15;
const INTERVAL_MS = parseInt(process.env.POLLING_INTERVAL_MS) || 2000;

Given('que existe un empleado activo con credenciales configuradas', async function () {
    await this.queExisteUnEmpleadoActivoConCredencialesConfiguradas();
});

When('elimino al empleado existente', async function () {
    try {
        this.lastResponse = await axios.delete(`${BASE_URL}/empleado/${this.offboardId}`, {
            headers: { Authorization: `Bearer ${this.token}` }
        });
    } catch (error) {
        this.lastResponse = error.response;
    }
});

Then('eventualmente debe existir una notificación de tipo DESVINCULACION para ese email', async function () {
    const email = this.offboardEmail;
    await poll(async () => {
        const res = await axios.get(`${BASE_URL}/notificaciones`, {
            headers: { Authorization: `Bearer ${this.token}` }
        });
        const notificaciones = res.data.content || [];
        return notificaciones.some(n => n.destinatario === email && n.tipo === 'DESVINCULACION');
    }, MAX_ATTEMPTS, INTERVAL_MS);
});

Given('que el empleado ha sido desvinculado', async function () {
    await this.eliminoAlEmpleadoExistente();
    // Esperar a que el evento llegue al auth-service y deshabilite al usuario
    await poll(async () => {
        try {
            const res = await axios.post(`${BASE_URL}/auth/login`, {
                email: this.offboardEmail,
                password: this.offboardPassword
            });
            return res.status === 401;
        } catch (error) {
            return error.response && error.response.status === 401;
        }
    }, MAX_ATTEMPTS, INTERVAL_MS);
});

When('intento hacer login con sus credenciales', async function () {
    try {
        this.lastResponse = await axios.post(`${BASE_URL}/auth/login`, {
            email: this.offboardEmail,
            password: this.offboardPassword
        });
    } catch (error) {
        this.lastResponse = error.response;
    }
});

When('solicito recuperar contraseña para su email', async function () {
    try {
        this.lastResponse = await axios.post(`${BASE_URL}/auth/recover-password`, {
            email: this.offboardEmail
        });
    } catch (error) {
        this.lastResponse = error.response;
    }
});