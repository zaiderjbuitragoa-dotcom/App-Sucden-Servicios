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

        <div class="card p-5">
          <div style="font-size:24px;margin-bottom:8px">🔐</div>
          <div style="font-weight:700">Roles & Permisos</div>
          <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:12px">Qué módulos ve cada rol</div>
          <button class="btn btn-outline btn-sm" onclick="PageAdministracion.showPermisos()">Ver Matriz de Permisos</button>
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

  function showPermisos() {
    const tEl = document.getElementById('admin-sec-title');
    const cEl = document.getElementById('admin-sec-content');
    if (tEl) tEl.textContent = 'Matriz de Roles & Permisos';
    if (!cEl) return;

    const roles = Object.keys(Auth.ROLES_PERMISOS);
    const modulos = ROUTES.filter(r => r.id !== 'administracion');

    const check = (rol, permiso) => {
      const perms = Auth.ROLES_PERMISOS[rol] || [];
      const tiene = perms.includes('*') || perms.includes(permiso);
      return tiene
        ? '<span style="color:#16A34A;font-weight:700">✅</span>'
        : '<span style="color:#CBD5E1">—</span>';
    };

    cEl.innerHTML = `
      <p class="fs-xs text-muted mb-4">
        Esta matriz refleja los permisos que ya trae configurados el sistema por rol
        (definidos en <code>src/services/auth.js</code> y validados también en el backend, <code>Config.gs</code>).
        Administración y Auditoría son exclusivos de ADMINISTRADOR.
      </p>
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>Módulo</th>
              ${roles.map(r => `<th style="text-align:center">${r}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${modulos.map(m => `
              <tr>
                <td>${m.icon} ${m.label}</td>
                ${roles.map(r => `<td style="text-align:center">${r === 'ADMINISTRADOR' ? '✅' : check(r, m.permission)}</td>`).join('')}
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <p class="fs-xs text-muted mt-4">
        ¿Necesitas cambiar qué ve un rol? Por ahora se ajusta editando esa lista de permisos en el código
        (frontend y backend) y volviendo a publicar. Si quieres, puedo dejarlo editable desde aquí mismo
        en una próxima mejora.
      </p>`;
  }

  return { render, loadSection, showPermisos };
})();
window.PageAdministracion = PageAdministracion;
