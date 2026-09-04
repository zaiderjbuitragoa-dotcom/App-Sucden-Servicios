// ============================================================
// toast.js — Sucden Colombia · Notificaciones
// ============================================================

const Toast = (() => {
  let container;
  function getContainer() {
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  const ICONS = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

  function show(type, title, message, duration = 4000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${ICONS[type] || 'ℹ️'}</span>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        ${message ? `<div class="toast-msg">${message}</div>` : ''}
      </div>
      <button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:16px;padding:4px;">✕</button>
    `;
    getContainer().appendChild(toast);
    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  return {
    success: (t, m) => show('success', t, m),
    error:   (t, m) => show('error', t, m, 6000),
    warning: (t, m) => show('warning', t, m),
    info:    (t, m) => show('info', t, m),
  };
})();

// ============================================================
// modal.js — Sucden Colombia · Sistema de modales
// ============================================================

const Modal = (() => {
  /** Abre un modal dado su ID */
  function open(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('open');
    document.body.style.overflow = 'hidden';
    el.querySelector('.modal')?.focus?.();
  }

  /** Cierra un modal dado su ID */
  function close(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('open');
    document.body.style.overflow = '';
  }

  /** Cierra todos los modales */
  function closeAll() {
    document.querySelectorAll('.modal-backdrop.open').forEach(m => {
      m.classList.remove('open');
    });
    document.body.style.overflow = '';
  }

  /**
   * Crea y muestra un modal de confirmación
   * @param {object} opts — { title, message, confirmText, cancelText, type, onConfirm }
   */
  function confirm({ title, message, confirmText = 'Confirmar', cancelText = 'Cancelar',
                     type = 'primary', onConfirm }) {
    const id = 'confirm-modal-' + Date.now();
    const btnClass = type === 'danger' ? 'btn-danger' : 'btn-primary';
    const el = document.createElement('div');
    el.className = 'modal-backdrop modal-sm open';
    el.id = id;
    el.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button class="modal-close" onclick="Modal.close('${id}');document.getElementById('${id}').remove()">✕</button>
        </div>
        <div class="modal-body">
          <p style="color:var(--text-secondary);font-size:var(--text-sm)">${message}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="Modal.close('${id}');document.getElementById('${id}').remove()">${cancelText}</button>
          <button id="${id}-confirm" class="btn ${btnClass}">${confirmText}</button>
        </div>
      </div>
    `;
    document.body.appendChild(el);
    document.getElementById(`${id}-confirm`).onclick = async () => {
      await onConfirm?.();
      el.remove();
    };
    // Cerrar con ESC
    el.addEventListener('keydown', e => { if (e.key === 'Escape') el.remove(); });
  }

  // Cerrar modal al click en backdrop
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-backdrop')) {
      e.target.classList.remove('open');
      document.body.style.overflow = '';
    }
  });

  // Cerrar con ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAll();
  });

  return { open, close, closeAll, confirm };
})();

// ============================================================
// table.js — Sucden Colombia · Tabla con filtros y paginación
// ============================================================

class DataTable {
  constructor(config) {
    this.config = {
      pageSize: 15,
      searchFields: [],
      ...config,
    };
    this.data       = [];
    this.filtered   = [];
    this.page       = 1;
    this.sortField  = null;
    this.sortDir    = 'asc';
    this.searchQuery = '';
  }

  setData(data) {
    this.data     = data || [];
    this.filtered = [...this.data];
    this.page     = 1;
    this.render();
  }

  search(query) {
    this.searchQuery = (query || '').toLowerCase();
    this._applyFilters();
  }

  filter(field, value) {
    // Guardar filtro activo
    if (!this._filters) this._filters = {};
    if (value === '' || value == null) delete this._filters[field];
    else this._filters[field] = value;
    this._applyFilters();
  }

  _applyFilters() {
    let result = [...this.data];
    // Búsqueda de texto
    if (this.searchQuery) {
      const fields = this.config.searchFields;
      result = result.filter(row =>
        fields.some(f => String(row[f] || '').toLowerCase().includes(this.searchQuery))
      );
    }
    // Filtros de campo exacto
    if (this._filters) {
      Object.entries(this._filters).forEach(([f, v]) => {
        result = result.filter(r => String(r[f]).toLowerCase().includes(String(v).toLowerCase()));
      });
    }
    // Ordenamiento
    if (this.sortField) {
      result.sort((a, b) => {
        const va = a[this.sortField], vb = b[this.sortField];
        const cmp = String(va).localeCompare(String(vb), 'es', { numeric: true });
        return this.sortDir === 'asc' ? cmp : -cmp;
      });
    }
    this.filtered = result;
    this.page = 1;
    this.render();
  }

  sort(field) {
    if (this.sortField === field) this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    else { this.sortField = field; this.sortDir = 'asc'; }
    this._applyFilters();
  }

  getCurrentPage() {
    const start = (this.page - 1) * this.config.pageSize;
    return this.filtered.slice(start, start + this.config.pageSize);
  }

  totalPages() { return Math.max(1, Math.ceil(this.filtered.length / this.config.pageSize)); }
  goPage(p)    { this.page = Math.max(1, Math.min(p, this.totalPages())); this.render(); }

  render() {
    const { containerId, columns, onRowClick } = this.config;
    const container = document.getElementById(containerId);
    if (!container) return;

    const rows  = this.getCurrentPage();
    const total = this.filtered.length;
    const start = (this.page - 1) * this.config.pageSize + 1;
    const end   = Math.min(this.page * this.config.pageSize, total);

    if (rows.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">☕</span>
          <div class="empty-title">Sin resultados</div>
          <div class="empty-msg">No hay registros que coincidan con tu búsqueda</div>
        </div>`;
      return;
    }

    const headerHtml = columns.map(col => {
      const sortIcon = this.sortField === col.field
        ? (this.sortDir === 'asc' ? ' ↑' : ' ↓') : '';
      return `<th ${col.sortable !== false ? `onclick="window.__dt_${containerId}?.sort('${col.field}')" style="cursor:pointer"` : ''}>${col.label}${sortIcon}</th>`;
    }).join('');

    const rowsHtml = rows.map(row => {
      const cells = columns.map(col => {
        const val = row[col.field];
        const content = col.render ? col.render(val, row) : (val || '—');
        const cls = col.class || '';
        return `<td class="${cls}">${content}</td>`;
      }).join('');
      return `<tr style="cursor:${onRowClick ? 'pointer' : 'default'}"
        onclick="window.__dt_${containerId}?._rowClick(event)"
        data-id="${row[columns[0].field] || ''}">${cells}</tr>`;
    }).join('');

    container.innerHTML = `
      <div class="table-container">
        <table class="table">
          <thead><tr>${headerHtml}</tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <div class="pagination">
          <span class="pagination-info">Mostrando ${start}–${end} de ${total} registros</span>
          <div class="pagination-pages">
            <button class="page-btn" onclick="window.__dt_${containerId}?.goPage(${this.page - 1})" ${this.page <= 1 ? 'disabled' : ''}>‹</button>
            ${this._pageButtons()}
            <button class="page-btn" onclick="window.__dt_${containerId}?.goPage(${this.page + 1})" ${this.page >= this.totalPages() ? 'disabled' : ''}>›</button>
          </div>
        </div>
      </div>`;

    // Guardar referencia global para event handlers
    window[`__dt_${containerId}`] = this;

    if (onRowClick) {
      this._currentData = rows;
    }
  }

  _pageButtons() {
    const total = this.totalPages();
    const pages = [];
    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || Math.abs(i - this.page) <= 2) {
        pages.push(`<button class="page-btn ${i === this.page ? 'active' : ''}"
          onclick="window.__dt_${this.config.containerId}?.goPage(${i})">${i}</button>`);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('<span style="color:var(--text-muted);padding:0 4px">…</span>');
      }
    }
    return pages.join('');
  }

  _rowClick(e) {
    const tr = e.currentTarget;
    const id = tr.dataset.id;
    const row = this._currentData?.find(r => String(Object.values(r)[0]) === id);
    this.config.onRowClick?.(row, tr);
  }
}
