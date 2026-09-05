// ============================================================
// auth.js — Sucden Colombia · Gestión de sesión
// ============================================================

const Auth = (() => {
  const KEY_TOKEN = 'sucden_token';
  const KEY_USER  = 'sucden_user';
  const KEY_PERMS = 'sucden_permisos'; // caché local de los permisos reales del rol (vienen del backend)

  function getToken()   { return localStorage.getItem(KEY_TOKEN); }
  function getUser()    { try { return JSON.parse(localStorage.getItem(KEY_USER)); } catch { return null; } }
  function isLoggedIn() { return !!getToken() && !!getUser(); }

  function saveSession(token, user) {
    localStorage.setItem(KEY_TOKEN, token);
    localStorage.setItem(KEY_USER, JSON.stringify(user));
  }

  function clearSession() {
    localStorage.removeItem(KEY_TOKEN);
    localStorage.removeItem(KEY_USER);
    localStorage.removeItem(KEY_PERMS);
  }

  // Permisos de fábrica: solo se usan como respaldo si aún no se ha
  // podido consultar al backend (p. ej. la primera vez, sin conexión).
  const ROLES_PERMISOS_DEFAULT = {
    ADMINISTRADOR: ['*'],
    GERENCIA:   ['dashboard','recepcion','lotes','calidad','produccion','inventario','empaque','despachos','documentos','reportes','novedades'],
    RECEPCION:  ['recepcion','lotes','documentos','novedades'],
    PRODUCCION: ['produccion','inventario','lotes','documentos','novedades'],
    CALIDAD:    ['calidad','lotes','documentos','novedades'],
    BODEGA:     ['inventario','empaque','lotes','documentos'],
    DESPACHOS:  ['despachos','inventario','lotes','documentos','novedades'],
    CONSULTA:   ['dashboard','lotes','calidad','produccion','inventario','despachos','reportes'],
  };

  async function login(email, password) {
    const data = await API.post('login', { email, password });
    saveSession(data.token, data.usuario);
    await refreshPermisos(); // trae los permisos reales antes de entrar a la app
    return data.usuario;
  }

  function logout() {
    clearSession();
    window.location.href = 'index.html';
  }

  function requireAuth() {
    if (!isLoggedIn()) {
      window.location.href = 'index.html';
      return false;
    }
    return true;
  }

  /**
   * Consulta al backend los permisos actuales del rol del usuario logueado
   * y los guarda en caché local. Se llama al iniciar sesión y cada vez que
   * se abre/recarga app.html, para que los cambios que haga el Administrador
   * en "Roles & Permisos" apliquen sin tener que tocar código.
   */
  async function refreshPermisos() {
    try {
      const lista = await API.get('misPermisos');
      localStorage.setItem(KEY_PERMS, JSON.stringify(lista));
    } catch (e) {
      // Sin conexión o backend caído: se sigue usando lo que haya en caché
      // (o los permisos de fábrica si nunca se pudo consultar).
    }
  }

  function hasPermission(perm) {
    const user = getUser();
    if (!user) return false;
    if (user.rol === 'ADMINISTRADOR') return true; // el admin siempre ve todo

    let perms;
    try { perms = JSON.parse(localStorage.getItem(KEY_PERMS)); } catch { perms = null; }
    if (!Array.isArray(perms)) perms = ROLES_PERMISOS_DEFAULT[user.rol] || [];

    return perms.indexOf('*') !== -1 || perms.indexOf(perm) !== -1;
  }

  return {
    getToken, getUser, isLoggedIn, login, logout, requireAuth,
    hasPermission, saveSession, refreshPermisos,
    ROLES_PERMISOS: ROLES_PERMISOS_DEFAULT,
  };
})();
