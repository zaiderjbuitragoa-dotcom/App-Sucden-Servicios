// ============================================================
// administracion.js — Sucden Colombia · Módulo de Administración
// ============================================================

const PageAdministracion = (() => {

  async function render(container) {
    container.innerHTML = `
      <div class="page-header">
        <div class="page-title-group">
          <h1 class="page-title">Administración del Sistema</h1>
          <p class="page-subtitle">Gestión de usuarios, proveedores, fincas, maquinaria y auditoría</p>
        </div>
      </div>

      <div class="form-grid form-grid-3 mb-6">
        <div class="card p-5">
          <div style="font-size:24px;margin-bottom:8px">👥</div>
          <div style="font-weight:700">Usuarios & Roles</div>
          <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:12px">Control de accesos y perfiles</div>
          <button class="btn btn-outline btn-sm" onclick="PageAdministracion.loadSection('listUsuarios','Usuarios Registrados')">Ver Usuarios</button>
        </div>

        <div class="card p-5">
          <div style="font-size:24px;margin-bottom:8px">🚚</div>
          <div style="font-weight:700">Proveedores & Productores</div>
          <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:12px">Maestros de origen de café</div>
          <button class="btn btn-outline btn-sm" onclick="PageAdministracion.loadSection('listProveedores','Proveedores')">Ver Proveedores</button>
        </div>

        <div class="card p-5">
          <div style="font-size:24px;margin-bottom:8px">🛡️</div>
          <div style="font-weight:700">Logs de Auditoría</div>
          <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:12px">Trazabilidad de acciones de usuarios</div>
          <button class="btn btn-outline btn-sm" onclick="PageAdministracion.loadSection('auditoria','Auditoría del Sistema')">Ver Audit Logs</button>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title" id="admin-sec-title">Vista General de Administración</div>
        </div>
        <div class="card-body" id="admin-sec-content">
          <div class="empty-state">
            <span class="empty-icon">⚙️</span>
            <div class="empty-title">Seleccione una sección</div>
            <div class="empty-msg">Administre los datos maestros y revise los registros de seguridad del sistema.</div>
          </div>
        </div>
      </div>`;
  }

  async function loadSection(action, title) {
    const tEl = document.getElementById('admin-sec-title');
    const cEl = document.getElementById('admin-sec-content');
    if (tEl) tEl.textContent = title;
    if (cEl) cEl.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';

    try {
      const data = await API.get(action);
      if (Array.isArray(data) && data.length > 0) {
        const headers = Object.keys(data[0]);
        cEl.innerHTML = `
          <div class="table-container">
            <table class="table">
              <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
              <tbody>
                ${data.map(row => `<tr>${headers.map(h => `<td>${row[h] !== null ? row[h] : '—'}</td>`).join('')}</tr>`).join('')}
              </tbody>
            </table>
          </div>`;
      } else {
        cEl.innerHTML = '<div class="empty-state"><div class="empty-msg">No hay registros.</div></div>';
      }
    } catch(err) {
      if (cEl) cEl.innerHTML = `<div class="alert alert-danger">❌ ${err.message}</div>`;
    }
  }

  return { render, loadSection };
})();
window.PageAdministracion = PageAdministracion;
