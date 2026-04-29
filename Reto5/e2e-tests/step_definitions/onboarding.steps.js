const { Given, When, Then } = require('@cucumber/cucumber');
const axios = require('axios');
const { expect } = require('chai');
const { poll } = require('../support/polling');
require('dotenv').config();

const BASE_URL = process.env.BASE_URL;
const MAX_ATTEMPTS = parseInt(process.env.POLLING_MAX_ATTEMPTS) || 15;
const INTERVAL_MS = parseInt(process.env.POLLING_INTERVAL_MS) || 2000;

Given('que he registrado un empleado con email {string}', async function (email) {
    // Usar email único para no colisionar con ejecuciones anteriores
    const uniqueEmail = `onboarding_${Date.now()}@empresa.com`;
    const payload = {
        nombre: 'Onboard',
        apellido: 'Test',
        email: uniqueEmail,
        departamento_id: '1',
        cargo: 'Dev',
        fechaIngreso: new Date().toISOString()
    };
    const res = await axios.post(`${BASE_URL}/empleado`, payload, {
        headers: { Authorization: `Bearer ${this.token}` }
    });
    expect(res.status).to.equal(201);
    this.lastCreatedEmpleadoId = res.data.id;
    // Guardar el email real usado (único) para los pasos siguientes
    this.lastCreatedEmail = uniqueEmail;
});

When('registro un empleado con email único y departamento existente', async function () {
    const email = `test${Date.now()}@empresa.com`;
    const payload = {
        nombre: 'Juan',
        apellido: 'Pérez',
        email,
        departamento_id: '1',
        cargo: 'Analista',
        fechaIngreso: new Date().toISOString()
    };
    try {
        this.lastResponse = await axios.post(`${BASE_URL}/empleado`, payload, {
            headers: { Authorization: `Bearer ${this.token}` }
        });
        if (this.lastResponse.status === 201) {
            this.lastCreatedEmail = email;
            this.lastCreatedEmpleadoId = this.lastResponse.data.id;
        }
    } catch (error) {
        this.lastResponse = error.response;
    }
});

When('registro un empleado con departamento inexistente', async function () {
    const payload = {
        nombre: 'Fallo',
        apellido: 'Test',
        email: `fail${Date.now()}@empresa.com`,
        departamento_id: '9999',
        cargo: 'Test',
        fechaIngreso: new Date().toISOString()
    };
    try {
        this.lastResponse = await axios.post(`${BASE_URL}/empleado`, payload, {
            headers: { Authorization: `Bearer ${this.token}` }
        });
    } catch (error) {
        this.lastResponse = error.response;
    }
});

When('registro un empleado sin email', async function () {
    const payload = {
        nombre: 'Sin email',
        apellido: 'Test',
        departamento_id: '1',
        cargo: 'Test',
        fechaIngreso: new Date().toISOString()
    };
    try {
        this.lastResponse = await axios.post(`${BASE_URL}/empleado`, payload, {
            headers: { Authorization: `Bearer ${this.token}` }
        });
    } catch (error) {
        this.lastResponse = error.response;
    }
});

Then('eventualmente el servicio de autenticación debe haber creado un usuario para ese email', async function () {
    const email = this.lastCreatedEmail;
    await poll(async () => {
        const res = await axios.get(`${BASE_URL}/notificaciones`, {
            headers: { Authorization: `Bearer ${this.token}` }
        });
        const notifs = res.data.content || [];
        return notifs.some(n => n.destinatario === email && n.tipo === 'SEGURIDAD');
    }, MAX_ATTEMPTS, INTERVAL_MS);
});

Then('eventualmente debe existir una notificación de tipo BIENVENIDA para ese email', async function () {
    const email = this.lastCreatedEmail;
    await poll(async () => {
        const res = await axios.get(`${BASE_URL}/notificaciones`, {
            headers: { Authorization: `Bearer ${this.token}` }
        });
        const notificaciones = res.data.content || [];
        return notificaciones.some(n => n.destinatario === email && n.tipo === 'BIENVENIDA');
    }, MAX_ATTEMPTS, INTERVAL_MS);
});

When('establezco su contraseña usando el token de recuperación', async function () {
    const email = this.lastCreatedEmail;
    // Solicitar reset token (genera notificación SEGURIDAD con el token)
    await axios.post(`${BASE_URL}/auth/recover-password`, { email });
    const resetToken = await this.obtenerResetToken(email);
    try {
        this.lastResponse = await axios.post(`${BASE_URL}/auth/reset-password`, {
            token: resetToken,
            newPassword: 'MiNuevaContrasena123'
        });
    } catch (error) {
        this.lastResponse = error.response;
    }
    // Guardar la contraseña para el paso de login
    this.lastPassword = 'MiNuevaContrasena123';
});

// CORRECCIÓN: el feature pasa email como parámetro pero la contraseña
// viene del contexto (this.lastPassword) — no hay segundo parámetro en el step
When('hago login con {string} y la nueva contraseña', async function (email) {
    try {
        this.lastResponse = await axios.post(`${BASE_URL}/auth/login`, {
            email: this.lastCreatedEmail,   // usar el email único real
            password: this.lastPassword
        });
    } catch (error) {
        this.lastResponse = error.response;
    }
});

Then('la respuesta debe tener código {int} y un token válido', function (codigo) {
    expect(this.lastResponse.status).to.equal(codigo);
    expect(this.lastResponse.data.accessToken).to.be.a('string').and.not.empty;
});