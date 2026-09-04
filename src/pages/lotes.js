// ============================================================
// lotes.js — Sucden Colombia · Módulo Maestro de Lotes
// ============================================================

const PageLotes = (() => {
  let table;

  async function render(container, params = {}) {
    container.innerHTML = `
      <div class="page-header">
        <div class="page-title-group">
          <h1 class="page-title">Maestro de Lotes</h1>
          <p class="page-subtitle">Gestión y trazabilidad completa de lotes de café</p>
        </div>
      </div>

      <div class="filter-bar">
        <div class="search-input" style="position:relative">
          <span class="search-icon">🔍</span>
          <input type="text" class="form-control" id="search-lotes" placeholder="Buscar por ID, tipo, municipio..." oninput="PageLotes.search(this.value)">
        </div>
        <select class="form-control" style="width:200px" id="filter-estado-lote" onchange="PageLotes.filterEstado(this.value)">
          <option value="">Todos los estados</option>
          <option value="RECIBIDO">Recibido</option>
          <option value="EN_CALIDAD">En Calidad</option>
          <option value="APROBADO">Aprobado</option>
          <option value="RECHAZADO">Rechazado</option>
          <option value="BLOQUEADO">Bloqueado</option>
          <option value="EN_PROCESO">En Proceso</option>
          <option value="PROCESADO">Procesado</option>
          <option value="EMPACADO">Empacado</option>
          <option value="DESPACHADO">Despachado</option>
        </select>
        <button class="btn btn-outline btn-sm" onclick="PageLotes.loadData()">🔄 Actualizar</button>
      </div>

      <div id="lotes-table-container">
        <div class="empty-state"><div class="spinner"></div></div>
      </div>

      <!-- Modal detalle/trazabilidad -->
      <div class="modal-backdrop modal-xl" id="modal-lote-detalle">
        <div class="modal">
          <div class="modal-header">
            <h3 class="modal-title" id="modal-lote-titulo">Trazabilidad del Lote</h3>
            <button class="modal-close" onclick="Modal.close('modal-lote-detalle')">✕</button>
          </div>
          <div class="modal-body" id="modal-lote-body">
            <div class="empty-state"><div class="spinner"></div></div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" onclick="Modal.close('modal-lote-detalle')">Cerrar</button>
          </div>
        </div>
      </div>`;

    await loadData();

    // Si se pasó un ID específico, abrir el detalle
    if (params.id) openDetalle(params.id);
  }

  async function loadData() {
    try {
      const data = await API.get('listLotes');
      if (!table) {
        table = new DataTable({
          containerId: 'lotes-table-container',
          searchFields: ['ID_LOTE','TIPO_CAFE','MUNICIPIO','VARIEDAD'],
          pageSize: 20,
          columns: [
            { field: 'ID_LOTE',          label: 'ID Lote',    class: 'mono' },
            { field: 'FECHA_RECEPCION',  label: 'Recepción',  render: Fmt.date },
            { field: 'TIPO_CAFE',        label: 'Tipo de Café' },
            { field: 'KG_RECEPCION',     label: 'Kg Recibidos', render: (v) => `<strong>${Fmt.kg(v, 1)}</strong>` },
            { field: 'MUNICIPIO',        label: 'Municipio',  render: (v) => Fmt.truncate(v, 18) },
            { field: 'VARIEDAD',         label: 'Variedad',   render: (v) => Fmt.truncate(v, 15) },
            { field: 'ESTADO',           label: 'Estado',     render: Fmt.badge },
            { field: 'CREATED_BY',       label: 'Registrado por', render: (v) => Fmt.truncate(v, 20) },
            { field: 'ID_LOTE',          label: 'Acciones',   sortable: false,
              render: (v) => `<button class="btn btn-outline btn-sm" onclick="event.stopPropagation();PageLotes.openDetalle('${v}')">🔍 Trazabilidad</button>` },
          ],
          onRowClick: (row) => openDetalle(row.ID_LOTE),
        });
      }
      table.setData(data || []);
    } catch(err) {
      document.getElementById('lotes-table-container').innerHTML =
        `<div class="alert alert-danger"><span class="alert-icon">❌</span><div>${err.message}</div></div>`;
    }
  }

  async function openDetalle(idLote) {
    Modal.open('modal-lote-detalle');
    const body = document.getElementById('modal-lote-body');
    const titulo = document.getElementById('modal-lote-titulo');
    if (titulo) titulo.textContent = `Trazabilidad — ${idLote}`;
    body.innerHTML = '<div class="empty-state"><div class="spinner"></div><div class="empty-msg">Cargando trazabilidad...</div></div>';

    try {
      const t = await API.get('trazabilidadLote', { id: idLote });
      body.innerHTML = buildTrazabilidad(t);
    } catch(err) {
      body.innerHTML = `<div class="alert alert-danger">❌ ${err.message}</div>`;
    }
  }

  function buildTrazabilidad(t) {
    const lote = t.lote || {};
    const events = [];

    // Construir línea de tiempo
    if (t.recepciones?.length) {
      t.recepciones.forEach(r => {
        events.push({
          icon: '📥', status: 'done', title: 'Recepción',
          date: `${Fmt.date(r.FECHA)} ${r.HORA || ''}`,
          detail: `${Fmt.kg(r.PESO_NETO_KG, 1)} netos · ${r.SACOS} sacos · Humedad: ${Fmt.pct(r.HUMEDAD_PCT)}`,
          id: r.ID_RECEPCION,
        });
      });
    }
    if (t.calidades?.length) {
      t.calidades.forEach(c => {
        const cls = c.RESULTADO === 'APROBADO' ? 'done' : c.RESULTADO === 'RECHAZADO' ? 'blocked' : 'active';
        events.push({
          icon: '🔬', status: cls, title: 'Control de Calidad',
          date: Fmt.date(c.FECHA),
          detail: `Resultado: ${c.RESULTADO} · Humedad: ${Fmt.pct(c.HUMEDAD_PCT)} · ${c.CLASIFICACION || ''} ${c.OBSERVACIONES ? '· ' + c.OBSERVACIONES : ''}`,
          id: c.ID_CALIDAD,
        });
      });
    }
    if (t.producciones?.length) {
      t.producciones.forEach(p => {
        events.push({
          icon: '⚙️', status: p.ESTADO === 'FINALIZADO' ? 'done' : 'active',
          title: 'Producción / Trilla',
          date: `${Fmt.date(p.FECHA)} ${p.HORA_INICIO || ''} – ${p.HORA_FIN || ''}`,
          detail: `Kg entrada: ${Fmt.kg(p.KG_ENTRADA, 1)} · Excelso: ${Fmt.kg(p.KG_EXCELSO, 1)} · Rendimiento: ${Fmt.pct(p.RENDIMIENTO_PCT)} · Productividad: ${Fmt.number(p.PRODUCTIVIDAD_KG_H, 1)} kg/h`,
          id: p.ID_PRODUCCION,
        });
      });
    }
    if (t.empaques?.length) {
      t.empaques.forEach(e => {
        events.push({
          icon: '📦', status: 'done', title: 'Empaque',
          date: Fmt.date(e.FECHA),
          detail: `${e.PRESENTACION} · ${e.CANTIDAD_SACOS} sacos · ${Fmt.kg(e.PESO_TOTAL_KG, 1)} total`,
          id: e.ID_EMPAQUE,
        });
      });
    }
    if (t.despachos?.length) {
      t.despachos.forEach(d => {
        events.push({
          icon: '🚢', status: d.ESTADO === 'CONFIRMADO' ? 'done' : 'active',
          title: 'Despacho / Exportación',
          date: Fmt.date(d.FECHA),
          detail: `Cliente: ${d.CLIENTE} · ${d.PAIS_DESTINO || ''} · ${Fmt.kg(d.KG_TOTAL, 1)} · ${d.CONTENEDOR || ''} · BL: ${d.BL || '—'}`,
          id: d.ID_DESPACHO,
        });
      });
    }

    // Documentos asociados
    const docsHtml = t.documentos?.length
      ? `<div class="section-title mt-4">Documentos y Fotografías (${t.documentos.length})</div>
         <div style="display:flex;gap:var(--sp-3);flex-wrap:wrap">
           ${t.documentos.map(d => {
             const isImg = (d.MIME_TYPE || '').startsWith('image/');
             return `<a href="${d.DRIVE_URL}" target="_blank" rel="noopener" style="
               display:flex;flex-direction:column;align-items:center;gap:4px;
               padding:8px;border:1px solid var(--border-subtle);border-radius:var(--r-md);
               min-width:80px;max-width:100px;text-align:center;color:var(--text-secondary);
               font-size:10px;text-decoration:none;transition:all 0.2s"
               onmouseover="this.style.borderColor='var(--gold-400)'"
               onmouseout="this.style.borderColor='var(--border-subtle)'">
               <span style="font-size:28px">${isImg ? '🖼️' : '📄'}</span>
               <span style="word-break:break-all">${Fmt.truncate(d.NOMBRE_ORIGINAL, 20)}</span>
             </a>`;
           }).join('')}
         </div>`
      : '';

    const timelineHtml = events.length
      ? `<div class="timeline">${events.map((ev, idx) => `
          <div class="timeline-item">
            <div class="timeline-dot ${ev.status}">${ev.icon}</div>
            <div class="timeline-content">
              <div class="d-flex align-center justify-between">
                <div class="timeline-title">${ev.title}</div>
                <span class="fs-xs text-muted font-mono" style="font-family:var(--font-mono)">${ev.id}</span>
              </div>
              <div class="timeline-date">${ev.date}</div>
              <div class="timeline-body">
                <p style="font-size:var(--text-sm);color:var(--text-secondary)">${ev.detail}</p>
              </div>
            </div>
          </div>`).join('')}</div>`
      : '<div class="empty-state"><span class="empty-icon">☕</span><div class="empty-msg">Sin eventos registrados aún</div></div>';

    return `
      <!-- Resumen del lote -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:var(--sp-3);margin-bottom:var(--sp-6)">
        ${[
          ['ID Lote', lote.ID_LOTE, 'mono'],
          ['Tipo de Café', lote.TIPO_CAFE, ''],
          ['Kg Recibidos', Fmt.kg(lote.KG_RECEPCION, 1), ''],
          ['Estado', Fmt.badge(lote.ESTADO), ''],
          ['Recepción', Fmt.date(lote.FECHA_RECEPCION), ''],
          ['Municipio', lote.MUNICIPIO || '—', ''],
        ].map(([k, v, cls]) => `
          <div style="background:var(--bg-elevated);padding:var(--sp-3);border-radius:var(--r-md);border:1px solid var(--border-subtle)">
            <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px">${k}</div>
            <div class="${cls}" style="font-size:var(--text-sm);font-weight:600">${v}</div>
          </div>`).join('')}
      </div>

      <div class="section-title">Línea de Tiempo de Trazabilidad</div>
      ${timelineHtml}
      ${docsHtml}
    `;
  }

  function search(q)        { table?.search(q); }
  function filterEstado(v)  { table?.filter('ESTADO', v); }

  return { render, loadData, openDetalle, search, filterEstado };
})();
window.PageLotes = PageLotes;
