// ============================================================
// despachos.js — Sucden Colombia · Módulo de Despachos y Exportaciones
// ============================================================

const PageDespachos = (() => {
  let table;
  let lotesDisponibles = [];
  let selectedLotes = [];

  async function render(container) {
    container.innerHTML = `
      <div class="page-header">
        <div class="page-title-group">
          <h1 class="page-title">Despachos y Exportaciones</h1>
          <p class="page-subtitle">Gestión de órdenes de despacho, contenedores y documentos de exportación</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-gold" onclick="PageDespachos.openForm()">
            🚢 Nuevo Despacho
          </button>
        </div>
      </div>

      <div class="filter-bar">
        <div class="search-input" style="position:relative">
          <span class="search-icon">🔍</span>
          <input type="text" class="form-control" id="search-desp" placeholder="Buscar por cliente, país, contenedor, BL..." oninput="PageDespachos.search(this.value)">
        </div>
        <select class="form-control" style="width:180px" onchange="PageDespachos.filterEstado(this.value)">
          <option value="">Todos los estados</option>
          <option value="BORRADOR">Borrador</option>
          <option value="CONFIRMADO">Confirmado</option>
          <option value="CANCELADO">Cancelado</option>
        </select>
        <button class="btn btn-outline btn-sm" onclick="PageDespachos.loadData()">🔄 Actualizar</button>
      </div>

      <div id="despachos-table-container">
        <div class="empty-state"><div class="spinner"></div></div>
      </div>`;

    document.body.insertAdjacentHTML('beforeend', buildFormModal());
    await loadCatalogos();
    await loadData();
  }

  function buildFormModal() {
    return `
    <div class="modal-backdrop modal-xl" id="modal-despacho">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">🚢 Nuevo Despacho de Exportación</h3>
          <button class="modal-close" onclick="Modal.close('modal-despacho')">✕</button>
        </div>
        <div class="modal-body">
          <form id="form-despacho" novalidate>
            <div class="section-title">Información del Cliente y Destino</div>
            <div class="form-grid form-grid-3">
              <div class="form-group">
                <label class="form-label" for="desp-fecha">Fecha Despacho <span class="required">*</span></label>
                <input type="date" id="desp-fecha" name="fecha" class="form-control" required>
              </div>
              <div class="form-group">
                <label class="form-label" for="desp-cliente">Cliente Comprador <span class="required">*</span></label>
                <input type="text" id="desp-cliente" name="cliente" class="form-control" placeholder="Sucden Geneva / Starbucks..." required>
              </div>
              <div class="form-group">
                <label class="form-label" for="desp-pais">País Destino <span class="required">*</span></label>
                <input type="text" id="desp-pais" name="paisDestino" class="form-control" placeholder="Estados Unidos, Alemania..." required>
              </div>
              <div class="form-group">
                <label class="form-label" for="desp-ciudad">Ciudad Destino / Puerto</label>
                <input type="text" id="desp-ciudad" name="ciudadDestino" class="form-control" placeholder="Puerto de Rotterdam, Hamburg...">
              </div>
            </div>

            <div class="section-title mt-4">Datos Logísticos y Marítimos</div>
            <div class="form-grid form-grid-3">
              <div class="form-group">
                <label class="form-label" for="desp-transp">Empresa Transportadora</label>
                <input type="text" id="desp-transp" name="transportadora" class="form-control" placeholder="Transportes del Café S.A.">
              </div>
              <div class="form-group">
                <label class="form-label" for="desp-placa">Placa Vehículo / Conductor</label>
                <input type="text" id="desp-placa" name="placa" class="form-control" placeholder="AAA-123 (Juan Pérez)">
              </div>
              <div class="form-group">
                <label class="form-label" for="desp-contenedor">N° Contenedor</label>
                <input type="text" id="desp-contenedor" name="contenedor" class="form-control" placeholder="MSCU1234567">
              </div>
              <div class="form-group">
                <label class="form-label" for="desp-booking">Booking / Reserva</label>
                <input type="text" id="desp-booking" name="booking" class="form-control" placeholder="BKG-998877">
              </div>
              <div class="form-group">
                <label class="form-label" for="desp-bl">Bill of Lading (BL)</label>
                <input type="text" id="desp-bl" name="bl" class="form-control" placeholder="MEDU123456">
              </div>
              <div class="form-group">
                <label class="form-label" for="desp-factura">N° Factura Exportación</label>
                <input type="text" id="desp-factura" name="factura" class="form-control" placeholder="EXP-2026-042">
              </div>
            </div>

            <div class="section-title mt-4">Lotes Aprobados Incluidos en el Despacho</div>
            <div style="display:flex;gap:var(--sp-2);margin-bottom:var(--sp-3)">
              <select id="desp-select-lote" class="form-control" style="flex:1">
                <option value="">— Seleccionar Lote Aprobado —</option>
              </select>
              <input type="number" id="desp-kg-lote" class="form-control" style="width:130px" placeholder="Kg a despachar" step="0.1" min="0.1">
              <input type="number" id="desp-sacos-lote" class="form-control" style="width:110px" placeholder="N° Sacos" step="1" min="1">
              <button type="button" class="btn btn-outline" onclick="PageDespachos.addLoteToDespacho()">➕ Agregar Lote</button>
            </div>

            <div class="table-container mb-4">
              <table class="table" id="table-desp-lotes">
                <thead><tr><th>ID Lote</th><th>Tipo Café</th><th>Kg Despachados</th><th>Sacos</th><th>Acción</th></tr></thead>
                <tbody id="tbody-desp-lotes">
                  <tr><td colspan="5" style="text-align:center;color:var(--text-muted)">No hay lotes agregados al despacho</td></tr>
                </tbody>
              </table>
            </div>

            <div class="form-group">
              <label class="form-label" for="desp-obs">Observaciones</label>
              <textarea id="desp-obs" name="observaciones" class="form-control" rows="2" placeholder="Instrucciones especiales de embarque..."></textarea>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="Modal.close('modal-despacho')">Cancelar</button>
          <button class="btn btn-gold" id="btn-save-despacho" onclick="PageDespachos.save()">💾 Guardar Despacho (Borrador)</button>
        </div>
      </div>
    </div>`;
  }

  async function loadCatalogos() {
    try {
      const data = await API.get('inventario');
      lotesDisponibles = (data || []).filter(item => item.STOCK_KG > 0 && ['APROBADO','PROCESADO','EMPACADO'].includes(item.ESTADO));
      const sel = document.getElementById('desp-select-lote');
      if (sel) {
        sel.innerHTML = '<option value="">— Seleccionar Lote Aprobado —</option>' +
          lotesDisponibles.map(item => `<option value="${item.ID_LOTE}">${item.ID_LOTE} — ${item.TIPO_CAFE} (Stock: ${Fmt.kg(item.STOCK_KG,1)})</option>`).join('');
      }
    } catch(e) { console.warn(e); }
  }

  async function loadData() {
    const cont = document.getElementById('despachos-table-container');
    if (!cont) return;
    try {
      const data = await API.get('listDespachos');
      if (!table) {
        table = new DataTable({
          containerId: 'despachos-table-container',
          searchFields: ['ID_DESPACHO','CLIENTE','PAIS_DESTINO','CONTENEDOR','BL','FACTURA'],
          columns: [
            { field: 'ID_DESPACHO',    label: 'ID Despacho', class: 'mono' },
            { field: 'FECHA',          label: 'Fecha',       render: Fmt.date },
            { field: 'CLIENTE',        label: 'Cliente',     render: (v) => Fmt.truncate(v, 20) },
            { field: 'PAIS_DESTINO',   label: 'Destino' },
            { field: 'CANTIDAD_SACOS', label: 'Sacos',       render: (v) => Fmt.number(v) },
            { field: 'KG_TOTAL',       label: 'Kg Total',    render: (v) => `<strong>${Fmt.kg(v, 0)}</strong>` },
            { field: 'CONTENEDOR',     label: 'Contenedor',  render: (v) => v || '—' },
            { field: 'ESTADO',         label: 'Estado',      render: Fmt.badge },
            { field: 'ID_DESPACHO',    label: 'Acciones',    sortable: false,
              render: (v, r) => r.ESTADO === 'BORRADOR'
                ? `<button class="btn btn-success btn-sm" onclick="PageDespachos.confirmDespacho('${v}')">✅ Confirmar Salida</button>`
                : `<span class="fs-xs text-muted">Confirmado</span>` },
          ],
        });
      }
      table.setData(data || []);
    } catch(err) {
      if (cont) cont.innerHTML = `<div class="alert alert-danger">❌ ${err.message}</div>`;
    }
  }

  function openForm() {
    selectedLotes = [];
    const form = document.getElementById('form-despacho');
    if (form) form.reset();
    document.getElementById('desp-fecha').value = Fmt.today();
    renderDespLotesTable();
    Modal.open('modal-despacho');
  }

  function addLoteToDespacho() {
    const sel = document.getElementById('desp-select-lote');
    const kgInput = document.getElementById('desp-kg-lote');
    const sacosInput = document.getElementById('desp-sacos-lote');
    if (!sel || !sel.value) return Toast.warning('Atención', 'Seleccione un lote');

    const idLote = sel.value;
    const kg = parseFloat(kgInput.value);
    const sacos = parseInt(sacosInput.value) || 1;
    if (isNaN(kg) || kg <= 0) return Toast.warning('Atención', 'Ingrese kg válidos');

    if (selectedLotes.some(l => l.idLote === idLote)) return Toast.warning('Atención', 'El lote ya está en el despacho');

    const item = lotesDisponibles.find(l => l.ID_LOTE === idLote);
    selectedLotes.push({ idLote, producto: item?.TIPO_CAFE || '', kg, sacos });
    sel.value = ''; kgInput.value = ''; sacosInput.value = '';
    renderDespLotesTable();
  }

  function removeLoteFromDespacho(idx) {
    selectedLotes.splice(idx, 1);
    renderDespLotesTable();
  }

  function renderDespLotesTable() {
    const tbody = document.getElementById('tbody-desp-lotes');
    if (!tbody) return;
    if (selectedLotes.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">No hay lotes agregados</td></tr>';
      return;
    }
    tbody.innerHTML = selectedLotes.map((l, idx) => `
      <tr>
        <td class="mono">${l.idLote}</td>
        <td>${l.producto}</td>
        <td><strong>${Fmt.kg(l.kg, 1)}</strong></td>
        <td>${l.sacos}</td>
        <td><button class="btn btn-danger btn-sm" onclick="PageDespachos.removeLoteFromDespacho(${idx})">🗑️</button></td>
      </tr>`).join('');
  }

  async function save() {
    const form = document.getElementById('form-despacho');
    if (!form) return;
    const data = Object.fromEntries(new FormData(form));

    if (!data.fecha || !data.cliente || !data.paisDestino) {
      return Toast.error('Error', 'Complete los campos obligatorios');
    }
    if (selectedLotes.length === 0) {
      return Toast.error('Error', 'Agregue al menos un lote al despacho');
    }

    data.lotes = selectedLotes;
    const btn = document.getElementById('btn-save-despacho');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Guardando...'; }

    try {
      const res = await API.post('createDespacho', data);
      Modal.close('modal-despacho');
      Toast.success('Despacho Creado', `ID: ${res.id} · ${Fmt.kg(res.kgTotal, 0)} total`);
      await loadData();
    } catch(err) {
      Toast.error('Error al crear despacho', err.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '💾 Guardar Despacho (Borrador)'; }
    }
  }

  function confirmDespacho(idDespacho) {
    Modal.confirm({
      title: 'Confirmar Salida de Despacho',
      message: `¿Está seguro de confirmar el despacho ${idDespacho}? Esto descontará definitivamente las cantidades del inventario y marcará los lotes como DESPACHADOS.`,
      confirmText: 'Sí, Confirmar Despacho',
      type: 'primary',
      onConfirm: async () => {
        try {
          await API.post('confirmDespacho', { idDespacho });
          Toast.success('Despacho Confirmado', `Se generaron los movimientos de salida para ${idDespacho}`);
          loadData();
        } catch(err) {
          Toast.error('Error al confirmar', err.message);
        }
      }
    });
  }

  function search(q) { table?.search(q); }
  function filterEstado(v) { table?.filter('ESTADO', v); }

  return { render, loadData, openForm, addLoteToDespacho, removeLoteFromDespacho, save, confirmDespacho, search, filterEstado };
})();
