require('./tracing');
const logger = require('./logger');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const cors = require('cors');
const { metricsMiddleware, metricsEndpoint } = require('./metrics');

const pool = require('./db');
const { connectRabbit, publishToAuth, setEventHandler } = require('./rabbitmq');

const app = express();
app.use(express.json());
app.use(cors());
app.use(metricsMiddleware);

// ─── Metrics (Prometheus) ───────────────────────────────────────────────────
app.get('/metrics', metricsEndpoint);

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET es obligatorio. Configuralo en el archivo .env del proyecto.');
}

// ─── Swagger / OpenAPI ────────────────────────────────────────────────────────
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Auth Service',
      version: '1.0.0',
      description: `Microservicio de autenticación — Reto 4.

**Flujo básico:**
1. El empleado es creado en \`gestion-empleados\`. El evento \`empleado.creado\` genera un usuario inhabilitado y publica \`usuario.creado\` con el token de reset.
2. El usuario recibe el token (vía logs de \`notificaciones-service\`) y lo usa en \`POST /auth/reset-password\` para establecer su contraseña.
3. Luego hace login en \`POST /auth/login\` y obtiene el JWT de acceso.
4. Usa ese JWT como \`Bearer <token>\` en todos los demás servicios.

**Usuario semilla (ADMIN):** \`admin@empresa.com\` / \`password\``,
    },
    servers: [{ url: `http://localhost:3000` }],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Ingrese el token JWT obtenido en POST /auth/login',
        },
      },
    },
  },
  apis: ['./index.js'],
};
const specs = swaggerJsdoc(swaggerOptions);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs));

// ─── Helpers ──────────────────────────────────────────────────────────────────
function signAccessToken(email, role) {
  return jwt.sign(
    { sub: email, role },
    JWT_SECRET,
    { expiresIn: '1h', algorithm: 'HS256' }
  );
}

function signResetToken(email) {
  return jwt.sign(
    { sub: email, type: 'RESET_PASSWORD' },
    JWT_SECRET,
    { expiresIn: '1h', algorithm: 'HS256' }
  );
}

function verifyResetToken(token) {
  const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
  if (payload.type !== 'RESET_PASSWORD') {
    throw new Error('Token de tipo incorrecto');
  }
  return payload;
}

// ─── RabbitMQ event handler ───────────────────────────────────────────────────
async function handleEmployeeEvent(event) {
  const { event: type, data } = event;

  if (type === 'empleado.creado') {
    const { email } = data;
    try {
      // Insertar usuario inhabilitado sin contraseña
      await pool.query(
        `INSERT INTO users (email, password, role, enabled)
         VALUES ($1, NULL, 'USER', false)
         ON CONFLICT (email) DO NOTHING`,
        [email]
      );
      logger.info(`[EVENT] Usuario creado para: ${email}`);

      // Generar token de reset y publicar usuario.creado
      const resetToken = signResetToken(email);
      await publishToAuth({
        event: 'usuario.creado',
        data: { email, token: resetToken },
      });
    } catch (err) {
      logger.error(`[EVENT] Error procesando empleado.creado: ${err.message}`);
    }
  } else if (type === 'empleado.eliminado') {
    const { email } = data;
    try {
      await pool.query(
        `UPDATE users SET enabled = false WHERE email = $1`,
        [email]
      );
      logger.info(`[EVENT] Usuario inhabilitado: ${email}`);
    } catch (err) {
      logger.error(`[EVENT] Error procesando empleado.eliminado: ${err.message}`);
    }
  }
}

// ─── Endpoints ────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Servicio disponible
 */
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'UP', service: 'auth-service' });
  } catch {
    res.status(503).json({ status: 'DOWN' });
  }
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Iniciar sesión y obtener JWT de acceso
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@empresa.com
 *               password:
 *                 type: string
 *                 example: password
 *     responses:
 *       200:
 *         description: Login exitoso — retorna JWT de acceso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   description: JWT de acceso (1 hora de validez)
 *                 tokenType:
 *                   type: string
 *                   example: Bearer
 *                 expiresIn:
 *                   type: integer
 *                   example: 3600
 *       401:
 *         description: Credenciales inválidas o usuario inhabilitado
 */
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ status: 400, error: 'Bad Request', message: 'email y password son requeridos' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user || !user.enabled) {
      return res.status(401).json({ status: 401, error: 'Unauthorized', message: 'Credenciales inválidas o usuario inhabilitado' });
    }

    if (!user.password) {
      return res.status(401).json({ status: 401, error: 'Unauthorized', message: 'Contraseña no establecida. Use /auth/reset-password con su token de activación.' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ status: 401, error: 'Unauthorized', message: 'Credenciales inválidas' });
    }

    const accessToken = signAccessToken(user.email, user.role);
    return res.json({ accessToken, tokenType: 'Bearer', expiresIn: 3600 });
  } catch (err) {
    logger.error(`[LOGIN] ${err.message}`);
    return res.status(500).json({ status: 500, error: 'Internal Server Error', message: 'Error al procesar login' });
  }
});

/**
 * @swagger
 * /auth/recover-password:
 *   post:
 *     summary: Solicitar recuperación de contraseña
 *     description: Genera un token de recuperación y publica el evento `usuario.recuperacion`. El token aparece en los logs de notificaciones-service.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: juan@empresa.com
 *     responses:
 *       200:
 *         description: Si el email existe, se enviará un token de recuperación (revise los logs de notificaciones-service)
 */
app.post('/auth/recover-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ status: 400, error: 'Bad Request', message: 'email es requerido' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1 AND enabled = true', [email]);
    // Respondemos siempre 200 para no revelar si el email existe (seguridad)
    if (result.rows.length > 0) {
      const resetToken = signResetToken(email);
      await publishToAuth({
        event: 'usuario.recuperacion',
        data: { email, token: resetToken },
      });
      logger.info(`[RECOVER] Token de recuperación generado para: ${email}`);
    }

    return res.json({ message: 'Si el email está registrado, recibirá instrucciones para restablecer su contraseña' });
  } catch (err) {
    logger.error(`[RECOVER] ${err.message}`);
    return res.status(500).json({ status: 500, error: 'Internal Server Error', message: 'Error al procesar solicitud' });
  }
});

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Establecer o restablecer contraseña usando token de reset
 *     description: |
 *       Recibe el token JWT de tipo `RESET_PASSWORD` (obtenido de los logs de `notificaciones-service`)
 *       y la nueva contraseña. Activa la cuenta si estaba inhabilitada.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, newPassword]
 *             properties:
 *               token:
 *                 type: string
 *                 description: JWT de tipo RESET_PASSWORD recibido por email/log
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *                 example: MiNuevaContraseña123
 *     responses:
 *       200:
 *         description: Contraseña actualizada exitosamente
 *       400:
 *         description: Token o contraseña inválidos
 *       401:
 *         description: Token expirado o inválido
 */
app.post('/auth/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ status: 400, error: 'Bad Request', message: 'token y newPassword son requeridos' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ status: 400, error: 'Bad Request', message: 'La contraseña debe tener al menos 6 caracteres' });
  }

  try {
    let payload;
    try {
      payload = verifyResetToken(token);
    } catch (err) {
      return res.status(401).json({ status: 401, error: 'Unauthorized', message: 'Token inválido, expirado o de tipo incorrecto' });
    }

    const email = payload.sub;
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const result = await pool.query(
      `UPDATE users SET password = $1, enabled = true WHERE email = $2 RETURNING id, email, role`,
      [hashedPassword, email]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ status: 404, error: 'Not Found', message: 'Usuario no encontrado' });
    }

    logger.info(`[RESET] Contraseña actualizada para: ${email}`);
    return res.json({ message: 'Contraseña actualizada exitosamente. Ya puede hacer login.' });
  } catch (err) {
    logger.error(`[RESET] ${err.message}`);
    return res.status(500).json({ status: 500, error: 'Internal Server Error', message: 'Error al restablecer contraseña' });
  }
});

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ status: 404, error: 'Not Found', message: 'Recurso no encontrado', path: req.originalUrl });
});

// ─── Start ────────────────────────────────────────────────────────────────────
setEventHandler(handleEmployeeEvent);
connectRabbit().catch(err => logger.error(`[RabbitMQ] Error al iniciar: ${err.message}`));

app.listen(PORT, () => {
  logger.info(`[auth-service] Listo en http://localhost:${PORT}`);
  logger.info(`[auth-service] Swagger UI: http://localhost:${PORT}/docs`);
});
