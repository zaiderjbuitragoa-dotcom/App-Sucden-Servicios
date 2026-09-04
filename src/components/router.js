// ============================================================
// router.js + sidebar.js — Sucden Colombia · Navegación SPA
// ============================================================

// ── Definición de rutas y menú ────────────────────────────────
const ROUTES = [
  {
    id: 'dashboard', label: 'Dashboard', icon: '📊',
    group: 'Principal', module: 'PageDashboard',
    breadcrumb: 'Dashboard',
    permission: 'dashboard',
  },
  {
    id: 'recepcion', label: 'Recepción', icon: '📥',
    group: 'Operativo', module: 'PageRecepcion',
    breadcrumb: 'Recepción de Café',
    permission: 'recepcion',
  },
  {
    id: 'lotes', label: 'Lotes', icon: '☕',
    group: 'Operativo', module: 'PageLotes',
    breadcrumb: 'Maestro de Lotes',
    permission: 'lotes',
  },
  {
    id: 'calidad', label: 'Calidad', icon: '🔬',
    group: 'Operativo', module: 'PageCalidad',
    breadcrumb: 'Control de Calidad',
    permission: 'calidad',
  },
  {
    id: 'produccion', label: 'Producción', icon: '⚙️',
    group: 'Operativo', module: 'PageProduccion',
    breadcrumb: 'Producción & Trilla',
    permission: 'produccion',
  },
  {
    id: 'inventario', label: 'Inventario', icon: '🏪',
    group: 'Operativo', module: 'PageInventario',
    breadcrumb: 'Inventario & Bodegas',
    permission: 'inventario',
  },
  {
    id: 'empaque', label: 'Empaque', icon: '📦',
    group: 'Operativo', module: 'PageEmpaque',
    breadcrumb: 'Empaque',
    permission: 'empaque',
  },
  {
    id: 'despachos', label: 'Despachos', icon: '🚢',
    group: 'Operativo', module: 'PageDespachos',
    breadcrumb: 'Despachos & Exportación',
    permission: 'despachos',
  },
  {
    id: 'documentos', label: 'Documentos', icon: '📁',
    group: 'Gestión', module: 'PageDocumentos',
    breadcrumb: 'Documentos & Fotos',
    permission: 'documentos',
  },
  {
    id: 'novedades', label: 'Novedades', icon: '⚠️',
    group: 'Gestión', module: 'PageNovedades',
    breadcrumb: 'Novedades & Incidencias',
    permission: 'novedades',
  },
  {
    id: 'reportes', label: 'Reportes', icon: '📈',
    group: 'Gestión', module: 'PageReportes',
    breadcrumb: 'Reportes & Exportación',
    permission: 'reportes',
  },
  {
    id: 'administracion', label: 'Administración', icon: '⚙️',
    group: 'Sistema', module: 'PageAdministracion',
    breadcrumb: 'Administración',
    permission: 'admin',
    adminOnly: true,
  },
];

// ── Router SPA ────────────────────────────────────────────────
const Router = (() => {
  let currentPage = null;
  let currentRoute = null;

  function navigate(pageId, params = {}) {
    const route = ROUTES.find(r => r.id === pageId);
    if (!route) return;

    // Bloquea el acceso directo (por URL/hash) a módulos sin permiso
    if (route.permission && !Auth.hasPermission(route.permission)) {
      const content = document.getElementById('page-content');
      if (content) {
        content.innerHTML = `<div class="empty-state"><span class="empty-icon">🔒</span><div class="empty-title">Acceso no autorizado</div><div class="empty-msg">Tu rol (${Auth.getUser()?.rol || ''}) no tiene permiso para ver "${route.label}".</div></div>`;
      }
      const bc = document.getElementById('breadcrumb-current');
      if (bc) bc.textContent = route.breadcrumb;
      document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
      history.replaceState({ page: pageId }, '', `#${pageId}`);
      return;
    }

    // Actualizar sidebar activo
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === pageId);
    });

    // Actualizar breadcrumb
    const bc = document.getElementById('breadcrumb-current');
    if (bc) bc.textContent = route.breadcrumb;

    // Renderizar página
    const content = document.getElementById('page-content');
    if (!content) return;
    content.innerHTML = '<div class="loading-overlay" style="position:fixed;inset:0;background:rgba(15,8,5,0.5);display:flex;align-items:center;justify-content:center;z-index:999"><div class="spinner" style="width:36px;height:36px"></div></div>';

    currentRoute = route;

    // Llamar al módulo de página correspondiente
    let mod = window[route.module];
    if (!mod) {
      try { mod = window[route.module] || eval(route.module); } catch(e) {}
    }

    if (mod && typeof mod.render === 'function') {
      setTimeout(() => {
        document.querySelector('.loading-overlay')?.remove();
        mod.render(content, params);
        currentPage = route.id;
        history.replaceState({ page: pageId }, '', `#${pageId}`);
      }, 100);
    } else {
      content.innerHTML = `<div class="empty-state"><span class="empty-icon">🚧</span><div class="empty-title">Módulo en construcción</div><div class="empty-msg">${route.label} estará disponible próximamente.</div></div>`;
    }
  }

  function init() {
    let hash = window.location.hash.replace('#', '');
    if (!hash || (ROUTES.find(r => r.id === hash)?.permission && !Auth.hasPermission(ROUTES.find(r => r.id === hash).permission))) {
      const first = ROUTES.find(r => !r.permission || Auth.hasPermission(r.permission));
      hash = first ? first.id : 'dashboard';
    }
    navigate(hash);
  }

  function current() { return currentPage; }
  function currentRouteObj() { return currentRoute; }

  return { navigate, init, current, currentRouteObj };
})();

// ── Sidebar Builder ───────────────────────────────────────────
function buildSidebar() {
  const user = Auth.getUser();
  const nav  = document.getElementById('sidebar-nav');
  if (!nav) return;

  let html = '';
  let lastGroup = null;

  ROUTES.forEach(route => {
    // Filtrar por permisos reales del rol (no solo adminOnly)
    if (route.adminOnly && user?.rol !== 'ADMINISTRADOR') return;
    if (route.permission && !Auth.hasPermission(route.permission)) return;

    if (route.group !== lastGroup) {
      html += `<div class="nav-group-label">${route.group}</div>`;
      lastGroup = route.group;
    }
    html += `
      <div class="nav-item" data-page="${route.id}" onclick="Router.navigate('${route.id}')" role="button" tabindex="0"
           onkeydown="if(event.key==='Enter')Router.navigate('${route.id}')">
        <span class="nav-icon">${route.icon}</span>
        <span class="nav-label">${route.label}</span>
      </div>`;
  });

  nav.innerHTML = html;

  // User card
  const userCard = document.getElementById('sidebar-user');
  if (userCard && user) {
    const initials = (user.nombre || 'U').split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase();
    userCard.innerHTML = `
      <div class="user-card">
        <div class="user-avatar">${initials}</div>
        <div class="user-info">
          <div class="user-name">${user.nombre || user.email}</div>
          <div class="user-role">${user.rol}</div>
        </div>
      </div>`;
  }
}

// ── Sidebar toggle ────────────────────────────────────────────
function initSidebarToggle() {
  const toggle = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');
  const wrapper = document.getElementById('main-wrapper');

  if (!toggle || !sidebar) return;

  const isMobile = () => window.innerWidth <= 768;

  toggle.addEventListener('click', () => {
    if (isMobile()) {
      sidebar.classList.toggle('mobile-open');
    } else {
      sidebar.classList.toggle('collapsed');
      wrapper?.classList.toggle('sidebar-collapsed');
    }
  });

  // Cerrar sidebar en mobile al navegar
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      if (isMobile()) sidebar.classList.remove('mobile-open');
    });
  });
}
