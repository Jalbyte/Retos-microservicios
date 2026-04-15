const { Given, When, Then } = require('@cucumber/cucumber');
const axios = require('axios');
const { expect } = require('chai');
require('dotenv').config();

const BASE_URL = process.env.BASE_URL;

Given('que el sistema está desplegado y operativo', async function () {
    if (!BASE_URL) throw new Error('BASE_URL no está definida en .env');
});

When('consulto la URL base', async function () {
    try {
        this.lastResponse = await axios.get(BASE_URL);
    } catch (error) {
        this.lastResponse = error.response;
    }
});

Then('la respuesta debe tener código {int}', function (codigo) {
    expect(this.lastResponse.status).to.equal(codigo);
});

Then('la respuesta debe tener código {int} o {int}', function (codigo1, codigo2) {
    expect([codigo1, codigo2]).to.include(this.lastResponse.status);
});


Then('el gateway devuelve {int} si no hay ruta, pero confirma que está vivo', function (codigo) {
    expect(this.lastResponse.status).to.equal(codigo);
});