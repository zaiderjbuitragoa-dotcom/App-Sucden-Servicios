// ============================================================
// produccion.js — Sucden Colombia · Módulo de Producción y Trilla
// ============================================================

const PageProduccion = (() => {
  let table;
  let lotesDisponibles = [], maquinas = [], operarios = [], turnos = [];
  let selectedLotes = [];

  async function render(container) {
    container.innerHTML = `
      <div class="page-header">
        <div class="page-title-group">
          <h1 class="page-title">Producción y Trilla</h1>
          <p class="page-subtitle">Control de procesos de trilla, tiempos, rendimientos y mermas</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-gold" onclick="PageProduccion.openStartForm()">
            ⚙️ Iniciar Producción
          </button>
        </div>
      </div>

      <div class="filter-bar">
        <div class="search-input" style="position:relative">
          <span class="search-icon">🔍</span>
          <input type="text" class="form-control" id="search-prod" placeholder="Buscar por ID, máquina, operario..." oninput="PageProduccion.search(this.value)">
        </div>
        <select class="form-control" style="width:200px" onchange="PageProduccion.filterEstado(this.value)">
          <option value="">Todos los estados</option>
          <option value="EN_PROCESO">En Proceso</option>
          <option value="FINALIZADO">Finalizado</option>
          <option value="CANCELADO">Cancelado</option>
        </select>
        <button class="btn btn-outline btn-sm" onclick="PageProduccion.loadData()">🔄 Actualizar</button>
      </div>

      <div id="prod-table-container">
        <div class="empty-state"><div class="spinner"></div></div>
      </div>`;

    document.body.insertAdjacentHTML('beforeend', buildStartModal());
    document.body.insertAdjacentHTML('beforeend', buildFinishModal());
    await loadCatalogos();
    await loadData();
  }

  function buildStartModal() {
    return `
    <div class="modal-backdrop modal-lg" id="modal-start-prod">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">⚙️ Iniciar Orden de Producción / Trilla</h3>
          <button class="modal-close" onclick="Modal.close('modal-start-prod')">✕</button>
        </div>
        <div class="modal-body">
          <form id="form-start-prod" novalidate>
            <div class="section-title">Datos del Proceso</div>
            <div class="form-grid form-grid-3">
              <div class="form-group">
                <label class="form-label" for="sp-fecha">Fecha <span class="required">*</span></label>
                <input type="date" id="sp-fecha" name="fecha" class="form-control" required>
              </div>
              <div class="form-group">
                <label class="form-label" for="sp-hora-ini">Hora Inicio <span class="required">*</span></label>
                <input type="time" id="sp-hora-ini" name="horaInicio" class="form-control" required>
              </div>
              <div class="form-group">
                <label class="form-label" for="sp-turno">Turno</label>
                <select id="sp-turno" name="idTurno" class="form-control">
                  <option value="">— Seleccionar Turno —</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="sp-maquina">Máquina <span class="required">*</span></label>
                <select id="sp-maquina" name="idMaquina" class="form-control" required>
                  <option value="">— Seleccionar Máquina —</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="sp-operario">Operario <span class="required">*</span></label>
                <select id="sp-operario" name="idOperario" class="form-control" required>
                  <option value="">— Seleccionar Operario —</option>
                </select>
              </div>
            </div>

            <div class="section-title mt-4">Lotes Aprobados a Procesar (Multi-lote)</div>
            <div style="display:flex;gap:var(--sp-2);margin-bottom:var(--sp-3)">
              <select id="sp-select-lote" class="form-control" style="flex:1">
                <option value="">— Seleccionar Lote Aprobado —</option>
              </select>
              <input type="number" id="sp-kg-lote" class="form-control" style="width:140px" placeholder="Kg entrada" step="0.1" min="0.1">
              <button type="button" class="btn btn-outline" onclick="PageProduccion.addLoteToOrder()">➕ Agregar Lote</button>
            </div>

            <div class="table-container mb-4">
              <table class="table" id="table-order-lotes">
                <thead><tr><th>ID Lote</th><th>Tipo</th><th>Kg Ingresados</th><th>Acción</th></tr></thead>
                <tbody id="tbody-order-lotes">
                  <tr><td colspan="4" style="text-align:center;color:var(--text-muted)">No hay lotes agregados a la orden</td></tr>
                </tbody>
              </table>
            </div>

            <div class="form-group">
              <label class="form-label" for="sp-obs">Observaciones</label>
              <textarea id="sp-obs" name="observaciones" class="form-control" rows="2" placeholder="Indicaciones para el turno..."></textarea>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="Modal.close('modal-start-prod')">Cancelar</button>
          <button class="btn btn-gold" id="btn-save-start-prod" onclick="PageProduccion.saveStart()">🚀 Iniciar Trilla</button>
        </div>
      </div>
    </div>`;
  }

  function buildFinishModal() {
    return `
    <div class="modal-backdrop modal-md" id="modal-finish-prod">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">🏁 Finalizar Orden de Producción</h3>
          <button class="modal-close" onclick="Modal.close('modal-finish-prod')">✕</button>
        </div>
        <div class="modal-body">
          <form id="form-finish-prod" novalidate>
            <input type="hidden" id="fp-id" name="idProduccion">
            <div class="section-title">Resultados de Trilla</div>
            <div class="form-grid form-grid-2">
              <div class="form-group">
                <label class="form-label" for="fp-hora-fin">Hora Finalización <span class="required">*</span></label>
                <input type="time" id="fp-hora-fin" name="horaFin" class="form-control" required onchange="PageProduccion.calcFinishMetrics()">
              </div>
              <div class="form-group">
                <label class="form-label">Kg Entrada Total</label>
                <div class="form-computed" id="fp-kg-ent">—</div>
              </div>
              <div class="form-group">
                <label class="form-label" for="fp-kg-excelso">Kg Café Excelso Obtained <span class="required">*</span></label>
                <input type="number" id="fp-kg-excelso" name="kgExcelso" class="form-control" step="0.1" min="0" placeholder="0.0" required oninput="PageProduccion.calcFinishMetrics()">
              </div>
              <div class="form-group">
                <label class="form-label" for="fp-kg-sub">Kg Subproducto (Pasilla/Cisco)</label>
                <input type="number" id="fp-kg-sub" name="kgSubproducto" class="form-control" step="0.1" min="0" placeholder="0.0" oninput="PageProduccion.calcFinishMetrics()">
              </div>
            </div>

            <div style="background:var(--bg-elevated);padding:var(--sp-4);border-radius:var(--r-md);margin:var(--sp-4) 0;display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--sp-3)">
              <div>
                <div style="font-size:10px;color:var(--text-muted)">TIEMPO TOTAL</div>
                <div style="font-size:var(--text-md);font-weight:700" id="fp-res-tiempo">—</div>
              </div>
              <div>
                <div style="font-size:10px;color:var(--text-muted)">MERMA ESTIMADA</div>
                <div style="font-size:var(--text-md);font-weight:700;color:var(--warning)" id="fp-res-merma">—</div>
              </div>
              <div>
                <div style="font-size:10px;color:var(--text-muted)">RENDIMIENTO</div>
                <div style="font-size:var(--text-md);font-weight:700;color:var(--success)" id="fp-res-rend">—</div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="fp-obs">Observaciones Finales</label>
              <textarea id="fp-obs" name="observaciones" class="form-control" rows="2" placeholder="Comentarios sobre el rendimiento o fallas..."></textarea>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="Modal.close('modal-finish-prod')">Cancelar</button>
          <button class="btn btn-gold" id="btn-save-finish-prod" onclick="PageProduccion.saveFinish()">✅ Confirmar y Finalizar</button>
        </div>
      </div>
    </div>`;
  }

  async function loadCatalogos() {
    try {
      const [l, m, o, t] = await Promise.all([
        API.get('listLotes'), API.get('listMaquinas'), API.get('listOperarios'), API.get('listTurnos')
      ]);
      lotesDisponibles = (l || []).filter(item => item.ESTADO === 'APROBADO');
      maquinas = m || []; operarios = o || []; turnos = t || [];

      const selL = document.getElementById('sp-select-lote');
      if (selL) selL.innerHTML = '<option value="">— Seleccionar Lote Aprobado —</option>' + lotesDisponibles.map(item => `<option value="${item.ID_LOTE}">${item.ID_LOTE} — ${item.TIPO_CAFE} (Disp: ${Fmt.kg(item.KG_RECEPCION,0)})</option>`).join('');

      const selM = document.getElementById('sp-maquina');
      if (selM) selM.innerHTML = '<option value="">— Seleccionar Máquina —</option>' + maquinas.map(item => `<option value="${item.ID_MAQUINA}">${item.NOMBRE} (${item.CAPACIDAD_KG_H || '—'} kg/h)</option>`).join('');

      const selO = document.getElementById('sp-operario');
      if (selO) selO.innerHTML = '<option value="">— Seleccionar Operario —</option>' + operarios.map(item => `<option value="${item.ID_OPERARIO}">${item.NOMBRE}</option>`).join('');

      const selT = document.getElementById('sp-turno');
      if (selT) selT.innerHTML = '<option value="">— Seleccionar Turno —</option>' + turnos.map(item => `<option value="${item.ID_TURNO}">${item.NOMBRE} (${item.HORA_INICIO} - ${item.HORA_FIN})</option>`).join('');
    } catch(e) { console.warn(e); }
  }

  async function loadData() {
    const cont = document.getElementById('prod-table-container');
    if (!cont) return;
    try {
      const data = await API.get('listProduccion');
      if (!table) {
        table = new DataTable({
          containerId: 'prod-table-container',
          searchFields: ['ID_PRODUCCION','ID_MAQUINA','ID_OPERARIO','ESTADO'],
          columns: [
            { field: 'ID_PRODUCCION',     label: 'ID Orden',   class: 'mono' },
            { field: 'FECHA',             label: 'Fecha',      render: Fmt.date },
            { field: 'HORA_INICIO',       label: 'Inicio/Fin', render: (v, r) => `${v || '—'} - ${r.HORA_FIN || '...'}` },
            { field: 'TIEMPO_HORAS',      label: 'Tiempo',     render: Fmt.hours },
            { field: 'KG_ENTRADA',        label: 'Kg Entrada', render: (v) => Fmt.kg(v, 0) },
            { field: 'KG_EXCELSO',        label: 'Excelso',    render: (v) => v ? Fmt.kg(v, 0) : '—' },
            { field: 'RENDIMIENTO_PCT',   label: 'Rendimiento',render: Fmt.pct },
            { field: 'PRODUCTIVIDAD_KG_H',label: 'Kg/h',       render: (v) => v ? `${Fmt.number(v,0)} kg/h` : '—' },
            { field: 'ESTADO',            label: 'Estado',     render: Fmt.badge },
            { field: 'ID_PRODUCCION',     label: 'Acción',     sortable: false,
              render: (v, r) => r.ESTADO === 'EN_PROCESO'
                ? `<button class="btn btn-gold btn-sm" onclick="PageProduccion.openFinishForm('${v}', ${r.KG_ENTRADA})">🏁 Finalizar</button>`
                : `<span class="fs-xs text-muted">Finalizado</span>` },
          ],
        });
      }
      table.setData(data || []);
    } catch(err) {
      if (cont) cont.innerHTML = `<div class="alert alert-danger">❌ ${err.message}</div>`;
    }
  }

  function openStartForm() {
    selectedLotes = [];
    const form = document.getElementById('form-start-prod');
    if (form) form.reset();
    document.getElementById('sp-fecha').value = Fmt.today();
    document.getElementById('sp-hora-ini').value = Fmt.currentTime();
    renderOrderLotesTable();
    Modal.open('modal-start-prod');
  }

  function addLoteToOrder() {
    const sel = document.getElementById('sp-select-lote');
    const kgInput = document.getElementById('sp-kg-lote');
    if (!sel || !sel.value) return Toast.warning('Atención', 'Seleccione un lote');
    const idLote = sel.value;
    const kg = parseFloat(kgInput.value);
    if (isNaN(kg) || kg <= 0) return Toast.warning('Atención', 'Ingrese kg de entrada válidos');

    if (selectedLotes.some(l => l.idLote === idLote)) return Toast.warning('Atención', 'El lote ya está agregado');

    const item = lotesDisponibles.find(l => l.ID_LOTE === idLote);
    selectedLotes.push({ idLote, tipo: item?.TIPO_CAFE || '', kgEntrada: kg });
    sel.value = ''; kgInput.value = '';
    renderOrderLotesTable();
  }

  function removeLoteFromOrder(idx) {
    selectedLotes.splice(idx, 1);
    renderOrderLotesTable();
  }

  function renderOrderLotesTable() {
    const tbody = document.getElementById('tbody-order-lotes');
    if (!tbody) return;
    if (selectedLotes.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">No hay lotes agregados</td></tr>';
      return;
    }
    tbody.innerHTML = selectedLotes.map((l, idx) => `
      <tr>
        <td class="mono">${l.idLote}</td>
        <td>${l.tipo}</td>
        <td><strong>${Fmt.kg(l.kgEntrada, 1)}</strong></td>
        <td><button class="btn btn-danger btn-sm" onclick="PageProduccion.removeLoteFromOrder(${idx})">🗑️</button></td>
      </tr>`).join('');
  }

  async function saveStart() {
    const form = document.getElementById('form-start-prod');
    if (!form) return;
    const data = Object.fromEntries(new FormData(form));

    if (!data.fecha || !data.horaInicio || !data.idMaquina || !data.idOperario) {
      return Toast.error('Error', 'Complete los campos obligatorios');
    }
    if (selectedLotes.length === 0) {
      return Toast.error('Error', 'Agregue al menos un lote a la orden');
    }

    data.lotes = selectedLotes;
    const btn = document.getElementById('btn-save-start-prod');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Guardando...'; }

    try {
      const res = await API.post('startProduccion', data);
      Modal.close('modal-start-prod');
      Toast.success('Producción Iniciada', `Orden ${res.id} creada · ${Fmt.kg(res.kgEntrada, 0)} entrada`);
      await loadData();
    } catch(err) {
      Toast.error('Error al iniciar', err.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '🚀 Iniciar Trilla'; }
    }
  }

  function openFinishForm(idProduccion, kgEntrada) {
    const form = document.getElementById('form-finish-prod');
    if (form) form.reset();
    document.getElementById('fp-id').value = idProduccion;
    document.getElementById('fp-kg-ent').textContent = Fmt.kg(kgEntrada, 1);
    window._curKgEntrada = kgEntrada;
    document.getElementById('fp-hora-fin').value = Fmt.currentTime();
    calcFinishMetrics();
    Modal.open('modal-finish-prod');
  }

  function calcFinishMetrics() {
    const ent = window._curKgEntrada || 0;
    const exc = parseFloat(document.getElementById('fp-kg-excelso')?.value) || 0;
    const sub = parseFloat(document.getElementById('fp-kg-sub')?.value) || 0;
    const merma = Math.max(0, ent - exc - sub);
    const rend = ent > 0 ? ((exc / ent) * 100).toFixed(1) : 0;

    const elM = document.getElementById('fp-res-merma');
    const elR = document.getElementById('fp-res-rend');
    if (elM) elM.textContent = Fmt.kg(merma, 1);
    if (elR) elR.textContent = `${rend}%`;
  }

  async function saveFinish() {
    const form = document.getElementById('form-finish-prod');
    if (!form) return;
    const data = Object.fromEntries(new FormData(form));

    if (!data.idProduccion || !data.horaFin || !data.kgExcelso) {
      return Toast.error('Error', 'Complete los datos obligatorios');
    }

    const btn = document.getElementById('btn-save-finish-prod');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Finalizando...'; }

    try {
      const res = await API.post('finishProduccion', data);
      Modal.close('modal-finish-prod');
      Toast.success('Producción Finalizada', `Rendimiento: ${res.rendimiento}% · Merma: ${Fmt.kg(res.kgMerma,1)}`);
      await loadData();
    } catch(err) {
      Toast.error('Error al finalizar', err.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '✅ Confirmar y Finalizar'; }
    }
  }

  function search(q) { table?.search(q); }
  function filterEstado(v) { table?.filter('ESTADO', v); }

  return { render, loadData, openStartForm, addLoteToOrder, removeLoteFromOrder, saveStart, openFinishForm, calcFinishMetrics, saveFinish, search, filterEstado };
})();
