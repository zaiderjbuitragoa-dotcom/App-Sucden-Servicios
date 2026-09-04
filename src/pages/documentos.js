// ============================================================
// documentos.js — Sucden Colombia · Módulo de Documentos y Fotos
// ============================================================

const PageDocumentos = (() => {
  let table;

  async function render(container) {
    container.innerHTML = `
      <div class="page-header">
        <div class="page-title-group">
          <h1 class="page-title">Gestión Documental y Fotográfica</h1>
          <p class="page-subtitle">Repositorio de certificados, remisiones, fotos y evidencias en Google Drive</p>
        </div>
      </div>

      <div class="filter-bar">
        <div class="search-input" style="position:relative">
          <span class="search-icon">🔍</span>
          <input type="text" class="form-control" placeholder="Buscar por entidad ID, nombre archivo, tipo..." oninput="PageDocumentos.search(this.value)">
        </div>
        <button class="btn btn-outline btn-sm" onclick="PageDocumentos.loadData()">🔄 Actualizar</button>
      </div>

      <div id="docs-table-container">
        <div class="empty-state"><div class="spinner"></div></div>
      </div>`;

    await loadData();
  }

  async function loadData() {
    const cont = document.getElementById('docs-table-container');
    if (!cont) return;
    try {
      const data = await API.get('listDocumentos');
      if (!table) {
        table = new DataTable({
          containerId: 'docs-table-container',
          searchFields: ['ID_DOCUMENTO','ENTIDAD_ID','NOMBRE_ORIGINAL','TIPO_DOCUMENTO'],
          columns: [
            { field: 'ID_DOCUMENTO',    label: 'ID Doc',        class: 'mono' },
            { field: 'ENTIDAD_TIPO',    label: 'Módulo/Tipo' },
            { field: 'ENTIDAD_ID',      label: 'ID Entidad',    class: 'mono' },
            { field: 'TIPO_DOCUMENTO',  label: 'Categoría' },
            { field: 'NOMBRE_ORIGINAL', label: 'Nombre Archivo',render: (v) => Fmt.truncate(v, 25) },
            { field: 'FECHA',           label: 'Fecha Subida',  render: Fmt.datetime },
            { field: 'USUARIO',         label: 'Subido por',    render: (v) => Fmt.truncate(v, 18) },
            { field: 'DRIVE_URL',       label: 'Drive Link',    sortable: false,
              render: (v) => `<a href="${v}" target="_blank" rel="noopener" class="btn btn-outline btn-sm">🔗 Ver en Drive</a>` },
          ],
        });
      }
      table.setData(data || []);
    } catch(err) {
      if (cont) cont.innerHTML = `<div class="alert alert-danger">❌ ${err.message}</div>`;
    }
  }

  function search(q) { table?.search(q); }

  return { render, loadData, search };
})();
