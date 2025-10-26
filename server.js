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

// Endpoint de autenticación
app.post('/api/login', (req, res) => {
  const { password } = req.body;

  if (password === process.env.PASSWORD) {
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
