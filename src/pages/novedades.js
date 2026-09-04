// ============================================================
// novedades.js — Sucden Colombia · Módulo de Novedades e Incidencias
// ============================================================

const PageNovedades = (() => {
  let table;

  async function render(container) {
    container.innerHTML = `
      <div class="page-header">
        <div class="page-title-group">
          <h1 class="page-title">Novedades e Incidencias</h1>
          <p class="page-subtitle">Registro y resolución de anomalías operativas</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-gold" onclick="PageNovedades.openForm()">
            ⚠️ Reportar Novedad
          </button>
        </div>
      </div>

      <div class="filter-bar">
        <div class="search-input" style="position:relative">
          <span class="search-icon">🔍</span>
          <input type="text" class="form-control" placeholder="Buscar por descripción, módulo, responsable..." oninput="PageNovedades.search(this.value)">
        </div>
        <button class="btn btn-outline btn-sm" onclick="PageNovedades.loadData()">🔄 Actualizar</button>
      </div>

      <div id="nov-table-container">
        <div class="empty-state"><div class="spinner"></div></div>
      </div>`;

    document.body.insertAdjacentHTML('beforeend', buildFormModal());
    await loadData();
  }

  function buildFormModal() {
    return `
    <div class="modal-backdrop modal-md" id="modal-novedad">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">⚠️ Reportar Novedad / Incidencia</h3>
          <button class="modal-close" onclick="Modal.close('modal-novedad')">✕</button>
        </div>
        <div class="modal-body">
          <form id="form-novedad" novalidate>
            <div class="form-grid form-grid-2">
              <div class="form-group">
                <label class="form-label" for="nov-modulo">Módulo Afectado</label>
                <select id="nov-modulo" name="modulo" class="form-control">
                  <option value="RECEPCION">Recepción</option>
                  <option value="CALIDAD">Calidad</option>
                  <option value="PRODUCCION">Producción</option>
                  <option value="INVENTARIO">Inventario</option>
                  <option value="EMPAQUE">Empaque</option>
                  <option value="DESPACHOS">Despachos</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="nov-entidad">ID Entidad (Lote/Despacho)</label>
                <input type="text" id="nov-entidad" name="entidadId" class="form-control" placeholder="Ej: CAF-2026-000001">
              </div>
            </div>
            <div class="form-group mt-4">
              <label class="form-label" for="nov-desc">Descripción de la Novedad <span class="required">*</span></label>
              <textarea id="nov-desc" name="descripcion" class="form-control" rows="3" placeholder="Detalle lo sucedido..." required></textarea>
            </div>
            <div class="form-group mt-4">
              <label class="form-label" for="nov-impacto">Nivel de Impacto</label>
              <select id="nov-impacto" name="impacto" class="form-control">
                <option value="BAJO">Bajo</option>
                <option value="MEDIO" selected>Medio</option>
                <option value="ALTO">Alto / Crítico</option>
              </select>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="Modal.close('modal-novedad')">Cancelar</button>
          <button class="btn btn-gold" onclick="PageNovedades.save()">💾 Reportar</button>
        </div>
      </div>
    </div>`;
  }

  async function loadData() {
    const cont = document.getElementById('nov-table-container');
    if (!cont) return;
    try {
      const data = await API.get('listNovedades');
      if (!table) {
        table = new DataTable({
          containerId: 'nov-table-container',
          searchFields: ['ID_NOVEDAD','DESCRIPCION','MODULO','ENTIDAD_ID'],
          columns: [
            { field: 'ID_NOVEDAD',   label: 'ID',          class: 'mono' },
            { field: 'FECHA',        label: 'Fecha',       render: Fmt.datetime },
            { field: 'MODULO',       label: 'Módulo' },
            { field: 'ENTIDAD_ID',   label: 'Ref ID',      class: 'mono' },
            { field: 'DESCRIPCION',  label: 'Descripción', render: (v) => Fmt.truncate(v, 30) },
            { field: 'IMPACTO',      label: 'Impacto',     render: Fmt.badge },
            { field: 'ESTADO',       label: 'Estado',      render: Fmt.badge },
            { field: 'RESPONSABLE',  label: 'Reportó',     render: (v) => Fmt.truncate(v, 15) },
          ],
        });
      }
      table.setData(data || []);
    } catch(err) {
      if (cont) cont.innerHTML = `<div class="alert alert-danger">❌ ${err.message}</div>`;
    }
  }

  function openForm() {
    const form = document.getElementById('form-novedad');
    if (form) form.reset();
    Modal.open('modal-novedad');
  }

  async function save() {
    const form = document.getElementById('form-novedad');
    if (!form) return;
    const data = Object.fromEntries(new FormData(form));
    if (!data.descripcion) return Toast.error('Error', 'Ingrese la descripción');

    try {
      await API.post('createNovedad', data);
      Modal.close('modal-novedad');
      Toast.success('Novedad Reportada', 'Registrada con éxito');
      loadData();
    } catch(err) {
      Toast.error('Error', err.message);
    }
  }

  function search(q) { table?.search(q); }

  return { render, loadData, openForm, save, search };
})();
