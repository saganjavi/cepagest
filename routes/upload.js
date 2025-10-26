const express = require('express');
const multer = require('multer');
const router = express.Router();

// Almacenamiento en memoria de facturas
// Estructura: { id, filename, buffer, uploadDate, processedData, status }
const invoicesStore = new Map();
let invoiceIdCounter = 1;

// Configurar Multer para almacenar en memoria
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max por archivo
    files: 50 // Máximo 50 archivos
  },
  fileFilter: (req, file, cb) => {
    // Validar que sean PDFs
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF'));
    }
  }
});

// POST /api/upload - Subir PDFs
router.post('/', upload.array('pdfs', 50), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se subieron archivos'
      });
    }

    const uploadedInvoices = [];

    req.files.forEach(file => {
      const invoiceId = invoiceIdCounter++;
      const invoice = {
        id: invoiceId,
        filename: file.originalname,
        buffer: file.buffer,
        uploadDate: new Date().toISOString(),
        processedData: null,
        status: 'pending' // pending, processing, completed, error
      };

      invoicesStore.set(invoiceId, invoice);

      uploadedInvoices.push({
        id: invoiceId,
        filename: invoice.filename,
        uploadDate: invoice.uploadDate,
        status: invoice.status
      });
    });

    res.json({
      success: true,
      message: `${uploadedInvoices.length} factura(s) subida(s) correctamente`,
      invoices: uploadedInvoices
    });
  } catch (error) {
    console.error('Error en upload:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// GET /api/upload - Obtener lista de facturas
router.get('/', (req, res) => {
  const invoices = Array.from(invoicesStore.values()).map(invoice => ({
    id: invoice.id,
    filename: invoice.filename,
    uploadDate: invoice.uploadDate,
    status: invoice.status,
    processedData: invoice.processedData
  }));

  res.json({
    success: true,
    invoices: invoices
  });
});

// DELETE /api/upload/:id - Eliminar una factura
router.delete('/:id', (req, res) => {
  const invoiceId = parseInt(req.params.id);

  if (invoicesStore.has(invoiceId)) {
    invoicesStore.delete(invoiceId);
    res.json({
      success: true,
      message: 'Factura eliminada'
    });
  } else {
    res.status(404).json({
      success: false,
      message: 'Factura no encontrada'
    });
  }
});

// DELETE /api/upload - Limpiar todas las facturas
router.delete('/', (req, res) => {
  invoicesStore.clear();
  invoiceIdCounter = 1;

  res.json({
    success: true,
    message: 'Todas las facturas eliminadas'
  });
});

// Exportar el store para que otras rutas puedan acceder
module.exports = router;
module.exports.invoicesStore = invoicesStore;
