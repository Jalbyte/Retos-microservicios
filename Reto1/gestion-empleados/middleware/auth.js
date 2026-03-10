const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Valida el Bearer JWT en el header Authorization.
 * Adjunta req.user = { email, role } si es válido.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 401,
      error: 'Unauthorized',
      message: 'Token de acceso requerido',
      timestamp: new Date().toISOString(),
      path: req.path,
    });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });

    if (payload.type === 'RESET_PASSWORD') {
      return res.status(401).json({
        status: 401,
        error: 'Unauthorized',
        message: 'Token de tipo incorrecto',
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }

    req.user = { email: payload.sub, role: payload.role };
    next();
  } catch {
    return res.status(401).json({
      status: 401,
      error: 'Unauthorized',
      message: 'Token inválido o expirado',
      timestamp: new Date().toISOString(),
      path: req.path,
    });
  }
}

/**
 * Verifica que req.user.role esté entre los roles permitidos.
 * Debe usarse después de authenticate.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 401,
        error: 'Unauthorized',
        message: 'No autenticado',
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 403,
        error: 'Forbidden',
        message: `Acceso denegado. Se requiere rol: ${roles.join(' o ')}`,
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
