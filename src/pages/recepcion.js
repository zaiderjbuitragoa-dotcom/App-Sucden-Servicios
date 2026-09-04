// ============================================================
// recepcion.js — Sucden Colombia · Módulo de Recepción
// ============================================================

const PageRecepcion = (() => {
  let table;
  let proveedores = [], productores = [], fincas = [], bodegas = [];

  async function render(container) {
    container.innerHTML = `
      <div class="page-header">
        <div class="page-title-group">
          <h1 class="page-title">Recepción de Café</h1>
          <p class="page-subtitle">Registro de ingreso de café con trazabilidad completa</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-gold" onclick="PageRecepcion.openForm()" id="btn-nueva-recepcion">
            ➕ Nueva Recepción
          </button>
        </div>
      </div>

      <div class="filter-bar">
        <div class="search-input" style="position:relative">
          <span class="search-icon">🔍</span>
          <input type="text" class="form-control" id="search-rec" placeholder="Buscar por lote, proveedor, tipo de café..." oninput="PageRecepcion.search(this.value)">
        </div>
        <select class="form-control" style="width:180px" onchange="PageRecepcion.filterEstado(this.value)">
          <option value="">Todos los estados</option>
          <option value="ACTIVO">Activo</option>
          <option value="ANULADO">Anulado</option>
        </select>
        <button class="btn btn-outline btn-sm" onclick="PageRecepcion.loadData()">🔄</button>
      </div>

      <div id="rec-table-container">
        <div class="empty-state"><div class="spinner"></div></div>
      </div>`;

    // Modal de formulario
    document.body.insertAdjacentHTML('beforeend', buildFormModal());

    // Cargar catálogos y datos
    await loadCatalogos();
    await loadData();
    populateSelects();
  }

  function buildFormModal() {
    return `
    <div class="modal-backdrop modal-lg" id="modal-recepcion">
      <div class="modal" role="dialog" aria-modal="true" aria-label="Nueva Recepción">
        <div class="modal-header">
          <h3 class="modal-title">📥 Nueva Recepción de Café</h3>
          <button class="modal-close" onclick="Modal.close('modal-recepcion')">✕</button>
        </div>
        <div class="modal-body">
          <form id="form-recepcion" novalidate>
            <div class="section-title">Información General</div>
            <div class="form-grid form-grid-3">
              <div class="form-group">
                <label class="form-label" for="rec-fecha">Fecha <span class="required">*</span></label>
                <input type="date" id="rec-fecha" name="fecha" class="form-control" required>
              </div>
              <div class="form-group">
                <label class="form-label" for="rec-hora">Hora <span class="required">*</span></label>
                <input type="time" id="rec-hora" name="hora" class="form-control" required>
              </div>
              <div class="form-group">
                <label class="form-label" for="rec-documento">Remisión / Documento</label>
                <input type="text" id="rec-documento" name="documentoRemision" class="form-control" placeholder="Nro. de guía, remisión...">
              </div>
            </div>

            <div class="section-title mt-4">Origen del Café</div>
            <div class="form-grid form-grid-3">
              <div class="form-group">
                <label class="form-label" for="rec-proveedor">Proveedor <span class="required">*</span></label>
                <select id="rec-proveedor" name="idProveedor" class="form-control" onchange="PageRecepcion.onProveedorChange(this.value)" required>
                  <option value="">— Seleccionar proveedor —</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="rec-productor">Productor</label>
                <select id="rec-productor" name="idProductor" class="form-control" onchange="PageRecepcion.onProductorChange(this.value)">
                  <option value="">— Seleccionar productor —</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="rec-finca">Finca</label>
                <select id="rec-finca" name="idFinca" class="form-control">
                  <option value="">— Seleccionar finca —</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="rec-municipio">Municipio</label>
                <input type="text" id="rec-municipio" name="municipio" class="form-control" placeholder="Ciudad de origen">
              </div>
              <div class="form-group">
                <label class="form-label" for="rec-tipo-cafe">Tipo de Café <span class="required">*</span></label>
                <select id="rec-tipo-cafe" name="tipoCafe" class="form-control" required>
                  <option value="">— Seleccionar tipo —</option>
                  <option>CAFÉ PERGAMINO SECO</option>
                  <option>CAFÉ PERGAMINO HÚMEDO</option>
                  <option>CAFÉ EN BABA</option>
                  <option>CAFÉ VERDE (EXCELSO)</option>
                  <option>CAFÉ SUPREMO</option>
                  <option>CAFÉ UGQ</option>
                  <option>CAFÉ PASILLA</option>
                  <option>CAFÉ ESPECIAL</option>
                  <option>CAFÉ ORGÁNICO</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="rec-variedad">Variedad</label>
                <input type="text" id="rec-variedad" name="variedad" class="form-control" placeholder="Castillo, Caturra, Geisha...">
              </div>
            </div>

            <div class="section-title mt-4">Pesaje</div>
            <div class="form-grid form-grid-3">
              <div class="form-group">
                <label class="form-label" for="rec-sacos">N° de Sacos <span class="required">*</span></label>
                <input type="number" id="rec-sacos" name="sacos" class="form-control" min="1" placeholder="0" required>
              </div>
              <div class="form-group">
                <label class="form-label" for="rec-peso-bruto">Peso Bruto (kg) <span class="required">*</span></label>
                <input type="number" id="rec-peso-bruto" name="pesoBrutoKg" class="form-control" step="0.01" min="0.01" placeholder="0.00"
                  oninput="PageRecepcion.calcPesoNeto()" required>
              </div>
              <div class="form-group">
                <label class="form-label" for="rec-tara">Tara (kg) <span class="required">*</span></label>
                <input type="number" id="rec-tara" name="taraKg" class="form-control" step="0.01" min="0" placeholder="0.00"
                  oninput="PageRecepcion.calcPesoNeto()" required>
              </div>
              <div class="form-group">
                <label class="form-label">Peso Neto (kg) — Calculado</label>
                <div class="form-computed" id="rec-peso-neto">—</div>
              </div>
              <div class="form-group">
                <label class="form-label" for="rec-humedad">Humedad (%)</label>
                <input type="number" id="rec-humedad" name="humedadPct" class="form-control" step="0.1" min="0" max="100" placeholder="12.5">
              </div>
              <div class="form-group">
                <label class="form-label" for="rec-factor">Factor</label>
                <input type="number" id="rec-factor" name="factor" class="form-control" step="0.01" min="0" placeholder="Ej: 93.5">
              </div>
              <div class="form-group">
                <label class="form-label" for="rec-defectos">Defectos (%)</label>
                <input type="number" id="rec-defectos" name="defectosPct" class="form-control" step="0.1" min="0" max="100" placeholder="0.0">
              </div>
              <div class="form-group">
                <label class="form-label" for="rec-temperatura">Temperatura (°C)</label>
                <input type="number" id="rec-temperatura" name="temperatura" class="form-control" step="0.1" placeholder="22.5">
              </div>
              <div class="form-group">
                <label class="form-label" for="rec-bodega">Bodega de Ingreso</label>
                <select id="rec-bodega" name="idBodega" class="form-control">
                  <option value="">— Sin bodega asignada —</option>
                </select>
              </div>
            </div>

            <div class="section-title mt-4">Observaciones</div>
            <div class="form-group">
              <label class="form-label" for="rec-obs">Observaciones</label>
              <textarea id="rec-obs" name="observaciones" class="form-control" rows="3" placeholder="Notas adicionales, condiciones del café, alertas..."></textarea>
            </div>

            <div class="section-title mt-4">Evidencias</div>
            <div id="file-drop-zone" style="
              border: 2px dashed var(--border-default);
              border-radius: var(--r-md);
              padding: var(--sp-8);
              text-align: center;
              cursor: pointer;
              transition: all var(--tr-fast);
              color: var(--text-muted);"
              onclick="document.getElementById('rec-files').click()"
              ondragover="event.preventDefault();this.style.borderColor='var(--gold-400)'"
              ondrop="event.preventDefault();PageRecepcion.handleFiles(event.dataTransfer.files)">
              <div style="font-size:32px;margin-bottom:8px">📷</div>
              <div style="font-size:var(--text-sm)">Arrastra fotos y documentos aquí o haz clic para seleccionar</div>
              <div style="font-size:var(--text-xs);margin-top:4px">JPG, PNG, PDF, XLSX — máx. 10MB por archivo</div>
            </div>
            <input type="file" id="rec-files" multiple accept="image/*,.pdf,.xlsx,.docx" style="display:none"
              onchange="PageRecepcion.handleFiles(this.files)">
            <div id="file-preview" style="display:flex;gap:var(--sp-2);flex-wrap:wrap;margin-top:var(--sp-3)"></div>
            <input type="hidden" id="rec-pending-files" value="[]">
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="Modal.close('modal-recepcion')">Cancelar</button>
          <button class="btn btn-gold" id="btn-save-recepcion" onclick="PageRecepcion.save()">
            💾 Guardar Recepción
          </button>
        </div>
      </div>
    </div>`;
  }

  async function loadCatalogos() {
    try {
      [proveedores, productores, fincas, bodegas] = await Promise.all([
        API.get('listProveedores'),
        API.get('listProductores'),
        API.get('listFincas'),
        API.get('listBodegas'),
      ]);
    } catch(e) { console.warn('Error cargando catálogos', e.message); }
  }

  function populateSelects() {
    const selProv = document.getElementById('rec-proveedor');
    const selBod  = document.getElementById('rec-bodega');
    if (selProv) {
      selProv.innerHTML = '<option value="">— Seleccionar proveedor —</option>' +
        (proveedores || []).map(p => `<option value="${p.ID_PROVEEDOR}">${p.NOMBRE}</option>`).join('');
    }
    if (selBod) {
      selBod.innerHTML = '<option value="">— Sin bodega —</option>' +
        (bodegas || []).map(b => `<option value="${b.ID_BODEGA}">${b.NOMBRE}</option>`).join('');
    }
  }

  function onProveedorChange(idProv) {
    const sel = document.getElementById('rec-productor');
    if (!sel) return;
    const filtered = (productores || []).filter(p => !idProv || p.ID_PROVEEDOR === idProv);
    sel.innerHTML = '<option value="">— Seleccionar productor —</option>' +
      filtered.map(p => `<option value="${p.ID_PRODUCTOR}">${p.NOMBRE}</option>`).join('');
    onProductorChange('');
  }

  function onProductorChange(idProd) {
    const sel = document.getElementById('rec-finca');
    if (!sel) return;
    const filtered = (fincas || []).filter(f => !idProd || f.ID_PRODUCTOR === idProd);
    sel.innerHTML = '<option value="">— Seleccionar finca —</option>' +
      filtered.map(f => `<option value="${f.ID_FINCA}">${f.NOMBRE} — ${f.MUNICIPIO || ''}</option>`).join('');
  }

  function calcPesoNeto() {
    const bruto = parseFloat(document.getElementById('rec-peso-bruto')?.value) || 0;
    const tara  = parseFloat(document.getElementById('rec-tara')?.value) || 0;
    const neto  = Math.max(0, bruto - tara);
    const el    = document.getElementById('rec-peso-neto');
    if (el) el.textContent = neto > 0 ? Fmt.kg(neto, 2) : '—';
  }

  function handleFiles(files) {
    const preview = document.getElementById('file-preview');
    if (!preview || !files?.length) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const isImg = file.type.startsWith('image/');
        const div = document.createElement('div');
        div.style.cssText = 'position:relative;width:80px;height:80px;border-radius:var(--r-md);overflow:hidden;border:1px solid var(--border-subtle)';
        div.innerHTML = isImg
          ? `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover">`
          : `<div style="width:100%;height:100%;background:var(--bg-elevated);display:flex;align-items:center;justify-content:center;font-size:28px">📄</div>`;
        div.innerHTML += `<div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.7);padding:2px 4px;font-size:9px;color:#fff;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${file.name}</div>`;
        preview.appendChild(div);
      };
      reader.readAsDataURL(file);
    });
    // Guardar referencia para upload posterior
    window._pendingFiles = window._pendingFiles || [];
    Array.from(files).forEach(f => window._pendingFiles.push(f));
  }

  async function loadData() {
    const cont = document.getElementById('rec-table-container');
    if (!cont) return;
    try {
      const data = await API.get('listRecepciones');
      if (!table) {
        table = new DataTable({
          containerId: 'rec-table-container',
          searchFields: ['ID_RECEPCION','ID_LOTE','TIPO_CAFE','MUNICIPIO','DOCUMENTO_REMISION'],
          columns: [
            { field: 'ID_RECEPCION', label: 'ID Recepción', class: 'mono' },
            { field: 'ID_LOTE',      label: 'ID Lote',      class: 'mono',
              render: (v) => `<span style="color:var(--gold-400);cursor:pointer" onclick="Router.navigate('lotes',{id:'${v}'})">${v}</span>` },
            { field: 'FECHA',        label: 'Fecha',        render: Fmt.date },
            { field: 'HORA',         label: 'Hora' },
            { field: 'TIPO_CAFE',    label: 'Tipo' },
            { field: 'SACOS',        label: 'Sacos',        render: (v) => Fmt.number(v) },
            { field: 'PESO_NETO_KG', label: 'Kg Neto',      render: (v) => `<strong>${Fmt.kg(v, 1)}</strong>` },
            { field: 'HUMEDAD_PCT',  label: 'Humedad',      render: Fmt.pct },
            { field: 'RESPONSABLE',  label: 'Responsable',  render: (v) => Fmt.truncate(v, 20) },
            { field: 'ESTADO',       label: 'Estado',       render: Fmt.badge },
          ],
        });
      }
      table.setData(data || []);
    } catch(err) {
      if (cont) cont.innerHTML = `<div class="alert alert-danger"><span class="alert-icon">❌</span><div class="alert-content">Error al cargar: ${err.message}</div></div>`;
    }
  }

  function search(q) { table?.search(q); }
  function filterEstado(v) { table?.filter('ESTADO', v); }

  function openForm() {
    window._pendingFiles = [];
    const form = document.getElementById('form-recepcion');
    if (form) {
      form.reset();
      document.getElementById('rec-peso-neto').textContent = '—';
      document.getElementById('file-preview').innerHTML = '';
    }
    // Valores por defecto
    const f = document.getElementById('rec-fecha');
    const h = document.getElementById('rec-hora');
    if (f) f.value = Fmt.today();
    if (h) h.value = Fmt.currentTime();
    Modal.open('modal-recepcion');
  }

  async function save() {
    const form = document.getElementById('form-recepcion');
    if (!form) return;

    const data = Object.fromEntries(new FormData(form));
    // Validaciones
    const errors = [];
    if (!data.fecha)      errors.push('Fecha es obligatoria');
    if (!data.hora)       errors.push('Hora es obligatoria');
    if (!data.idProveedor) errors.push('Proveedor es obligatorio');
    if (!data.tipoCafe)   errors.push('Tipo de café es obligatorio');
    if (!data.sacos || parseFloat(data.sacos) <= 0) errors.push('Número de sacos debe ser mayor a cero');
    if (!data.pesoBrutoKg || parseFloat(data.pesoBrutoKg) <= 0) errors.push('Peso bruto debe ser mayor a cero');
    if (errors.length) { Toast.error('Datos incompletos', errors.join(' · ')); return; }

    const btn = document.getElementById('btn-save-recepcion');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Guardando...'; }

    try {
      const result = await API.post('createRecepcion', data);

      // Subir archivos pendientes
      if (window._pendingFiles?.length > 0) {
        Toast.info('Subiendo archivos...', `${window._pendingFiles.length} archivo(s)`);
        for (const file of window._pendingFiles) {
          try {
            await API.uploadFile(file, 'RECEPCION', result.idRecepcion, 'RECEPCION');
          } catch(e) { Toast.warning('Archivo no subido', file.name + ': ' + e.message); }
        }
        window._pendingFiles = [];
      }

      Modal.close('modal-recepcion');
      Toast.success('Recepción registrada', `Lote ${result.idLote} creado · ${Fmt.kg(result.pesoNeto, 1)}`);
      await loadData();
    } catch(err) {
      Toast.error('Error al guardar', err.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '💾 Guardar Recepción'; }
    }
  }

  return { render, loadData, search, filterEstado, openForm, save, calcPesoNeto, onProveedorChange, onProductorChange, handleFiles };
})();
window.PageRecepcion = PageRecepcion;
