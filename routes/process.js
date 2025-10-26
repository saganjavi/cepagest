const express = require('express');
const router = express.Router();
const { invoicesStore } = require('./upload');
const { convertPdfToImage } = require('../services/pdfConverter');
const { extractInvoiceData } = require('../services/ocrService');

// POST /api/process - Procesar facturas seleccionadas
router.post('/', async (req, res) => {
  const { invoiceIds } = req.body;

  if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Se requiere un array de IDs de facturas'
    });
  }

  // Validar que todas las facturas existen
  const invalidIds = invoiceIds.filter(id => !invoicesStore.has(id));
  if (invalidIds.length > 0) {
    return res.status(404).json({
      success: false,
      message: `Facturas no encontradas: ${invalidIds.join(', ')}`
    });
  }

  // Configurar SSE (Server-Sent Events) para actualización en tiempo real
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Función helper para enviar eventos
  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Procesar secuencialmente
  let processedCount = 0;
  let errorCount = 0;

  for (const invoiceId of invoiceIds) {
    const invoice = invoicesStore.get(invoiceId);

    try {
      // Actualizar estado a "processing"
      invoice.status = 'processing';
      sendEvent({
        type: 'status',
        invoiceId,
        status: 'processing',
        message: `Procesando ${invoice.filename}...`
      });

      // Paso 1: Convertir PDF a imagen
      sendEvent({
        type: 'progress',
        invoiceId,
        step: 'converting',
        message: 'Convirtiendo PDF a imagen...'
      });

      const imageBase64 = await convertPdfToImage(invoice.buffer);

      // Paso 2: Extraer datos con OCR
      sendEvent({
        type: 'progress',
        invoiceId,
        step: 'ocr',
        message: 'Extrayendo datos con OCR...'
      });

      const extractedData = await extractInvoiceData(imageBase64);

      // Guardar datos procesados
      invoice.processedData = extractedData;
      invoice.status = 'completed';
      processedCount++;

      sendEvent({
        type: 'completed',
        invoiceId,
        status: 'completed',
        data: extractedData,
        message: `${invoice.filename} procesado correctamente`
      });

    } catch (error) {
      console.error(`Error procesando factura ${invoiceId}:`, error);
      invoice.status = 'error';
      invoice.processedData = {
        error: error.message
      };
      errorCount++;

      sendEvent({
        type: 'error',
        invoiceId,
        status: 'error',
        message: `Error en ${invoice.filename}: ${error.message}`
      });
    }

    // Pequeña pausa entre facturas para no saturar la API
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Enviar resumen final
  sendEvent({
    type: 'summary',
    total: invoiceIds.length,
    processed: processedCount,
    errors: errorCount,
    message: `Procesamiento completado: ${processedCount} exitosos, ${errorCount} errores`
  });

  res.end();
});

// GET /api/process/:id - Obtener resultado de procesamiento
router.get('/:id', (req, res) => {
  const invoiceId = parseInt(req.params.id);

  if (!invoicesStore.has(invoiceId)) {
    return res.status(404).json({
      success: false,
      message: 'Factura no encontrada'
    });
  }

  const invoice = invoicesStore.get(invoiceId);

  res.json({
    success: true,
    invoice: {
      id: invoice.id,
      filename: invoice.filename,
      status: invoice.status,
      processedData: invoice.processedData
    }
  });
});

module.exports = router;
