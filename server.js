require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Login endpoint
app.post('/api/login', (req, res) => {
  const { password } = req.body;

  if (!process.env.PASSWORD) {
    return res.status(500).json({
      success: false,
      message: 'PASSWORD no configurado'
    });
  }

  if (password === process.env.PASSWORD) {
    res.json({ success: true });
  } else {
    res.status(401).json({
      success: false,
      message: 'Contraseña incorrecta'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor en puerto ${PORT}`);
});

module.exports = app;
