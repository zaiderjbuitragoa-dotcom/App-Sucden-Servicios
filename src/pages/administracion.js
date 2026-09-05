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

  async function showPermisos() {
    const tEl = document.getElementById('admin-sec-title');
    const cEl = document.getElementById('admin-sec-content');
    if (tEl) tEl.textContent = 'Matriz de Roles & Permisos';
    if (!cEl) return;
    cEl.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';

    let matriz;
    try {
      matriz = await API.get('permisosMatriz');
    } catch (err) {
      cEl.innerHTML = `<div class="alert alert-danger">❌ No se pudo cargar la matriz de permisos: ${err.message}</div>`;
      return;
    }

    const roles = Object.keys(matriz).filter(r => r !== 'ADMINISTRADOR');
    const modulos = ROUTES.filter(r => r.id !== 'administracion' && r.permission);

    const estaMarcado = (rol, permiso) => {
      const perms = matriz[rol] || [];
      return perms.includes('*') || perms.includes(permiso);
    };

    cEl.innerHTML = `
      <p class="fs-xs text-muted mb-4">
        Marca o desmarca qué módulos puede ver cada rol y presiona "Guardar Cambios".
        ADMINISTRADOR siempre tiene acceso total y no se puede restringir.
        Los cambios se validan también en el backend, así que no se pueden saltar entrando por URL directa.
      </p>
      <div class="table-container">
        <table class="table" id="permisos-table">
          <thead>
            <tr>
              <th>Módulo</th>
              <th style="text-align:center">ADMINISTRADOR</th>
              ${roles.map(r => `<th style="text-align:center">${r}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${modulos.map(m => `
              <tr>
                <td>${m.icon} ${m.label}</td>
                <td style="text-align:center" title="El administrador siempre tiene acceso">✅</td>
                ${roles.map(r => `
                  <td style="text-align:center">
                    <input type="checkbox" data-rol="${r}" data-modulo="${m.permission}"
                      ${estaMarcado(r, m.permission) ? 'checked' : ''}
                      style="width:18px;height:18px;cursor:pointer">
                  </td>`).join('')}
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div style="display:flex;gap:10px;margin-top:16px">
        <button class="btn btn-primary btn-sm" id="btn-guardar-permisos" onclick="PageAdministracion.guardarPermisos()">💾 Guardar Cambios</button>
        <button class="btn btn-outline btn-sm" onclick="PageAdministracion.showPermisos()">↺ Descartar</button>
      </div>`;
  }

  async function guardarPermisos() {
    const btn = document.getElementById('btn-guardar-permisos');
    const table = document.getElementById('permisos-table');
    if (!table) return;

    // Reconstruir la matriz a partir de las casillas marcadas
    const matriz = { ADMINISTRADOR: ['*'] };
    table.querySelectorAll('input[type="checkbox"]').forEach(chk => {
      const rol = chk.dataset.rol;
      const modulo = chk.dataset.modulo;
      if (!matriz[rol]) matriz[rol] = [];
      if (chk.checked) matriz[rol].push(modulo);
    });

    if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Guardando...'; }
    try {
      await API.post('updatePermisos', { matriz });
      Toast.success('Permisos actualizados', 'Los cambios ya están activos. Cada usuario los verá al recargar o volver a iniciar sesión.');
    } catch (err) {
      Toast.error('Error al guardar', err.message);
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '💾 Guardar Cambios'; }
    }
  }

  return { render, loadSection, showPermisos, guardarPermisos };
})();
window.PageAdministracion = PageAdministracion;
