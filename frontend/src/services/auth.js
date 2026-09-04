// ============================================================
// auth.js — Sucden Colombia · Gestión de sesión
// ============================================================

const Auth = (() => {
  const KEY_TOKEN = 'sucden_token';
  const KEY_USER  = 'sucden_user';

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
  }

  async function login(email, password) {
    const data = await API.post('login', { email, password });
    saveSession(data.token, data.usuario);
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

  function hasPermission(perm) {
    const user = getUser();
    if (!user) return false;
    // El administrador siempre tiene acceso
    if (user.rol === 'ADMINISTRADOR') return true;
    const perms = {
      GERENCIA:   ['dashboard','lotes','recepciones','calidad','produccion','inventario','empaque','despachos','documentos','reportes','novedades'],
      RECEPCION:  ['recepcion','lotes','documentos','novedades'],
      PRODUCCION: ['produccion','inventario','lotes','documentos','novedades'],
      CALIDAD:    ['calidad','lotes','documentos','novedades'],
      BODEGA:     ['inventario','empaque','lotes','documentos'],
      DESPACHOS:  ['despachos','inventario','lotes','documentos','novedades'],
      CONSULTA:   ['dashboard','lotes','calidad','produccion','inventario','despachos','reportes'],
    };
    return (perms[user.rol] || []).includes(perm);
  }

  return { getToken, getUser, isLoggedIn, login, logout, requireAuth, hasPermission, saveSession };
})();
