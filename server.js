require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Almacenamiento en memoria
const invoicesStore = new Map();
let invoiceIdCounter = 1;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// Middleware de autenticación simple
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader.replace('Bearer ', '') !== process.env.PASSWORD) {
    return res.status(401).json({ success: false, message: 'No autorizado' });
  }
  next();
}

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

// Upload endpoint
app.post('/api/upload', authMiddleware, (req, res) => {
  try {
    const { invoices } = req.body;

    if (!invoices || !Array.isArray(invoices)) {
      return res.status(400).json({
        success: false,
        message: 'Formato inválido'
      });
    }

    const uploaded = invoices.map(({ filename, imageBase64 }) => {
      const id = invoiceIdCounter++;
      const invoice = {
        id,
        filename,
        imageBase64,
        status: 'pending',
        processedData: null
      };
      invoicesStore.set(id, invoice);
      return { id, filename, status: 'pending' };
    });

    res.json({
      success: true,
      invoices: uploaded
    });
  } catch (error) {
    console.error('Error en upload:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Process endpoint
app.post('/api/process', authMiddleware, async (req, res) => {
  try {
    const { id, imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        message: 'Imagen no proporcionada'
      });
    }

    // Llamar a GPT-4o (modelo actual con soporte de visión)
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analiza esta imagen de factura y extrae EXACTAMENTE los siguientes campos en formato JSON:

{
  "nombreEmisor": "Nombre completo del emisor",
  "cifEmisor": "CIF del emisor",
  "fechaEmision": "Fecha de emisión (DD/MM/YYYY)",
  "importeSinIva": "Importe sin IVA (solo número)",
  "importeConIva": "Importe total con IVA (solo número)",
  "fechaConformidad": "Fecha de conformidad o firma digital (DD/MM/YYYY)"
}

Si algún campo no está visible, usa "N/A". Responde SOLO con el JSON, sin texto adicional.`
            },
            {
              type: "image_url",
              image_url: {
                url: imageBase64,
                detail: "high"
              }
            }
          ]
        }
      ]
    });

    const content = response.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    let extractedData;
    if (jsonMatch) {
      extractedData = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('No se pudo extraer JSON de la respuesta');
    }

    res.json({
      success: true,
      data: extractedData
    });

  } catch (error) {
    console.error('Error en process:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor en puerto ${PORT}`);
});

module.exports = app;
