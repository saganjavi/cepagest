const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
const { createCanvas } = require('canvas');

// Configurar PDF.js para Node.js
if (typeof window === 'undefined') {
  const NodeCanvasFactory = class {
    create(width, height) {
      const canvas = createCanvas(width, height);
      return {
        canvas,
        context: canvas.getContext('2d')
      };
    }
    reset(canvasAndContext, width, height) {
      canvasAndContext.canvas.width = width;
      canvasAndContext.canvas.height = height;
    }
    destroy(canvasAndContext) {
      canvasAndContext.canvas.width = 0;
      canvasAndContext.canvas.height = 0;
    }
  };

  pdfjsLib.GlobalWorkerOptions.workerSrc = require('pdfjs-dist/legacy/build/pdf.worker.js');
}

/**
 * Convierte la primera página de un PDF a imagen base64
 * @param {Buffer} pdfBuffer - Buffer del archivo PDF
 * @returns {Promise<string>} - Imagen en formato base64
 */
async function convertPdfToImage(pdfBuffer) {
  try {
    // Cargar el PDF
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(pdfBuffer),
      useSystemFonts: true
    });

    const pdf = await loadingTask.promise;

    // Obtener la primera página
    const page = await pdf.getPage(1);

    // Configurar escala para mejor calidad
    const scale = 2.0;
    const viewport = page.getViewport({ scale });

    // Crear canvas
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d');

    // Renderizar la página
    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;

    // Convertir a base64
    const imageBase64 = canvas.toDataURL('image/png');

    return imageBase64;
  } catch (error) {
    console.error('Error convirtiendo PDF a imagen:', error);
    throw new Error('No se pudo convertir el PDF a imagen');
  }
}

module.exports = {
  convertPdfToImage
};
