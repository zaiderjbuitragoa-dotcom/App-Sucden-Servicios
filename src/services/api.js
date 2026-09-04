// ============================================================
// api.js — Sucden Colombia · Servicio HTTP al backend
// ============================================================

const API = (() => {
  // URL del Web App de Apps Script — actualizar tras publicar
  const BASE_URL = window.SUCDEN_API_URL ||
    localStorage.getItem('sucden_api_url') ||
    'https://script.google.com/macros/s/1cfXcRoEhb1iJx8TOL3FjMsCjYZByzoDP4M3FJNfe7TjzJdBh913sm6jO/exec';

  /**
   * Petición GET genérica
   * @param {string} action — nombre de la acción (endpoint)
   * @param {object} params — parámetros adicionales
   */
  async function get(action, params = {}) {
    const token = Auth.getToken();
    const qs = new URLSearchParams({ action, token: token || '', ...params }).toString();
    const url = `${BASE_URL}?${qs}`;
    const res = await fetch(url, { method: 'GET' });
    const data = await res.json();
    if (!data.ok) throw new Error(data.message || 'Error en la solicitud');
    return data.data;
  }

  /**
   * Petición POST genérica
   * @param {string} action — nombre de la acción
   * @param {object} body   — cuerpo JSON
   */
  async function post(action, body = {}) {
    const token = Auth.getToken();
    const payload = { action, token: token || '', ...body };
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.message || 'Error en la solicitud');
    return data.data;
  }

  /**
   * Sube un archivo al backend (Base64)
   * @param {File} file
   * @param {string} entityTipo
   * @param {string} entityId
   * @param {string} tipoDocumento
   */
  async function uploadFile(file, entityTipo, entityId, tipoDocumento, notas = '') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          // Extraer base64 sin prefijo data:...
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
    const res = await fetch(`${BASE_URL}?action=health`);
    return res.json();
  }

  /** Actualiza la URL base en localStorage */
  function setBaseUrl(url) {
    localStorage.setItem('sucden_api_url', url);
    window.location.reload();
  }

  return { get, post, uploadFile, health, setBaseUrl, BASE_URL };
})();
