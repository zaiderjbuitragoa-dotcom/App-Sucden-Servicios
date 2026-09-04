// ============================================================
// empaque.js — Sucden Colombia · Módulo de Empaque
// ============================================================

const PageEmpaque = (() => {
  let table;
  let lotesProcesados = [], bodegas = [];

  async function render(container) {
    container.innerHTML = `
      <div class="page-header">
        <div class="page-title-group">
          <h1 class="page-title">Empaque de Producto Terminado</h1>
          <p class="page-subtitle">Empacado de café procesado en sacos/presentaciones para despacho</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-gold" onclick="PageEmpaque.openForm()">
            📦 Registrar Empaque
          </button>
        </div>
      </div>

      <div class="filter-bar">
        <div class="search-input" style="position:relative">
          <span class="search-icon">🔍</span>
          <input type="text" class="form-control" id="search-emp" placeholder="Buscar por empacado, lote, presentación..." oninput="PageEmpaque.search(this.value)">
        </div>
        <button class="btn btn-outline btn-sm" onclick="PageEmpaque.loadData()">🔄 Actualizar</button>
      </div>

      <div id="empaque-table-container">
        <div class="empty-state"><div class="spinner"></div></div>
      </div>`;

    document.body.insertAdjacentHTML('beforeend', buildFormModal());
    await loadCatalogos();
    await loadData();
  }

  function buildFormModal() {
    return `
    <div class="modal-backdrop modal-lg" id="modal-empaque">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">📦 Registrar Empaque</h3>
          <button class="modal-close" onclick="Modal.close('modal-empaque')">✕</button>
        </div>
        <div class="modal-body">
          <form id="form-empaque" novalidate>
            <div class="section-title">Lote y Presentación</div>
            <div class="form-grid form-grid-3">
              <div class="form-group">
                <label class="form-label" for="emp-lote">Lote <span class="required">*</span></label>
                <select id="emp-lote" name="idLote" class="form-control" required>
                  <option value="">— Seleccionar Lote —</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="emp-fecha">Fecha Empaque <span class="required">*</span></label>
                <input type="date" id="emp-fecha" name="fecha" class="form-control" required>
              </div>
              <div class="form-group">
                <label class="form-label" for="emp-producto">Producto Terminado <span class="required">*</span></label>
                <input type="text" id="emp-producto" name="producto" class="form-control" placeholder="CAFÉ EXCELSO MARCA X" required>
              </div>
            </div>

            <div class="form-grid form-grid-3 mt-4">
              <div class="form-group">
                <label class="form-label" for="emp-presentacion">Presentación <span class="required">*</span></label>
                <select id="emp-presentacion" name="presentacion" class="form-control" required onchange="PageEmpaque.onPresentacionChange(this.value)">
                  <option value="Saco Fique 70kg">Saco Fique 70kg</option>
                  <option value="Saco Fique 60kg">Saco Fique 60kg</option>
                  <option value="Big Bag 1000kg">Big Bag 1000kg</option>
                  <option value="GrainPro 35kg">GrainPro 35kg</option>
                  <option value="Personalizada">Personalizada...</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="emp-peso-unit">Peso Unitario (kg) <span class="required">*</span></label>
                <input type="number" id="emp-peso-unit" name="pesoUnitarioKg" class="form-control" step="0.1" value="70" required oninput="PageEmpaque.calcPesoTotal()">
              </div>
              <div class="form-group">
                <label class="form-label" for="emp-sacos">Cantidad de Sacos/Unidades <span class="required">*</span></label>
                <input type="number" id="emp-sacos" name="cantidadSacos" class="form-control" step="1" min="1" placeholder="100" required oninput="PageEmpaque.calcPesoTotal()">
              </div>
              <div class="form-group">
                <label class="form-label">Peso Total Empacado (kg)</label>
                <div class="form-computed" id="emp-peso-total">—</div>
              </div>
              <div class="form-group">
                <label class="form-label" for="emp-bodega">Bodega Destino</label>
                <select id="emp-bodega" name="idBodega" class="form-control">
                  <option value="">— Seleccionar Bodega —</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="emp-pallet">Identificador de Pallet/Estiba</label>
                <input type="text" id="emp-pallet" name="pallet" class="form-control" placeholder="PAL-001">
              </div>
            </div>

            <div class="form-group mt-4">
              <label class="form-label" for="emp-obs">Observaciones</label>
              <textarea id="emp-obs" name="observaciones" class="form-control" rows="2" placeholder="Marcaciones especiales, lote cliente..."></textarea>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="Modal.close('modal-empaque')">Cancelar</button>
          <button class="btn btn-gold" id="btn-save-empaque" onclick="PageEmpaque.save()">💾 Guardar Empaque</button>
        </div>
      </div>
    </div>`;
  }

  async function loadCatalogos() {
    try {
      const [l, b] = await Promise.all([API.get('listLotes'), API.get('listBodegas')]);
      lotesProcesados = (l || []).filter(item => ['APROBADO','PROCESADO'].includes(item.ESTADO));
      bodegas = b || [];

      const selL = document.getElementById('emp-lote');
      if (selL) selL.innerHTML = '<option value="">— Seleccionar Lote —</option>' + lotesProcesados.map(item => `<option value="${item.ID_LOTE}">${item.ID_LOTE} — ${item.TIPO_CAFE}</option>`).join('');

      const selB = document.getElementById('emp-bodega');
      if (selB) selB.innerHTML = '<option value="">— Seleccionar Bodega —</option>' + bodegas.map(item => `<option value="${item.ID_BODEGA}">${item.NOMBRE}</option>`).join('');
    } catch(e) { console.warn(e); }
  }

  async function loadData() {
    const cont = document.getElementById('empaque-table-container');
    if (!cont) return;
    try {
      const data = await API.get('listEmpaques');
      if (!table) {
        table = new DataTable({
          containerId: 'empaque-table-container',
          searchFields: ['ID_EMPAQUE','ID_LOTE','PRODUCTO','PRESENTACION'],
          columns: [
            { field: 'ID_EMPAQUE',      label: 'ID Empaque',  class: 'mono' },
            { field: 'FECHA',           label: 'Fecha',       render: Fmt.date },
            { field: 'ID_LOTE',         label: 'Lote',        class: 'mono', render: (v) => `<span style="color:var(--gold-400);cursor:pointer" onclick="Router.navigate('lotes',{id:'${v}'})">${v}</span>` },
            { field: 'PRODUCTO',        label: 'Producto',    render: (v) => Fmt.truncate(v, 20) },
            { field: 'PRESENTACION',    label: 'Presentación' },
            { field: 'CANTIDAD_SACOS',  label: 'Sacos',       render: (v) => Fmt.number(v) },
            { field: 'PESO_TOTAL_KG',   label: 'Peso Total',  render: (v) => `<strong>${Fmt.kg(v, 1)}</strong>` },
            { field: 'RESPONSABLE',     label: 'Responsable', render: (v) => Fmt.truncate(v, 18) },
          ],
        });
      }
      table.setData(data || []);
    } catch(err) {
      if (cont) cont.innerHTML = `<div class="alert alert-danger">❌ ${err.message}</div>`;
    }
  }

  function onPresentacionChange(val) {
    const unitInput = document.getElementById('emp-peso-unit');
    if (!unitInput) return;
    if (val.includes('70kg')) unitInput.value = 70;
    else if (val.includes('60kg')) unitInput.value = 60;
    else if (val.includes('1000kg')) unitInput.value = 1000;
    else if (val.includes('35kg')) unitInput.value = 35;
    calcPesoTotal();
  }

  function calcPesoTotal() {
    const sacos = parseFloat(document.getElementById('emp-sacos')?.value) || 0;
    const unit  = parseFloat(document.getElementById('emp-peso-unit')?.value) || 0;
    const total = sacos * unit;
    const el = document.getElementById('emp-peso-total');
    if (el) el.textContent = total > 0 ? Fmt.kg(total, 1) : '—';
  }

  function openForm() {
    const form = document.getElementById('form-empaque');
    if (form) form.reset();
    document.getElementById('emp-fecha').value = Fmt.today();
    document.getElementById('emp-peso-total').textContent = '—';
    Modal.open('modal-empaque');
  }

  async function save() {
    const form = document.getElementById('form-empaque');
    if (!form) return;
    const data = Object.fromEntries(new FormData(form));

    if (!data.idLote || !data.fecha || !data.producto || !data.presentacion || !data.cantidadSacos || !data.pesoUnitarioKg) {
      return Toast.error('Error', 'Complete los campos obligatorios');
    }

    const btn = document.getElementById('btn-save-empaque');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Guardando...'; }

    try {
      const res = await API.post('createEmpaque', data);
      Modal.close('modal-empaque');
      Toast.success('Empaque Registrado', `${res.cantidadSacos} sacos (${Fmt.kg(res.pesoTotal, 1)})`);
      await loadData();
    } catch(err) {
      Toast.error('Error al guardar', err.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '💾 Guardar Empaque'; }
    }
  }

  function search(q) { table?.search(q); }

  return { render, loadData, onPresentacionChange, calcPesoTotal, openForm, save, search };
})();
window.PageEmpaque = PageEmpaque;
