# Cepagest - Procesamiento Inteligente de Facturas

Webapp moderna para procesar facturas en PDF mediante OCR usando GPT-4 Vision de OpenAI.

## Características

- **Carga masiva de PDFs**: Sube hasta 50 facturas simultáneamente con drag & drop
- **OCR con IA**: Extrae datos automáticamente usando GPT-4 Vision
- **Procesamiento secuencial**: Procesa facturas de forma controlada
- **Actualización en tiempo real**: Visualiza el progreso de procesamiento en vivo
- **Exportación a Excel**: Copia datos al portapapeles para pegarlos en hojas de cálculo
- **Autenticación**: Acceso protegido por contraseña
- **UI/UX moderna**: Diseño profesional y responsive

## Datos Extraídos

La aplicación extrae los siguientes campos de cada factura:

- Nombre del emisor
- CIF del emisor
- Fecha de emisión
- Importe sin IVA
- Importe con IVA
- Fecha de conformidad (firma digital)

## Requisitos

- Node.js 16 o superior
- API Key de OpenAI con acceso a GPT-4 Vision
- Cuenta de Vercel (para deployment)

## Instalación Local

1. **Clonar el repositorio**

```bash
git clone <tu-repositorio>
cd cepagest
```

2. **Instalar dependencias**

```bash
npm install
```

3. **Configurar variables de entorno**

Crea un archivo `.env` basándote en `.env.example`:

```bash
cp .env.example .env
```

Edita `.env` y configura tus credenciales:

```env
PORT=3000
PASSWORD=tu_contraseña_segura
OPENAI_API_KEY=sk-tu-api-key-de-openai
```

4. **Ejecutar en desarrollo**

```bash
npm start
```

La aplicación estará disponible en `http://localhost:3000`

## Deployment en Vercel

### Opción 1: Desde la CLI de Vercel

1. **Instalar Vercel CLI**

```bash
npm install -g vercel
```

2. **Deploy**

```bash
vercel
```

3. **Configurar variables de entorno**

En el dashboard de Vercel, ve a Settings > Environment Variables y añade:

- `PASSWORD`: Tu contraseña de acceso
- `OPENAI_API_KEY`: Tu API key de OpenAI

### Opción 2: Desde GitHub

1. Conecta tu repositorio a Vercel
2. Configura las variables de entorno en el dashboard
3. Vercel desplegará automáticamente cada push

## Uso

### 1. Login

Accede a la aplicación e ingresa la contraseña configurada.

### 2. Subir Facturas

- Arrastra archivos PDF a la zona de carga, o
- Haz clic en "Seleccionar archivos" para elegir desde tu ordenador
- Máximo 50 archivos, 10MB por archivo

### 3. Procesar Facturas

- Selecciona las facturas que deseas procesar
- Haz clic en "Procesar seleccionadas"
- El sistema procesará las facturas secuencialmente
- Verás el progreso en tiempo real

### 4. Exportar Datos

- Una vez procesadas, haz clic en "Copiar al portapapeles"
- Los datos se copian en formato TSV (compatible con Excel/Google Sheets)
- Pega directamente en tu hoja de cálculo

## Estructura del Proyecto

```
cepagest/
├── server.js              # Servidor Express
├── middleware/
│   └── auth.js           # Autenticación
├── routes/
│   ├── upload.js         # Endpoints de carga
│   └── process.js        # Endpoints de procesamiento
├── services/
│   ├── pdfConverter.js   # Conversión PDF a imagen
│   └── ocrService.js     # Integración GPT-4 Vision
├── public/
│   ├── index.html        # UI principal
│   ├── styles.css        # Estilos
│   └── app.js            # Lógica frontend
├── package.json
├── vercel.json           # Config Vercel
└── .env.example          # Variables de entorno ejemplo
```

## API Endpoints

### Autenticación

- `POST /api/login` - Iniciar sesión

### Facturas

- `GET /api/upload` - Listar facturas cargadas
- `POST /api/upload` - Subir nuevas facturas
- `DELETE /api/upload/:id` - Eliminar una factura
- `DELETE /api/upload` - Limpiar todas las facturas

### Procesamiento

- `POST /api/process` - Procesar facturas (Server-Sent Events)
- `GET /api/process/:id` - Obtener resultado de procesamiento

## Consideraciones Técnicas

### Límites de Vercel

- **Serverless Functions**: 10s (Hobby) / 60s (Pro)
- **Payload**: Máximo 4.5MB
- **Memoria**: Efímera (los datos se pierden al reiniciar)

### Almacenamiento

Los archivos y datos se almacenan **temporalmente en memoria**. No hay persistencia entre reinicios del servidor.

### Costos de API

Cada factura procesada consume tokens de GPT-4 Vision. Estima aproximadamente:
- ~1000-2000 tokens por factura procesada
- Consulta los precios en [OpenAI Pricing](https://openai.com/pricing)

## Optimización del Prompt

El prompt de OCR está en `services/ocrService.js`. Puedes ajustarlo según tus necesidades específicas de formato de facturas.

## Troubleshooting

### Error: "Solo se permiten archivos PDF"

Asegúrate de que los archivos sean PDFs válidos con mimetype `application/pdf`.

### Error: "Contraseña incorrecta"

Verifica que la variable de entorno `PASSWORD` esté configurada correctamente en Vercel.

### Error al procesar facturas

- Verifica que `OPENAI_API_KEY` sea válida
- Comprueba que tengas créditos disponibles en OpenAI
- Revisa los logs del servidor para más detalles

### Canvas/PDF.js no funciona en Vercel

Si hay problemas con las dependencias nativas, considera:
- Usar la versión legacy de PDF.js
- Configurar `includeFiles` en `vercel.json` si es necesario

## Licencia

MIT

## Soporte

Para reportar problemas o sugerencias, abre un issue en el repositorio.
