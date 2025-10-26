const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Extrae información de una factura usando GPT-4 Vision
 * @param {string} imageBase64 - Imagen en formato base64
 * @returns {Promise<Object>} - Datos extraídos de la factura
 */
async function extractInvoiceData(imageBase64) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Eres un experto en procesamiento de facturas. Analiza esta imagen de factura y extrae EXACTAMENTE los siguientes campos en formato JSON:

{
  "nombreEmisor": "Nombre completo del emisor de la factura",
  "cifEmisor": "CIF del emisor (formato español: letra + 8 dígitos)",
  "fechaEmision": "Fecha de emisión (formato DD/MM/YYYY)",
  "importeSinIva": "Importe sin IVA (solo número, sin símbolo €)",
  "importeConIva": "Importe total con IVA (solo número, sin símbolo €)",
  "fechaConformidad": "Fecha de conformidad o firma digital (formato DD/MM/YYYY)"
}

INSTRUCCIONES IMPORTANTES:
- Si algún campo no está presente o no es legible, usa el valor "N/A"
- Para los importes, usa punto como separador decimal (ej: 1234.56)
- Las fechas deben estar en formato DD/MM/YYYY
- Responde ÚNICAMENTE con el objeto JSON, sin texto adicional
- Asegúrate de que el JSON sea válido y pueda parsearse`
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

    // Intentar parsear la respuesta JSON
    let jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No se pudo extraer JSON de la respuesta');
    }

    const extractedData = JSON.parse(jsonMatch[0]);

    // Validar que tenga todos los campos esperados
    const requiredFields = [
      'nombreEmisor',
      'cifEmisor',
      'fechaEmision',
      'importeSinIva',
      'importeConIva',
      'fechaConformidad'
    ];

    const missingFields = requiredFields.filter(field => !(field in extractedData));
    if (missingFields.length > 0) {
      console.warn('Campos faltantes:', missingFields);
      // Rellenar campos faltantes con N/A
      missingFields.forEach(field => {
        extractedData[field] = 'N/A';
      });
    }

    return extractedData;
  } catch (error) {
    console.error('Error en OCR:', error);

    // Retornar estructura con errores
    return {
      nombreEmisor: 'ERROR',
      cifEmisor: 'ERROR',
      fechaEmision: 'ERROR',
      importeSinIva: 'ERROR',
      importeConIva: 'ERROR',
      fechaConformidad: 'ERROR',
      error: error.message
    };
  }
}

module.exports = {
  extractInvoiceData
};
