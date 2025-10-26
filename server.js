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
  try {
    const { password } = req.body;

    // Log para debug
    console.log('=== LOGIN ATTEMPT ===');
    console.log('Body recibido:', JSON.stringify(req.body));
    console.log('Password del body:', password);
    console.log('PASSWORD env existe:', !!process.env.PASSWORD);
    console.log('PASSWORD env value:', process.env.PASSWORD);
    console.log('====================');

    if (!process.env.PASSWORD) {
      return res.status(500).json({
        success: false,
        message: 'PASSWORD no configurado en servidor'
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'No se recibió contraseña'
      });
    }

    // Comparación simple y directa
    const match = password === process.env.PASSWORD;

    console.log('Comparación directa (sin trim):', match);

    if (match) {
      return res.json({
        success: true,
        message: 'Autenticación exitosa'
      });
    }

    // Si falla, probar con trim
    const matchWithTrim = password.trim() === process.env.PASSWORD.trim();
    console.log('Comparación con trim:', matchWithTrim);

    if (matchWithTrim) {
      return res.json({
        success: true,
        message: 'Autenticación exitosa (con trim)'
      });
    }

    // Si aún falla, devolver info de debug
    return res.status(401).json({
      success: false,
      message: 'Contraseña incorrecta',
      debug: {
        receivedLength: password.length,
        expectedLength: process.env.PASSWORD.length,
        receivedFirst3: password.substring(0, 3),
        expectedFirst3: process.env.PASSWORD.substring(0, 3),
        receivedLast3: password.substring(password.length - 3),
        expectedLast3: process.env.PASSWORD.substring(process.env.PASSWORD.length - 3)
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({
      success: false,
      message: 'Error en el servidor: ' + error.message
    });
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
