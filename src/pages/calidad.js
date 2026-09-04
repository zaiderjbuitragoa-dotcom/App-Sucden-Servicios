// ============================================================
// calidad.js — Sucden Colombia · Módulo de Calidad
// ============================================================

const PageCalidad = (() => {
  let table;
  let lotes = [];

  async function render(container) {
    container.innerHTML = `
      <div class="page-header">
        <div class="page-title-group">
          <h1 class="page-title">Control de Calidad</h1>
          <p class="page-subtitle">Análisis físico y sensorial de lotes de café</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-gold" onclick="PageCalidad.openForm()" id="btn-nuevo-calidad">
            🔬 Registrar Análisis
          </button>
        </div>
      </div>

      <div class="filter-bar">
        <div class="search-input" style="position:relative">
          <span class="search-icon">🔍</span>
          <input type="text" class="form-control" id="search-calidad" placeholder="Buscar por lote, resultado, laboratorio..." oninput="PageCalidad.search(this.value)">
        </div>
        <select class="form-control" style="width:200px" onchange="PageCalidad.filterResultado(this.value)">
          <option value="">Todos los resultados</option>
          <option value="APROBADO">Aprobado</option>
          <option value="RECHAZADO">Rechazado</option>
          <option value="BLOQUEADO">Bloqueado</option>
          <option value="PENDIENTE">Pendiente</option>
        </select>
        <button class="btn btn-outline btn-sm" onclick="PageCalidad.loadData()">🔄 Actualizar</button>
      </div>

      <div id="calidad-table-container">
        <div class="empty-state"><div class="spinner"></div></div>
      </div>`;

    document.body.insertAdjacentHTML('beforeend', buildFormModal());
    await loadLotes();
    await loadData();
  }

  function buildFormModal() {
    return `
    <div class="modal-backdrop modal-lg" id="modal-calidad">
      <div class="modal" role="dialog" aria-modal="true" aria-label="Registrar Análisis de Calidad">
        <div class="modal-header">
          <h3 class="modal-title">🔬 Registrar Análisis de Calidad</h3>
          <button class="modal-close" onclick="Modal.close('modal-calidad')">✕</button>
        </div>
        <div class="modal-body">
          <form id="form-calidad" novalidate>
            <div class="section-title">Lote y Responsable</div>
            <div class="form-grid form-grid-3">
              <div class="form-group">
                <label class="form-label" for="cal-lote">Lote <span class="required">*</span></label>
                <select id="cal-lote" name="idLote" class="form-control" required>
                  <option value="">— Seleccionar Lote —</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="cal-fecha">Fecha Análisis <span class="required">*</span></label>
                <input type="date" id="cal-fecha" name="fecha" class="form-control" required>
              </div>
              <div class="form-group">
                <label class="form-label" for="cal-responsable">Catador / Responsable <span class="required">*</span></label>
                <input type="text" id="cal-responsable" name="responsable" class="form-control" placeholder="Nombre del analista" required>
              </div>
            </div>

            <div class="section-title mt-4">Análisis Físico y Senso</div>
            <div class="form-grid form-grid-3">
              <div class="form-group">
                <label class="form-label" for="cal-humedad">Humedad (%) <span class="required">*</span></label>
                <input type="number" id="cal-humedad" name="humedadPct" class="form-control" step="0.1" min="0" max="100" placeholder="11.5" required>
              </div>
              <div class="form-group">
                <label class="form-label" for="cal-factor">Factor de Rendimiento</label>
                <input type="number" id="cal-factor" name="factor" class="form-control" step="0.01" min="0" placeholder="92.5">
              </div>
              <div class="form-group">
                <label class="form-label" for="cal-clasificacion">Clasificación / Malla</label>
                <input type="text" id="cal-clasificacion" name="clasificacion" class="form-control" placeholder="Malla 17/18, Supremo, etc.">
              </div>
              <div class="form-group">
                <label class="form-label" for="cal-defectos">Defectos (%)</label>
                <input type="number" id="cal-defectos" name="defectosPct" class="form-control" step="0.1" min="0" max="100" placeholder="1.2">
              </div>
              <div class="form-group">
                <label class="form-label" for="cal-taza">Puntaje Taza (SCA)</label>
                <input type="number" id="cal-taza" name="tazaPuntaje" class="form-control" step="0.25" min="0" max="100" placeholder="84.5">
              </div>
              <div class="form-group">
                <label class="form-label" for="cal-laboratorio">Laboratorio</label>
                <input type="text" id="cal-laboratorio" name="laboratorio" class="form-control" placeholder="Lab Principal, Externo...">
              </div>
            </div>

            <div class="section-title mt-4">Dictamen Final</div>
            <div class="form-grid form-grid-2">
              <div class="form-group">
                <label class="form-label" for="cal-resultado">Resultado <span class="required">*</span></label>
                <select id="cal-resultado" name="resultado" class="form-control" required>
                  <option value="APROBADO">✅ APROBADO</option>
                  <option value="RECHAZADO">❌ RECHAZADO</option>
                  <option value="BLOQUEADO">🚫 BLOQUEADO</option>
                  <option value="PENDIENTE">⏳ PENDIENTE</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="cal-obs">Observaciones / Perfil de Taza</label>
                <textarea id="cal-obs" name="observaciones" class="form-control" rows="2" placeholder="Notas de cata, defectos encontrados..."></textarea>
              </div>
            </div>

            <div class="section-title mt-4">Certificado / Certificado de Calidad (PDF/Imagen)</div>
            <div style="border: 2px dashed var(--border-default); border-radius: var(--r-md); padding: var(--sp-6); text-align: center; cursor: pointer;"
                 onclick="document.getElementById('cal-files').click()">
              <div style="font-size:24px;margin-bottom:4px">📜</div>
              <div style="font-size:var(--text-sm)">Adjuntar Certificado de Calidad o Ficha de Cata</div>
            </div>
            <input type="file" id="cal-files" accept="image/*,.pdf" style="display:none" onchange="PageCalidad.handleFiles(this.files)">
            <div id="cal-file-preview" style="display:flex;gap:var(--sp-2);margin-top:var(--sp-2)"></div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="Modal.close('modal-calidad')">Cancelar</button>
          <button class="btn btn-gold" id="btn-save-calidad" onclick="PageCalidad.save()">
            💾 Guardar Dictamen
          </button>
        </div>
      </div>
    </div>`;
  }

  async function loadLotes() {
    try {
      const all = await API.get('listLotes');
      lotes = (all || []).filter(l => l.ESTADO !== 'DESPACHADO');
      const sel = document.getElementById('cal-lote');
      if (sel) {
        sel.innerHTML = '<option value="">— Seleccionar Lote —</option>' +
          lotes.map(l => `<option value="${l.ID_LOTE}">${l.ID_LOTE} — ${l.TIPO_CAFE} (${Fmt.kg(l.KG_RECEPCION,0)}) [${l.ESTADO}]</option>`).join('');
      }
    } catch(e) { console.warn(e.message); }
  }

  async function loadData() {
    const cont = document.getElementById('calidad-table-container');
    if (!cont) return;
    try {
      const data = await API.get('listCalidad');
      if (!table) {
        table = new DataTable({
          containerId: 'calidad-table-container',
          searchFields: ['ID_CALIDAD','ID_LOTE','RESULTADO','RESPONSABLE','LABORATORIO'],
          columns: [
            { field: 'ID_CALIDAD',    label: 'ID Análisis', class: 'mono' },
            { field: 'ID_LOTE',       label: 'Lote',        class: 'mono', render: (v) => `<span style="color:var(--gold-400);cursor:pointer" onclick="Router.navigate('lotes',{id:'${v}'})">${v}</span>` },
            { field: 'FECHA',        label: 'Fecha',       render: Fmt.date },
            { field: 'HUMEDAD_PCT',  label: 'Humedad',     render: Fmt.pct },
            { field: 'FACTOR',       label: 'Factor',      render: (v) => v || '—' },
            { field: 'CLASIFICACION',label: 'Malla/Clasif',render: (v) => Fmt.truncate(v, 15) },
            { field: 'TAZA_PUNTAJE', label: 'Puntaje Taza',render: (v) => v ? `<strong>${v} pts</strong>` : '—' },
            { field: 'RESULTADO',    label: 'Dictamen',    render: Fmt.badge },
            { field: 'RESPONSABLE',  label: 'Catador',     render: (v) => Fmt.truncate(v, 18) },
          ],
        });
      }
      table.setData(data || []);
    } catch(err) {
      if (cont) cont.innerHTML = `<div class="alert alert-danger">❌ ${err.message}</div>`;
    }
  }

  function handleFiles(files) {
    const prev = document.getElementById('cal-file-preview');
    if (!prev || !files?.length) return;
    prev.innerHTML = Array.from(files).map(f => `<span class="badge badge-activo">📄 ${f.name}</span>`).join(' ');
    window._calFiles = Array.from(files);
  }

  function openForm() {
    window._calFiles = [];
    const form = document.getElementById('form-calidad');
    if (form) form.reset();
    const f = document.getElementById('cal-fecha');
    if (f) f.value = Fmt.today();
    const u = Auth.getUser();
    const r = document.getElementById('cal-responsable');
    if (r && u) r.value = u.nombre || u.email;
    document.getElementById('cal-file-preview').innerHTML = '';
    Modal.open('modal-calidad');
  }

  async function save() {
    const form = document.getElementById('form-calidad');
    if (!form) return;
    const data = Object.fromEntries(new FormData(form));

    if (!data.idLote) return Toast.error('Error', 'Seleccione un lote');
    if (!data.fecha) return Toast.error('Error', 'Ingrese fecha');
    if (!data.responsable) return Toast.error('Error', 'Ingrese catador/responsable');

    const btn = document.getElementById('btn-save-calidad');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Guardando...'; }

    try {
      const res = await API.post('createCalidad', data);

      if (window._calFiles?.length > 0) {
        for (const file of window._calFiles) {
          await API.uploadFile(file, 'CALIDAD', res.id, 'CERTIFICADO_CALIDAD');
        }
      }

      Modal.close('modal-calidad');
      Toast.success('Análisis registrado', `Resultado: ${res.resultado} para lote ${res.idLote}`);
      await loadData();
      await loadLotes();
    } catch(err) {
      Toast.error('Error al guardar', err.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '💾 Guardar Dictamen'; }
    }
  }

  function search(q) { table?.search(q); }
  function filterResultado(v) { table?.filter('RESULTADO', v); }

  return { render, loadData, openForm, save, handleFiles, search, filterResultado };
})();
