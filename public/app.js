// Estado de la aplicación
const state = {
  token: localStorage.getItem('authToken') || null,
  invoices: [],
  selectedInvoices: new Set()
};

// Elementos del DOM
const elements = {
  loginScreen: document.getElementById('loginScreen'),
  appScreen: document.getElementById('appScreen'),
  loginForm: document.getElementById('loginForm'),
  loginError: document.getElementById('loginError'),
  logoutBtn: document.getElementById('logoutBtn'),

  dropZone: document.getElementById('dropZone'),
  fileInput: document.getElementById('fileInput'),
  selectFilesBtn: document.getElementById('selectFilesBtn'),
  uploadProgress: document.getElementById('uploadProgress'),
  progressBarFill: document.getElementById('progressBarFill'),
  uploadStatus: document.getElementById('uploadStatus'),

  invoiceCount: document.getElementById('invoiceCount'),
  selectAllCheckbox: document.getElementById('selectAllCheckbox'),
  selectAllBtn: document.getElementById('selectAllBtn'),
  processBtn: document.getElementById('processBtn'),
  copyBtn: document.getElementById('copyBtn'),
  invoicesTableBody: document.getElementById('invoicesTableBody'),

  toast: document.getElementById('toast')
};

// ========== UTILIDADES ==========

function showToast(message, type = 'info') {
  elements.toast.textContent = message;
  elements.toast.className = `toast ${type}`;
  elements.toast.classList.add('show');

  setTimeout(() => {
    elements.toast.classList.remove('show');
  }, 3000);
}

function showLoginError(message) {
  elements.loginError.textContent = message;
  elements.loginError.style.display = 'block';
}

function hideLoginError() {
  elements.loginError.style.display = 'none';
}

function switchScreen(screen) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  screen.classList.add('active');
}

function formatCurrency(value) {
  if (value === 'N/A' || value === 'ERROR') return value;
  const num = parseFloat(value);
  return isNaN(num) ? value : `${num.toFixed(2)} €`;
}

// ========== AUTENTICACIÓN ==========

async function login(password) {
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });

    const data = await response.json();

    if (data.success) {
      state.token = password;
      localStorage.setItem('authToken', password);
      switchScreen(elements.appScreen);
      loadInvoices();
    } else {
      showLoginError(data.message || 'Contraseña incorrecta');
    }
  } catch (error) {
    showLoginError('Error de conexión');
    console.error('Login error:', error);
  }
}

function logout() {
  state.token = null;
  state.invoices = [];
  state.selectedInvoices.clear();
  localStorage.removeItem('authToken');
  switchScreen(elements.loginScreen);
  hideLoginError();
}

function checkAuth() {
  if (state.token) {
    switchScreen(elements.appScreen);
    loadInvoices();
  }
}

// ========== CARGA DE ARCHIVOS ==========

async function uploadFiles(files) {
  if (!files || files.length === 0) return;

  const formData = new FormData();
  Array.from(files).forEach(file => {
    formData.append('pdfs', file);
  });

  // Mostrar progress
  elements.uploadProgress.style.display = 'block';
  elements.progressBarFill.style.width = '0%';
  elements.uploadStatus.textContent = 'Subiendo archivos...';

  try {
    // Simular progreso
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += 10;
      if (progress <= 90) {
        elements.progressBarFill.style.width = `${progress}%`;
      }
    }, 100);

    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${state.token}`
      },
      body: formData
    });

    clearInterval(progressInterval);
    elements.progressBarFill.style.width = '100%';

    const data = await response.json();

    if (data.success) {
      elements.uploadStatus.textContent = data.message;
      showToast(data.message, 'success');

      setTimeout(() => {
        elements.uploadProgress.style.display = 'none';
        loadInvoices();
      }, 1000);
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    elements.uploadProgress.style.display = 'none';
    showToast('Error al subir archivos', 'error');
    console.error('Upload error:', error);
  }
}

// ========== GESTIÓN DE FACTURAS ==========

async function loadInvoices() {
  try {
    const response = await fetch('/api/upload', {
      headers: {
        'Authorization': `Bearer ${state.token}`
      }
    });

    const data = await response.json();

    if (data.success) {
      state.invoices = data.invoices;
      renderInvoices();
      updateUI();
    }
  } catch (error) {
    console.error('Error loading invoices:', error);
    showToast('Error al cargar facturas', 'error');
  }
}

function renderInvoices() {
  if (state.invoices.length === 0) {
    elements.invoicesTableBody.innerHTML = `
      <tr class="empty-state">
        <td colspan="9">
          <div class="empty-message">
            <p>No hay facturas cargadas</p>
            <p class="empty-hint">Sube archivos PDF para comenzar</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  elements.invoicesTableBody.innerHTML = state.invoices.map(invoice => {
    const data = invoice.processedData || {};
    const isSelected = state.selectedInvoices.has(invoice.id);

    return `
      <tr data-invoice-id="${invoice.id}">
        <td class="col-checkbox">
          <input
            type="checkbox"
            class="invoice-checkbox"
            data-id="${invoice.id}"
            ${isSelected ? 'checked' : ''}
          >
        </td>
        <td class="col-filename">${invoice.filename}</td>
        <td class="col-emisor">${data.nombreEmisor || '-'}</td>
        <td class="col-cif">${data.cifEmisor || '-'}</td>
        <td class="col-fecha">${data.fechaEmision || '-'}</td>
        <td class="col-importe">${data.importeSinIva ? formatCurrency(data.importeSinIva) : '-'}</td>
        <td class="col-importe">${data.importeConIva ? formatCurrency(data.importeConIva) : '-'}</td>
        <td class="col-fecha">${data.fechaConformidad || '-'}</td>
        <td class="col-status">${renderStatus(invoice.status)}</td>
      </tr>
    `;
  }).join('');

  // Añadir event listeners a los checkboxes
  document.querySelectorAll('.invoice-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', handleCheckboxChange);
  });
}

function renderStatus(status) {
  const icons = {
    pending: '○',
    processing: '<span class="spinner"></span>',
    completed: '✓',
    error: '⚠'
  };

  const labels = {
    pending: 'Pendiente',
    processing: 'Procesando',
    completed: 'Completado',
    error: 'Error'
  };

  return `
    <span class="status-badge ${status}">
      <span class="status-icon">${icons[status] || icons.pending}</span>
      ${labels[status] || labels.pending}
    </span>
  `;
}

function handleCheckboxChange(e) {
  const invoiceId = parseInt(e.target.dataset.id);

  if (e.target.checked) {
    state.selectedInvoices.add(invoiceId);
  } else {
    state.selectedInvoices.delete(invoiceId);
  }

  updateUI();
}

function selectAll() {
  state.selectedInvoices.clear();
  state.invoices.forEach(invoice => {
    state.selectedInvoices.add(invoice.id);
  });
  renderInvoices();
  updateUI();
}

function updateUI() {
  // Actualizar contador
  elements.invoiceCount.textContent = state.invoices.length;

  // Habilitar/deshabilitar botones
  const hasInvoices = state.invoices.length > 0;
  const hasSelection = state.selectedInvoices.size > 0;
  const hasCompletedData = state.invoices.some(inv => inv.processedData);

  elements.selectAllBtn.disabled = !hasInvoices;
  elements.processBtn.disabled = !hasSelection;
  elements.copyBtn.disabled = !hasCompletedData;

  // Actualizar checkbox "seleccionar todas"
  elements.selectAllCheckbox.checked = hasInvoices && state.selectedInvoices.size === state.invoices.length;
}

// ========== PROCESAMIENTO ==========

async function processSelectedInvoices() {
  const selectedIds = Array.from(state.selectedInvoices);

  if (selectedIds.length === 0) {
    showToast('Selecciona al menos una factura', 'error');
    return;
  }

  elements.processBtn.disabled = true;
  elements.processBtn.innerHTML = '<span class="spinner"></span> Procesando...';

  try {
    const response = await fetch('/api/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify({ invoiceIds: selectedIds })
    });

    // Leer eventos SSE
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const eventData = JSON.parse(line.slice(6));
          handleProcessEvent(eventData);
        }
      }
    }

  } catch (error) {
    console.error('Processing error:', error);
    showToast('Error al procesar facturas', 'error');
  } finally {
    elements.processBtn.disabled = false;
    elements.processBtn.innerHTML = 'Procesar seleccionadas';
    loadInvoices(); // Recargar para asegurar sincronización
  }
}

function handleProcessEvent(event) {
  const { type, invoiceId, status, data, message } = event;

  // Actualizar invoice en el estado
  if (invoiceId) {
    const invoice = state.invoices.find(inv => inv.id === invoiceId);
    if (invoice) {
      invoice.status = status;
      if (data) {
        invoice.processedData = data;
      }
    }
  }

  // Actualizar UI
  renderInvoices();
  updateUI();

  // Mostrar mensaje para eventos importantes
  if (type === 'completed') {
    showToast(message, 'success');
  } else if (type === 'error') {
    showToast(message, 'error');
  } else if (type === 'summary') {
    showToast(message, 'success');
  }
}

// ========== COPIAR AL PORTAPAPELES ==========

function copyToClipboard() {
  const completedInvoices = state.invoices.filter(inv =>
    inv.processedData && inv.status === 'completed'
  );

  if (completedInvoices.length === 0) {
    showToast('No hay datos para copiar', 'error');
    return;
  }

  // Crear formato TSV (Tab-Separated Values)
  const headers = [
    'Nombre archivo',
    'Emisor',
    'CIF',
    'Fecha emisión',
    'Sin IVA',
    'Con IVA',
    'Fecha conformidad'
  ];

  const rows = completedInvoices.map(invoice => {
    const data = invoice.processedData;
    return [
      invoice.filename,
      data.nombreEmisor || '',
      data.cifEmisor || '',
      data.fechaEmision || '',
      data.importeSinIva || '',
      data.importeConIva || '',
      data.fechaConformidad || ''
    ];
  });

  const tsvContent = [
    headers.join('\t'),
    ...rows.map(row => row.join('\t'))
  ].join('\n');

  // Copiar al portapapeles
  navigator.clipboard.writeText(tsvContent)
    .then(() => {
      showToast(`${completedInvoices.length} factura(s) copiadas al portapapeles`, 'success');
    })
    .catch(err => {
      console.error('Error copying to clipboard:', err);
      showToast('Error al copiar', 'error');
    });
}

// ========== EVENT LISTENERS ==========

// Login
elements.loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const password = document.getElementById('password').value;
  login(password);
});

// Logout
elements.logoutBtn.addEventListener('click', logout);

// File upload - Botón
elements.selectFilesBtn.addEventListener('click', () => {
  elements.fileInput.click();
});

elements.fileInput.addEventListener('change', (e) => {
  uploadFiles(e.target.files);
  e.target.value = ''; // Reset input
});

// File upload - Drag & Drop
elements.dropZone.addEventListener('click', () => {
  elements.fileInput.click();
});

elements.dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  elements.dropZone.classList.add('drag-over');
});

elements.dropZone.addEventListener('dragleave', () => {
  elements.dropZone.classList.remove('drag-over');
});

elements.dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  elements.dropZone.classList.remove('drag-over');

  const files = Array.from(e.dataTransfer.files).filter(
    file => file.type === 'application/pdf'
  );

  if (files.length > 0) {
    uploadFiles(files);
  } else {
    showToast('Solo se permiten archivos PDF', 'error');
  }
});

// Select all
elements.selectAllCheckbox.addEventListener('change', (e) => {
  if (e.target.checked) {
    selectAll();
  } else {
    state.selectedInvoices.clear();
    renderInvoices();
    updateUI();
  }
});

elements.selectAllBtn.addEventListener('click', selectAll);

// Process
elements.processBtn.addEventListener('click', processSelectedInvoices);

// Copy
elements.copyBtn.addEventListener('click', copyToClipboard);

// ========== INICIALIZACIÓN ==========

checkAuth();
