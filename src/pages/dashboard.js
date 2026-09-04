// ============================================================
// dashboard.js — Sucden Colombia · Dashboard ejecutivo
// ============================================================

const PageDashboard = (() => {
  let charts = {};

  async function render(container) {
    container.innerHTML = `
      <div class="page-header">
        <div class="page-title-group">
          <h1 class="page-title">Dashboard Ejecutivo</h1>
          <p class="page-subtitle">Sucden Colombia · Trazabilidad de Café en tiempo real</p>
        </div>
        <div class="page-actions">
          <span id="dash-updated" class="fs-xs text-muted">Actualizando...</span>
          <button class="btn btn-outline btn-sm" onclick="PageDashboard.refresh()">🔄 Actualizar</button>
        </div>
      </div>

      <!-- KPI Grid -->
      <div class="kpi-grid" id="kpi-grid">
        ${[1,2,3,4,5,6,7,8,9,10].map(() => `
          <div class="kpi-card">
            <div class="kpi-header"><div class="kpi-icon coffee" style="background:var(--bg-elevated)"></div></div>
            <div class="kpi-value" style="background:var(--bg-elevated);height:32px;border-radius:4px"></div>
            <div class="kpi-label" style="background:var(--bg-elevated);height:12px;border-radius:4px;width:60%"></div>
          </div>`).join('')}
      </div>

      <!-- Alertas -->
      <div id="alertas-section" class="mb-6"></div>

      <!-- Gráficos y tablas -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-5);margin-bottom:var(--sp-5)">
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Producción por Turno</div>
              <div class="card-subtitle">Últimos 30 días</div>
            </div>
          </div>
          <div class="card-body" style="height:220px;position:relative">
            <canvas id="chart-turnos"></canvas>
          </div>
        </div>
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Producción por Máquina</div>
              <div class="card-subtitle">Últimos 30 días · kg excelso</div>
            </div>
          </div>
          <div class="card-body" style="height:220px;position:relative">
            <canvas id="chart-maquinas"></canvas>
          </div>
        </div>
      </div>

      <!-- Lotes por estado -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-5);margin-bottom:var(--sp-5)">
        <div class="card">
          <div class="card-header">
            <div class="card-title">Últimas Recepciones</div>
            <button class="btn btn-outline btn-sm" onclick="Router.navigate('recepcion')">Ver todas</button>
          </div>
          <div id="table-recepciones"></div>
        </div>
        <div class="card">
          <div class="card-header">
            <div class="card-title">Últimos Despachos</div>
            <button class="btn btn-outline btn-sm" onclick="Router.navigate('despachos')">Ver todos</button>
          </div>
          <div id="table-despachos"></div>
        </div>
      </div>

      <!-- Inventario resumido -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Inventario Actual por Lote</div>
            <div class="card-subtitle">Stock disponible en kg</div>
          </div>
          <button class="btn btn-outline btn-sm" onclick="Router.navigate('inventario')">Ver inventario completo</button>
        </div>
        <div id="table-inventario"></div>
      </div>`;

    await loadData();
  }

  async function loadData() {
    try {
      const data = await API.get('dashboard');
      renderKPIs(data.kpis);
      renderAlertas(data.alertas);
      renderChartTurnos(data.prodPorTurno);
      renderChartMaquinas(data.prodPorMaquina);
      renderTableRecepciones(data.ultimasRecepciones);
      renderTableDespachos(data.ultimosDespachos);
      renderTableInventario(data.inventario);

      const el = document.getElementById('dash-updated');
      if (el) el.textContent = 'Actualizado: ' + Fmt.datetime(new Date().toISOString());
    } catch (err) {
      Toast.error('Error al cargar dashboard', err.message);
    }
  }

  function renderKPIs(kpis) {
    const grid = document.getElementById('kpi-grid');
    if (!grid || !kpis) return;

    const cards = [
      { label: 'Kg Recibidos Hoy',   value: Fmt.kg(kpis.kgRecibidosHoy, 0),  icon: '📥', iconClass: 'coffee' },
      { label: 'Kg en Producción',   value: Fmt.kg(kpis.kgEnProduccion, 0),   icon: '⚙️', iconClass: 'info' },
      { label: 'Kg Trillados Hoy',   value: Fmt.kg(kpis.kgTrilladosHoy, 0),   icon: '✨', iconClass: 'success' },
      { label: 'Inventario Total',   value: Fmt.kg(kpis.kgInventarioTotal, 0), icon: '🏪', iconClass: 'gold' },
      { label: 'Kg Despachados',     value: Fmt.kg(kpis.kgDespachado, 0),      icon: '🚢', iconClass: 'olive' },
      { label: 'Total Lotes',        value: Fmt.number(kpis.totalLotes),        icon: '☕', iconClass: 'coffee' },
      { label: 'Lotes Pendientes',   value: Fmt.number(kpis.lotesPendientes),   icon: '⏳', iconClass: 'warning' },
      { label: 'Lotes Bloqueados',   value: Fmt.number(kpis.lotesBloqueados),   icon: '🚫', iconClass: 'danger' },
      { label: 'Rendimiento Prom.',  value: Fmt.pct(kpis.rendimientoProm),       icon: '📊', iconClass: 'success' },
      { label: 'Productividad kg/h', value: Fmt.number(kpis.productividadProm, 1) + ' kg/h', icon: '⚡', iconClass: 'gold' },
    ];

    grid.innerHTML = cards.map(c => `
      <div class="kpi-card">
        <div class="kpi-header">
          <div class="kpi-icon ${c.iconClass}">${c.icon}</div>
        </div>
        <div class="kpi-value">${c.value}</div>
        <div class="kpi-label">${c.label}</div>
      </div>`).join('');
  }

  function renderAlertas(alertas) {
    const sec = document.getElementById('alertas-section');
    if (!sec || !alertas?.length) { if(sec) sec.innerHTML = ''; return; }
    sec.innerHTML = alertas.map(a => `
      <div class="alert alert-${a.tipo}" style="margin-bottom:var(--sp-2)">
        <span class="alert-icon">${a.tipo === 'danger' ? '🚫' : a.tipo === 'warning' ? '⚠️' : 'ℹ️'}</span>
        <div class="alert-content"><div class="alert-title">${a.mensaje}</div></div>
      </div>`).join('');
  }

  function renderChartTurnos(data) {
    const canvas = document.getElementById('chart-turnos');
    if (!canvas || !data) return;
    const labels = Object.keys(data);
    const values = Object.values(data);
    drawBarChart(canvas, labels, values, '#C8832A');
  }

  function renderChartMaquinas(data) {
    const canvas = document.getElementById('chart-maquinas');
    if (!canvas || !data) return;
    const labels = Object.keys(data);
    const values = Object.values(data);
    drawBarChart(canvas, labels, values, '#5C2D15');
  }

  function drawBarChart(canvas, labels, values, color) {
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width  = width  || 300;
    canvas.height = height || 180;
    const W = canvas.width, H = canvas.height;
    const pad = { top: 20, right: 20, bottom: 50, left: 60 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;
    const max = Math.max(...values, 1);
    const n   = labels.length;
    const barW = n > 0 ? (chartW / n) * 0.6 : 30;
    const gap  = n > 0 ? chartW / n : 50;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(0,0,0,0)';

    // Grid lines
    ctx.strokeStyle = 'rgba(200,131,42,0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + chartH - (i / 4) * chartH;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
      ctx.fillStyle = '#8A7060';
      ctx.font = '10px Inter';
      ctx.textAlign = 'right';
      ctx.fillText(Fmt.number((max * i / 4), 0), pad.left - 8, y + 4);
    }

    // Bars
    labels.forEach((label, i) => {
      const barH = (values[i] / max) * chartH;
      const x = pad.left + i * gap + gap / 2 - barW / 2;
      const y = pad.top + chartH - barH;

      const grad = ctx.createLinearGradient(0, y, 0, pad.top + chartH);
      grad.addColorStop(0, color);
      grad.addColorStop(1, color + '44');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, [4, 4, 0, 0]);
      ctx.fill();

      // Label
      ctx.fillStyle = '#8A7060';
      ctx.font = '10px Inter';
      ctx.textAlign = 'center';
      const shortLabel = label.length > 10 ? label.slice(0, 10) + '…' : label;
      ctx.fillText(shortLabel, x + barW / 2, H - pad.bottom + 16);

      // Value on top
      ctx.fillStyle = '#C8832A';
      ctx.font = 'bold 10px Inter';
      ctx.fillText(Fmt.number(values[i], 0), x + barW / 2, y - 5);
    });

    if (labels.length === 0) {
      ctx.fillStyle = '#8A7060';
      ctx.font = '13px Inter';
      ctx.textAlign = 'center';
      ctx.fillText('Sin datos disponibles', W / 2, H / 2);
    }
  }

  function renderTableRecepciones(data) {
    const el = document.getElementById('table-recepciones');
    if (!el) return;
    if (!data?.length) { el.innerHTML = '<div class="empty-state" style="padding:var(--sp-8)"><span class="empty-icon">📥</span><div class="empty-msg">Sin recepciones recientes</div></div>'; return; }
    el.innerHTML = `<table class="table"><thead><tr><th>ID Lote</th><th>Fecha</th><th>Tipo</th><th>Kg</th></tr></thead><tbody>
      ${data.map(r => `<tr>
        <td class="mono">${r.ID_LOTE || '—'}</td>
        <td>${Fmt.date(r.FECHA)}</td>
        <td>${Fmt.truncate(r.TIPO_CAFE, 20)}</td>
        <td>${Fmt.kg(r.PESO_NETO_KG, 0)}</td>
      </tr>`).join('')}
    </tbody></table>`;
  }

  function renderTableDespachos(data) {
    const el = document.getElementById('table-despachos');
    if (!el) return;
    if (!data?.length) { el.innerHTML = '<div class="empty-state" style="padding:var(--sp-8)"><span class="empty-icon">🚢</span><div class="empty-msg">Sin despachos recientes</div></div>'; return; }
    el.innerHTML = `<table class="table"><thead><tr><th>ID</th><th>Cliente</th><th>Destino</th><th>Kg</th><th>Estado</th></tr></thead><tbody>
      ${data.map(d => `<tr>
        <td class="mono">${d.ID_DESPACHO}</td>
        <td>${Fmt.truncate(d.CLIENTE, 18)}</td>
        <td>${d.PAIS_DESTINO || '—'}</td>
        <td>${Fmt.kg(d.KG_TOTAL, 0)}</td>
        <td>${Fmt.badge(d.ESTADO)}</td>
      </tr>`).join('')}
    </tbody></table>`;
  }

  function renderTableInventario(data) {
    const el = document.getElementById('table-inventario');
    if (!el) return;
    if (!data?.length) { el.innerHTML = '<div class="empty-state" style="padding:var(--sp-8)"><span class="empty-icon">🏪</span><div class="empty-msg">Inventario vacío</div></div>'; return; }
    el.innerHTML = `<table class="table"><thead><tr><th>ID Lote</th><th>Tipo de Café</th><th>Estado Lote</th><th>Stock Disponible</th><th>Recepción</th></tr></thead><tbody>
      ${data.map(i => `<tr>
        <td class="mono" style="cursor:pointer;color:var(--gold-400)" onclick="Router.navigate('lotes',{id:'${i.ID_LOTE}'})">${i.ID_LOTE}</td>
        <td>${Fmt.truncate(i.TIPO_CAFE, 25)}</td>
        <td>${Fmt.badge(i.ESTADO)}</td>
        <td><strong style="color:var(--success)">${Fmt.kg(i.STOCK_KG, 1)}</strong></td>
        <td>${Fmt.date(i.FECHA_RECEPCION)}</td>
      </tr>`).join('')}
    </tbody></table>`;
  }

  async function refresh() { await loadData(); Toast.success('Dashboard actualizado'); }

  return { render, refresh };
})();
window.PageDashboard = PageDashboard;
