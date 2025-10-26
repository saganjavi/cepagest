// Middleware simple de autenticación basado en contraseña
// En producción, el password viene del header Authorization

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: 'No se proporcionó autenticación'
    });
  }

  // Formato esperado: "Bearer PASSWORD"
  const password = authHeader.replace('Bearer ', '');

  if (password === process.env.PASSWORD) {
    next();
  } else {
    return res.status(401).json({
      success: false,
      message: 'Autenticación inválida'
    });
  }
}

module.exports = authMiddleware;
