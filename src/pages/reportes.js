// ============================================================
// reportes.js — Sucden Colombia · Módulo de Reportes
// ============================================================

const PageReportes = (() => {

  async function render(container) {
    container.innerHTML = `
      <div class="page-header">
        <div class="page-title-group">
          <h1 class="page-title">Reportes y Exportación de Información</h1>
          <p class="page-subtitle">Generación de reportes ejecutivos, operacionales y auditoría</p>
        </div>
      </div>

      <div class="form-grid form-grid-3 mb-6">
        <div class="card p-5" style="cursor:pointer;transition:transform 0.2s" onclick="PageReportes.genReport('reporteRendimiento','Rendimiento por Lote')" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
          <div style="font-size:28px;margin-bottom:8px">📊</div>
          <div style="font-weight:700;font-size:var(--text-md)">Rendimiento por Lote</div>
          <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:4px">% de café excelso obtenido vs materia prima ingresada.</div>
        </div>

        <div class="card p-5" style="cursor:pointer;transition:transform 0.2s" onclick="PageReportes.genReport('reporteProductividad','Productividad por Máquina')" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
          <div style="font-size:28px;margin-bottom:8px">⚡</div>
          <div style="font-weight:700;font-size:var(--text-md)">Productividad por Máquina</div>
          <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:4px">Kg procesados por hora efectiva por equipo de trilla.</div>
        </div>

        <div class="card p-5" style="cursor:pointer;transition:transform 0.2s" onclick="PageReportes.genReport('reporteDespachos','Histórico de Despachos')" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
          <div style="font-size:28px;margin-bottom:8px">🚢</div>
          <div style="font-weight:700;font-size:var(--text-md)">Reporte de Despachos</div>
          <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:4px">Resumen de ventas y exportaciones por cliente y país.</div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title" id="rep-title">Seleccione un reporte para generar</div>
          <button class="btn btn-outline btn-sm" id="btn-export-csv" style="display:none" onclick="PageReportes.exportCSV()">📥 Exportar CSV</button>
        </div>
        <div class="card-body" id="rep-content">
          <div class="empty-state">
            <span class="empty-icon">📈</span>
            <div class="empty-title">Sin reporte seleccionado</div>
            <div class="empty-msg">Haga clic en una de las tarjetas superiores para ver los resultados.</div>
          </div>
        </div>
      </div>`;
  }

  let currentData = null;
  let currentTitle = '';

  async function genReport(action, title) {
    const titleEl = document.getElementById('rep-title');
    const contentEl = document.getElementById('rep-content');
    const btnExp = document.getElementById('btn-export-csv');

    if (titleEl) titleEl.textContent = title;
    currentTitle = title;
    if (contentEl) contentEl.innerHTML = '<div class="empty-state"><div class="spinner"></div><div class="empty-msg">Generando reporte...</div></div>';

    try {
      const data = await API.get(action);
      currentData = data;
      if (btnExp) btnExp.style.display = 'inline-flex';

      if (Array.isArray(data) && data.length > 0) {
        const headers = Object.keys(data[0]);
        contentEl.innerHTML = `
          <div class="table-container">
            <table class="table">
              <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
              <tbody>
                ${data.map(row => `<tr>${headers.map(h => `<td>${row[h] !== null ? row[h] : '—'}</td>`).join('')}</tr>`).join('')}
              </tbody>
            </table>
          </div>`;
      } else if (data && typeof data === 'object') {
        contentEl.innerHTML = `<pre style="background:var(--bg-elevated);padding:16px;border-radius:8px;font-family:var(--font-mono);font-size:12px">${JSON.stringify(data, null, 2)}</pre>`;
      } else {
        contentEl.innerHTML = '<div class="empty-state"><div class="empty-msg">No hay datos suficientes para este reporte.</div></div>';
      }
    } catch(err) {
      if (contentEl) contentEl.innerHTML = `<div class="alert alert-danger">❌ ${err.message}</div>`;
    }
  }

  function exportCSV() {
    if (!currentData || !Array.isArray(currentData) || currentData.length === 0) {
      return Toast.warning('Atención', 'No hay datos en formato tabla para exportar');
    }
    const headers = Object.keys(currentData[0]);
    const csvRows = [headers.join(',')];

    currentData.forEach(row => {
      const values = headers.map(h => {
        const val = row[h] === null || row[h] === undefined ? '' : String(row[h]);
        return `"${val.replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `${currentTitle.replace(/\s+/g, '_')}_${Fmt.today()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return { render, genReport, exportCSV };
})();
