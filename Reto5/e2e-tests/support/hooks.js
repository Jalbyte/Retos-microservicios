const { BeforeAll, Before, After, setDefaultTimeout } = require('@cucumber/cucumber');
const axios = require('axios');

// Timeout generoso para pasos con polling
setDefaultTimeout(60 * 1000);

BeforeAll(async function () {
    // No hay nada que sembrar globalmente.
    // El usuario USER se crea dinámicamente en el escenario de onboarding
    // y sus credenciales vienen del .env (USER_EMAIL / USER_PASSWORD).
    // Si el usuario no existe en el sistema, el test de seguridad fallará
    // con 401, lo que es el comportamiento correcto que hay que corregir
    // en la base de datos, no en los tests.
    //
    // Para verificar que el sistema responde antes de correr los tests:
    const BASE_URL = process.env.BASE_URL;
    const started = Date.now();
    const TIMEOUT = 30000;
    while (Date.now() - started < TIMEOUT) {
        try {
            await axios.get(BASE_URL);
            break;
        } catch (err) {
            const status = err?.response?.status;
            // 404 o 401 significa que el gateway está vivo
            if (status === 404 || status === 401) break;
            await new Promise(r => setTimeout(r, 1000));
        }
    }
});

Before(function () {
    // Limpiar estado entre escenarios
    this.token = null;
    this.lastResponse = null;
    this.lastCreatedEmpleadoId = null;
    this.lastCreatedEmail = null;
    this.lastResetToken = null;
    this.offboardEmail = null;
    this.offboardId = null;
    this.offboardPassword = null;
});