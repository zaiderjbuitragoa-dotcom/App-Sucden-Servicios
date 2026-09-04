// ============================================================
// inventario.js — Sucden Colombia · Módulo de Inventario
// ============================================================

const PageInventario = (() => {
  let tableStock, tableMovs;
  let currentTab = 'stock';

  async function render(container) {
    container.innerHTML = `
      <div class="page-header">
        <div class="page-title-group">
          <h1 class="page-title">Inventario y Bodegas</h1>
          <p class="page-subtitle">Control de existencias por lote y kardex de movimientos</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-outline" onclick="PageInventario.openAjusteForm()">
            ⚖️ Registrar Ajuste de Inventario
          </button>
        </div>
      </div>

      <div style="display:flex;gap:var(--sp-2);margin-bottom:var(--sp-4);border-bottom:1px solid var(--border-subtle);padding-bottom:var(--sp-2)">
        <button class="btn ${currentTab === 'stock' ? 'btn-primary' : 'btn-outline'} btn-sm" onclick="PageInventario.switchTab('stock')">📦 Stock Actual por Lote</button>
        <button class="btn ${currentTab === 'movs' ? 'btn-primary' : 'btn-outline'} btn-sm" onclick="PageInventario.switchTab('movs')">📜 Kardex / Movimientos</button>
      </div>

      <div id="tab-stock-view">
        <div class="filter-bar">
          <div class="search-input" style="position:relative">
            <span class="search-icon">🔍</span>
            <input type="text" class="form-control" placeholder="Buscar por lote, tipo de café..." oninput="PageInventario.searchStock(this.value)">
          </div>
          <button class="btn btn-outline btn-sm" onclick="PageInventario.loadStock()">🔄 Actualizar Stock</button>
        </div>
        <div id="stock-table-container"><div class="empty-state"><div class="spinner"></div></div></div>
      </div>

      <div id="tab-movs-view" style="display:none">
        <div class="filter-bar">
          <div class="search-input" style="position:relative">
            <span class="search-icon">🔍</span>
            <input type="text" class="form-control" placeholder="Buscar movimientos por lote, tipo..." oninput="PageInventario.searchMovs(this.value)">
          </div>
          <select class="form-control" style="width:180px" onchange="PageInventario.filterTipoMov(this.value)">
            <option value="">Todos los tipos</option>
            <option value="ENTRADA">ENTRADA</option>
            <option value="SALIDA">SALIDA</option>
            <option value="TRANSFORMACION">TRANSFORMACION</option>
            <option value="AJUSTE">AJUSTE</option>
            <option value="RESERVA">RESERVA</option>
          </select>
          <button class="btn btn-outline btn-sm" onclick="PageInventario.loadMovs()">🔄 Actualizar Kardex</button>
        </div>
        <div id="movs-table-container"><div class="empty-state"><div class="spinner"></div></div></div>
      </div>`;

    document.body.insertAdjacentHTML('beforeend', buildAjusteModal());
    await loadStock();
  }

  function buildAjusteModal() {
    return `
    <div class="modal-backdrop modal-md" id="modal-ajuste-inv">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">⚖️ Ajuste de Inventario</h3>
          <button class="modal-close" onclick="Modal.close('modal-ajuste-inv')">✕</button>
        </div>
        <div class="modal-body">
          <form id="form-ajuste-inv" novalidate>
            <div class="form-group mb-4">
              <label class="form-label" for="aj-lote">Lote <span class="required">*</span></label>
              <input type="text" id="aj-lote" name="idLote" class="form-control" placeholder="CAF-2026-000001" required>
            </div>
            <div class="form-grid form-grid-2">
              <div class="form-group">
                <label class="form-label" for="aj-producto">Producto / Tipo</label>
                <input type="text" id="aj-producto" name="producto" class="form-control" placeholder="CAFÉ PERGAMINO SECO">
              </div>
              <div class="form-group">
                <label class="form-label" for="aj-kg">Cantidad Ajuste (kg) <span class="required">*</span></label>
                <input type="number" id="aj-kg" name="kg" class="form-control" step="0.1" placeholder="+50 o -50" required>
                <span class="form-hint">Use positivo para sumar o negativo para restar</span>
              </div>
            </div>
            <div class="form-group mt-4">
              <label class="form-label" for="aj-notas">Justificación del Ajuste <span class="required">*</span></label>
              <textarea id="aj-notas" name="notas" class="form-control" rows="3" placeholder="Razón del descuadre, humedad, pesaje..." required></textarea>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="Modal.close('modal-ajuste-inv')">Cancelar</button>
          <button class="btn btn-gold" onclick="PageInventario.saveAjuste()">💾 Registrar Ajuste</button>
        </div>
      </div>
    </div>`;
  }

  function switchTab(tab) {
    currentTab = tab;
    document.getElementById('tab-stock-view').style.display = tab === 'stock' ? 'block' : 'none';
    document.getElementById('tab-movs-view').style.display = tab === 'movs' ? 'block' : 'none';
    if (tab === 'stock') loadStock();
    else loadMovs();
  }

  async function loadStock() {
    const cont = document.getElementById('stock-table-container');
    if (!cont) return;
    try {
      const data = await API.get('inventario');
      if (!tableStock) {
        tableStock = new DataTable({
          containerId: 'stock-table-container',
          searchFields: ['ID_LOTE','TIPO_CAFE','ESTADO'],
          columns: [
            { field: 'ID_LOTE',          label: 'ID Lote',      class: 'mono', render: (v) => `<span style="color:var(--gold-400);cursor:pointer" onclick="Router.navigate('lotes',{id:'${v}'})">${v}</span>` },
            { field: 'TIPO_CAFE',        label: 'Tipo de Café' },
            { field: 'STOCK_KG',         label: 'Stock Disponible', render: (v) => `<strong style="color:var(--success);font-size:15px">${Fmt.kg(v, 1)}</strong>` },
            { field: 'FECHA_RECEPCION',  label: 'Ingreso',      render: Fmt.date },
            { field: 'ESTADO',           label: 'Estado Lote',  render: Fmt.badge },
          ],
        });
      }
      tableStock.setData(data || []);
    } catch(err) {
      if (cont) cont.innerHTML = `<div class="alert alert-danger">❌ ${err.message}</div>`;
    }
  }

  async function loadMovs() {
    const cont = document.getElementById('movs-table-container');
    if (!cont) return;
    try {
      const data = await API.get('listMovimientos');
      if (!tableMovs) {
        tableMovs = new DataTable({
          containerId: 'movs-table-container',
          searchFields: ['ID_MOVIMIENTO','ID_LOTE','TIPO','PRODUCTO','ID_REFERENCIA'],
          columns: [
            { field: 'ID_MOVIMIENTO',  label: 'ID Movimiento', class: 'mono' },
            { field: 'FECHA',          label: 'Fecha/Hora',     render: Fmt.datetime },
            { field: 'TIPO',           label: 'Tipo',           render: Fmt.badge },
            { field: 'ID_LOTE',        label: 'Lote',           class: 'mono' },
            { field: 'PRODUCTO',       label: 'Producto',       render: (v) => Fmt.truncate(v, 20) },
            { field: 'KG',             label: 'Cantidad (kg)',  render: (v, r) => {
                const isPlus = ['ENTRADA','AJUSTE'].includes(r.TIPO);
                return `<span style="color:${isPlus ? 'var(--success)' : 'var(--danger)'};font-weight:600">${isPlus ? '+' : '-'}${Fmt.kg(v, 1)}</span>`;
              }},
            { field: 'KG_ANTERIOR',     label: 'Anterior',       render: (v) => Fmt.kg(v, 0) },
            { field: 'KG_NUEVO',        label: 'Nuevo Saldo',    render: (v) => `<strong>${Fmt.kg(v, 0)}</strong>` },
            { field: 'NOTAS',           label: 'Notas',          render: (v) => Fmt.truncate(v, 25) },
            { field: 'USUARIO',         label: 'Usuario',        render: (v) => Fmt.truncate(v, 15) },
          ],
        });
      }
      tableMovs.setData(data || []);
    } catch(err) {
      if (cont) cont.innerHTML = `<div class="alert alert-danger">❌ ${err.message}</div>`;
    }
  }

  function openAjusteForm() {
    const form = document.getElementById('form-ajuste-inv');
    if (form) form.reset();
    Modal.open('modal-ajuste-inv');
  }

  async function saveAjuste() {
    const form = document.getElementById('form-ajuste-inv');
    if (!form) return;
    const data = Object.fromEntries(new FormData(form));

    if (!data.idLote || !data.kg || !data.notas) {
      return Toast.error('Error', 'Complete los campos requeridos');
    }

    try {
      await API.post('ajusteInventario', data);
      Modal.close('modal-ajuste-inv');
      Toast.success('Ajuste Registrado', `Lote ${data.idLote} ajustado en ${data.kg} kg`);
      loadStock();
    } catch(err) {
      Toast.error('Error al ajustar', err.message);
    }
  }

  function searchStock(q) { tableStock?.search(q); }
  function searchMovs(q)  { tableMovs?.search(q); }
  function filterTipoMov(v) { tableMovs?.filter('TIPO', v); }

  return { render, switchTab, loadStock, loadMovs, openAjusteForm, saveAjuste, searchStock, searchMovs, filterTipoMov };
})();
