require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const authMiddleware = require('./middleware/auth');
const uploadRouter = require('./routes/upload');
const processRouter = require('./routes/process');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir archivos estáticos
app.use(express.static('public'));

// Rutas públicas (login)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Endpoint de debug temporal (ELIMINAR EN PRODUCCIÓN)
app.get('/api/debug-env', (req, res) => {
  res.json({
    passwordConfigured: !!process.env.PASSWORD,
    passwordLength: process.env.PASSWORD ? process.env.PASSWORD.length : 0,
    nodeEnv: process.env.NODE_ENV,
    // NO expongas la contraseña real, solo info de debug
    firstChar: process.env.PASSWORD ? process.env.PASSWORD[0] : 'N/A',
    lastChar: process.env.PASSWORD ? process.env.PASSWORD[process.env.PASSWORD.length - 1] : 'N/A'
  });
});

// Endpoint de autenticación
app.post('/api/login', (req, res) => {
  const { password } = req.body;

  // Trim para eliminar espacios en blanco
  const cleanPassword = password?.trim();
  const envPassword = process.env.PASSWORD?.trim();

  console.log('Login attempt:', {
    receivedLength: cleanPassword?.length,
    envPasswordExists: !!envPassword,
    envPasswordLength: envPassword?.length
  });

  if (!envPassword) {
    return res.status(500).json({
      success: false,
      message: 'Error de configuración: PASSWORD no está definido en variables de entorno'
    });
  }

  if (cleanPassword === envPassword) {
    res.json({ success: true, message: 'Autenticación exitosa' });
  } else {
    res.status(401).json({ success: false, message: 'Contraseña incorrecta' });
  }
});

// Rutas protegidas
app.use('/api/upload', authMiddleware, uploadRouter);
app.use('/api/process', authMiddleware, processRouter);

// Manejo de errores
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Error interno del servidor'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📝 Webapp de facturas lista en http://localhost:${PORT}`);
});

module.exports = app;
