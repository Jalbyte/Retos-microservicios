const { Given, When } = require('@cucumber/cucumber');
const axios = require('axios');
require('dotenv').config();

const BASE_URL = process.env.BASE_URL;

async function login(role) {
    const email = role === 'ADMIN' ? process.env.ADMIN_EMAIL : process.env.USER_EMAIL;
    const password = role === 'ADMIN' ? process.env.ADMIN_PASSWORD : process.env.USER_PASSWORD;
    const res = await axios.post(`${BASE_URL}/auth/login`, { email, password });
    return res.data.accessToken;
}

Given('que estoy autenticado como {string}', async function (role) {
    this.token = await login(role);
});

// CORRECCIÓN: /empleados → /empleado (singular, como expone tu gateway)
When('consulto la lista de empleados sin token', async function () {
    try {
        this.lastResponse = await axios.get(`${BASE_URL}/empleado`);
    } catch (error) {
        this.lastResponse = error.response;
    }
});

When('consulto la lista de empleados con token inválido {string}', async function (invalidToken) {
    try {
        this.lastResponse = await axios.get(`${BASE_URL}/empleado`, {
            headers: { Authorization: `Bearer ${invalidToken}` }
        });
    } catch (error) {
        this.lastResponse = error.response;
    }
});

When('consulto la lista de empleados', async function () {
    try {
        this.lastResponse = await axios.get(`${BASE_URL}/empleado`, {
            headers: { Authorization: `Bearer ${this.token}` }
        });
    } catch (error) {
        this.lastResponse = error.response;
    }
});

When('intento crear un empleado con datos válidos', async function () {
    await this.intentoCrearEmpleadoConDatosValidos();
});

When('creo un empleado con datos válidos', async function () {
    await this.intentoCrearEmpleadoConDatosValidos();
});