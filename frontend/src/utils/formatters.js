// ============================================================
// formatters.js — Sucden Colombia · Utilidades de formato
// ============================================================

const Fmt = (() => {
  /** Formatea número con separadores de miles */
  function number(n, decimals = 0) {
    const v = parseFloat(n);
    if (isNaN(v)) return '—';
    return v.toLocaleString('es-CO', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  /** Formatea kg */
  function kg(n, decimals = 1) {
    const v = parseFloat(n);
    if (isNaN(v)) return '—';
    return `${number(v, decimals)} kg`;
  }

  /** Formatea porcentaje */
  function pct(n, decimals = 1) {
    const v = parseFloat(n);
    if (isNaN(v)) return '—';
    return `${number(v, decimals)}%`;
  }

  /** Formatea fecha ISO a DD/MM/AAAA */
  function date(d) {
    if (!d) return '—';
    try {
      const dt = typeof d === 'string' ? new Date(d.includes('T') ? d : d + 'T00:00:00') : new Date(d);
      return dt.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch { return String(d); }
  }

  /** Formatea fecha y hora */
  function datetime(d) {
    if (!d) return '—';
    try {
      const dt = new Date(d);
      return dt.toLocaleString('es-CO', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return String(d); }
  }

  /** Genera badge HTML según estado */
  function badge(estado) {
    if (!estado) return '';
    const cls = estado.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z_]/g, '');
    return `<span class="badge badge-${cls}">${estado}</span>`;
  }

  /** Trunca texto largo */
  function truncate(text, max = 40) {
    if (!text) return '—';
    const s = String(text);
    return s.length > max ? s.slice(0, max) + '…' : s;
  }

  /** Formatea ID con link de trazabilidad */
  function idLink(id, page) {
    if (!id) return '—';
    return `<button class="link-btn" data-nav="${page}" data-id="${id}">${id}</button>`;
  }

  /** Formatea horas decimales a HH:MM */
  function hours(h) {
    const n = parseFloat(h);
    if (isNaN(n)) return '—';
    const hrs = Math.floor(n);
    const mins = Math.round((n - hrs) * 60);
    return `${String(hrs).padStart(2,'0')}:${String(mins).padStart(2,'0')} h`;
  }

  /** Fecha de hoy AAAA-MM-DD */
  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  /** Hora actual HH:MM */
  function currentTime() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }

  return { number, kg, pct, date, datetime, badge, truncate, idLink, hours, today, currentTime };
})();

// ============================================================
// validators.js — Sucden Colombia · Validaciones frontend
// ============================================================

const Validators = (() => {
  function required(value, name) {
    if (!value || String(value).trim() === '') return `${name} es obligatorio`;
    return null;
  }

  function positive(value, name) {
    const n = parseFloat(value);
    if (isNaN(n) || n <= 0) return `${name} debe ser mayor a cero`;
    return null;
  }

  function nonNegative(value, name) {
    const n = parseFloat(value);
    if (isNaN(n) || n < 0) return `${name} debe ser mayor o igual a cero`;
    return null;
  }

  function email(value, name = 'Email') {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return `${name} no tiene formato válido`;
    return null;
  }

  function dateValid(value, name = 'Fecha') {
    if (!value) return `${name} es obligatorio`;
    const d = new Date(value);
    if (isNaN(d.getTime())) return `${name} no es una fecha válida`;
    return null;
  }

  function timeOrder(inicio, fin, nameI = 'Hora inicio', nameF = 'Hora fin') {
    if (!inicio || !fin) return null;
    if (fin <= inicio) return `${nameF} debe ser posterior a ${nameI}`;
    return null;
  }

  function maxKg(value, max, name = 'Cantidad') {
    const n = parseFloat(value);
    const m = parseFloat(max);
    if (isNaN(n)) return null;
    if (n > m) return `${name} no puede superar ${Fmt.kg(m)}`;
    return null;
  }

  /**
   * Valida un formulario y muestra errores inline
   * @param {HTMLFormElement} form
   * @param {object} rules — { fieldName: [fn, ...] }
   * @returns {boolean} isValid
   */
  function validateForm(form, rules) {
    let valid = true;
    // Limpiar errores previos
    form.querySelectorAll('.form-error').forEach(el => el.remove());
    form.querySelectorAll('.form-control.error').forEach(el => el.classList.remove('error'));

    Object.entries(rules).forEach(([name, fns]) => {
      const input = form.querySelector(`[name="${name}"]`) || form.querySelector(`#${name}`);
      if (!input) return;
      const value = input.value;
      for (const fn of fns) {
        const err = fn(value);
        if (err) {
          valid = false;
          input.classList.add('error');
          const span = document.createElement('span');
          span.className = 'form-error';
          span.textContent = '⚠ ' + err;
          input.parentNode.appendChild(span);
          break;
        }
      }
    });
    return valid;
  }

  return { required, positive, nonNegative, email, dateValid, timeOrder, maxKg, validateForm };
})();
