const { setWorldConstructor } = require('@cucumber/cucumber');
const axios = require('axios');
const { poll } = require('./polling');

class CustomWorld {
    constructor({ parameters } = {}) {
        this.token = null;
        this.lastResponse = null;
        this.lastCreatedEmpleadoId = null;
        this.lastCreatedEmail = null;
        this.lastResetToken = null;
        this.offboardEmail = null;
        this.offboardId = null;
        this.offboardPassword = null;
    }

    get BASE_URL() {
        return process.env.BASE_URL;
    }

    async intentoCrearEmpleadoConDatosValidos() {
        const payload = {
            nombre: 'Test',
            apellido: 'User',
            email: `test${Date.now()}@empresa.com`,
            departamento_id: '1',
            cargo: 'Developer',
            fechaIngreso: new Date().toISOString()
        };
        try {
            this.lastResponse = await axios.post(`${this.BASE_URL}/empleado`, payload, {
                headers: { Authorization: `Bearer ${this.token}` }
            });
        } catch (error) {
            this.lastResponse = error.response;
        }
    }

    async obtenerResetToken(email) {
        const MAX = parseInt(process.env.POLLING_MAX_ATTEMPTS) || 15;
        const INTERVAL = parseInt(process.env.POLLING_INTERVAL_MS) || 2000;
        return await poll(async () => {
            const res = await axios.get(`${this.BASE_URL}/notificaciones`, {
                headers: { Authorization: `Bearer ${this.token}` }
            });
            const notifs = res.data.content || [];
            const notif = notifs.find(n => n.destinatario === email && n.tipo === 'SEGURIDAD');
            if (notif) {
                const parts = notif.mensaje.split('token: ');
                if (parts.length > 1) {
                    return parts[1].trim();
                }
            }
            return false;
        }, MAX, INTERVAL);
    }

    async queExisteUnEmpleadoActivoConCredencialesConfiguradas() {
        const email = `offboard${Date.now()}@empresa.com`;
        const createRes = await axios.post(`${this.BASE_URL}/empleado`, {
            nombre: 'Offboard',
            apellido: 'Test',
            email,
            departamento_id: '1',
            cargo: 'Tester',
            fechaIngreso: new Date().toISOString()
        }, {
            headers: { Authorization: `Bearer ${this.token}` }
        });

        this.offboardEmail = email;
        this.offboardId = createRes.data.id;

        const resetToken = await this.obtenerResetToken(email);
        await axios.post(`${this.BASE_URL}/auth/reset-password`, {
            token: resetToken,
            newPassword: 'TempPass123'
        });
        this.offboardPassword = 'TempPass123';
    }

    async eliminoAlEmpleadoExistente() {
        try {
            this.lastResponse = await axios.delete(`${this.BASE_URL}/empleado/${this.offboardId}`, {
                headers: { Authorization: `Bearer ${this.token}` }
            });
        } catch (error) {
            this.lastResponse = error.response;
        }
    }
}

setWorldConstructor(CustomWorld);