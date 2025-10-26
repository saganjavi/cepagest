const express = require('express');
const router = express.Router();

// Almacenamiento en memoria de facturas
// Estructura: { id, filename, imageBase64, uploadDate, processedData, status }
const invoicesStore = new Map();
let invoiceIdCounter = 1;

// POST /api/upload - Subir facturas (como imágenes base64)
router.post('/', (req, res) => {
  try {
    const { invoices } = req.body;

    if (!invoices || !Array.isArray(invoices) || invoices.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionaron facturas'
      });
    }

    if (invoices.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Máximo 50 facturas por vez'
      });
    }

    const uploadedInvoices = [];

    invoices.forEach(({ filename, imageBase64 }) => {
      if (!filename || !imageBase64) {
        return; // Saltar facturas inválidas
      }

      const invoiceId = invoiceIdCounter++;
      const invoice = {
        id: invoiceId,
        filename: filename,
        imageBase64: imageBase64,
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
