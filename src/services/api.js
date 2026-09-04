// ============================================================
// api.js — Sucden Colombia · Servicio HTTP al backend
// ============================================================

const API = (() => {
  function getBaseUrl() {
    return (localStorage.getItem('sucden_api_url') || window.SUCDEN_API_URL || 'https://script.google.com/macros/s/AKfycbyTyk2HfVx7_x30H_xiOkohevI15S-pdBa4cq6-Yig2t45m7Y91KBu3_-PJjGV5d5sC/exec').trim();
  }

  async function parseResponse(res) {
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      if (res.status === 404 || text.includes('404') || text.startsWith('<!DOCTYPE')) {
        throw new Error('URL de backend no encontrada o no válida (404 Not Found). Por favor configure la URL de su WebApp de Apps Script en ⚙️ API Config.');
      }
      throw new Error('Respuesta no válida del servidor: ' + text.slice(0, 80));
    }
    if (!data.ok) throw new Error(data.message || 'Error en la solicitud');
    return data.data;
  }

  /** Petición GET genérica */
  async function get(action, params = {}) {
    const token = Auth.getToken();
    const qs = new URLSearchParams({ action, token: token || '', ...params }).toString();
    const url = `${getBaseUrl()}?${qs}`;
    let res;
    try {
      res = await fetch(url, { method: 'GET' });
    } catch (err) {
      throw new Error('Error de red al conectar con Google Apps Script. Verifique su conexión o la URL configurada.');
    }
    return await parseResponse(res);
  }

  /** Petición POST genérica */
  async function post(action, body = {}) {
    const token = Auth.getToken();
    const payload = { action, token: token || '', ...body };
    let res;
    try {
      res = await fetch(getBaseUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      throw new Error('Error de red al conectar con Google Apps Script.');
    }
    return await parseResponse(res);
  }

  /** Sube un archivo al backend (Base64) */
  async function uploadFile(file, entityTipo, entityId, tipoDocumento, notas = '') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64 = e.target.result.split(',')[1];
          const ext = file.name.split('.').pop().toLowerCase();
          const result = await post('uploadDocument', {
            base64,
            fileName: file.name,
            mimeType: file.type || 'application/octet-stream',
            extension: ext,
            entityTipo,
            entityId,
            tipoDocumento,
            notas,
          });
          resolve(result);
        } catch (err) { reject(err); }
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.readAsDataURL(file);
    });
  }

  /** Health check */
  async function health() {
    const res = await fetch(`${getBaseUrl()}?action=health`);
    return await parseResponse(res);
  }

  /** Actualiza la URL base en localStorage */
  function setBaseUrl(url) {
    localStorage.setItem('sucden_api_url', url.trim());
    Toast.success('URL Guardada', 'Actualizando aplicación...');
    setTimeout(() => window.location.reload(), 600);
  }

  return { get, post, uploadFile, health, setBaseUrl, getBaseUrl, get BASE_URL() { return getBaseUrl(); } };
})();
