const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');
const axios = require('axios');

const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:8086';
let response;

Given('el servicio Reto6 esta disponible', async function () {
  response = await axios.get(`${baseUrl}/health`);
});

When('consulto el endpoint de salud', async function () {
  response = await axios.get(`${baseUrl}/health`);
});

When('consulto el endpoint de saludo para {string}', async function (name) {
  response = await axios.get(`${baseUrl}/api/greet/${name}`);
});

Then('recibo un estado {int}', function (statusCode) {
  assert.strictEqual(response.status, statusCode);
});

Then('el cuerpo contiene status ok', function () {
  assert.strictEqual(response.data.status, 'ok');
});

Then('el mensaje incluye {string}', function (name) {
  assert.ok(response.data.message.includes(name));
});
