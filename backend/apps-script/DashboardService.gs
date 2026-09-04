// ============================================================
// DashboardService.gs — Sucden Colombia · Trazabilidad Café
// Datos para el dashboard ejecutivo
// ============================================================

function getDashboardData() {
  var hoy = new Date();
  var hoyStr = Utilities.formatDate(hoy, "America/Bogota", "yyyy-MM-dd");

  // KPIs de recepciones
  var recepciones = repoGetAll(SHEETS.RECEPCIONES);
  var hoyRecepciones = recepciones.filter(function(r) {
    return String(r.FECHA).startsWith(hoyStr);
  });
  var kgRecibidosHoy = hoyRecepciones.reduce(function(acc, r) {
    return acc + (parseFloat(r.PESO_NETO_KG) || 0);
  }, 0);

  // Lotes por estado
  var lotes = repoGetAll(SHEETS.LOTES);
  var lotesPorEstado = {};
  Object.values(ESTADOS_LOTE).forEach(function(e) { lotesPorEstado[e] = 0; });
  lotes.forEach(function(l) {
    if (lotesPorEstado[l.ESTADO] !== undefined) lotesPorEstado[l.ESTADO]++;
  });

  // Producciones
  var producciones = repoGetAll(SHEETS.PRODUCCION);
  var hoyProd = producciones.filter(function(p) {
    return String(p.FECHA).startsWith(hoyStr);
  });
  var kgEnProduccion = producciones.filter(function(p) {
    return p.ESTADO === ESTADOS_PRODUCCION.EN_PROCESO;
  }).reduce(function(acc, p) {
    return acc + (parseFloat(p.KG_ENTRADA) || 0);
  }, 0);
  var kgTrilladosHoy = hoyProd.reduce(function(acc, p) {
    return acc + (parseFloat(p.KG_EXCELSO) || 0);
  }, 0);

  // Rendimiento promedio (últimas 30 producciones finalizadas)
  var finalizadas = producciones
    .filter(function(p) { return p.ESTADO === ESTADOS_PRODUCCION.FINALIZADO && p.RENDIMIENTO_PCT; })
    .slice(-30);
  var rendimientoProm = finalizadas.length > 0
    ? round2(finalizadas.reduce(function(acc, p) { return acc + (parseFloat(p.RENDIMIENTO_PCT) || 0); }, 0) / finalizadas.length)
    : 0;
  var productividadProm = finalizadas.length > 0
    ? round2(finalizadas.reduce(function(acc, p) { return acc + (parseFloat(p.PRODUCTIVIDAD_KG_H) || 0); }, 0) / finalizadas.length)
    : 0;

  // Inventario total disponible
  var inventario = getInventarioGeneral({ soloConStock: true });
  var kgInventarioTotal = inventario.reduce(function(acc, i) {
    return acc + (parseFloat(i.STOCK_KG) || 0);
  }, 0);

  // Despachos
  var despachos = repoGetAll(SHEETS.DESPACHOS);
  var kgDespachado = despachos
    .filter(function(d) { return d.ESTADO === ESTADOS_DESPACHO.CONFIRMADO; })
    .reduce(function(acc, d) { return acc + (parseFloat(d.KG_TOTAL) || 0); }, 0);

  // Alertas
  var alertas = [];
  if (lotesPorEstado[ESTADOS_LOTE.BLOQUEADO] > 0) {
    alertas.push({ tipo: "danger", mensaje: lotesPorEstado[ESTADOS_LOTE.BLOQUEADO] + " lote(s) BLOQUEADO(S)" });
  }
  if (lotesPorEstado[ESTADOS_LOTE.RECHAZADO] > 0) {
    alertas.push({ tipo: "warning", mensaje: lotesPorEstado[ESTADOS_LOTE.RECHAZADO] + " lote(s) RECHAZADO(S)" });
  }
  if (lotesPorEstado[ESTADOS_LOTE.EN_CALIDAD] > 0) {
    alertas.push({ tipo: "info", mensaje: lotesPorEstado[ESTADOS_LOTE.EN_CALIDAD] + " lote(s) pendiente(s) de calidad" });
  }

  // Últimas recepciones
  var ultimasRecepciones = recepciones.slice(-5).reverse();

  // Últimos despachos
  var ultimosDespachos = despachos.slice(-5).reverse();

  // Producción por turno (últimos 30 días)
  var hace30 = new Date(hoy - 30 * 24 * 60 * 60 * 1000);
  var turnos = repoGetAll(SHEETS.TURNOS);
  var prodPorTurno = {};
  producciones.forEach(function(p) {
    if (!p.FECHA || new Date(p.FECHA) < hace30) return;
    var key = p.ID_TURNO || "Sin turno";
    if (!prodPorTurno[key]) prodPorTurno[key] = 0;
    prodPorTurno[key] += parseFloat(p.KG_EXCELSO) || 0;
  });

  // Producción por máquina (últimos 30 días)
  var prodPorMaquina = {};
  producciones.forEach(function(p) {
    if (!p.FECHA || new Date(p.FECHA) < hace30) return;
    var key = p.ID_MAQUINA || "Sin máquina";
    if (!prodPorMaquina[key]) prodPorMaquina[key] = 0;
    prodPorMaquina[key] += parseFloat(p.KG_EXCELSO) || 0;
  });

  return {
    kpis: {
      kgRecibidosHoy:    round2(kgRecibidosHoy),
      kgEnProduccion:    round2(kgEnProduccion),
      kgTrilladosHoy:    round2(kgTrilladosHoy),
      kgInventarioTotal: round2(kgInventarioTotal),
      kgDespachado:      round2(kgDespachado),
      totalLotes:        lotes.length,
      lotesPendientes:   lotesPorEstado[ESTADOS_LOTE.RECIBIDO] + lotesPorEstado[ESTADOS_LOTE.EN_CALIDAD],
      lotesBloqueados:   lotesPorEstado[ESTADOS_LOTE.BLOQUEADO],
      rendimientoProm,
      productividadProm,
    },
    lotesPorEstado,
    alertas,
    ultimasRecepciones,
    ultimosDespachos,
    prodPorTurno,
    prodPorMaquina,
    inventario: inventario.slice(0, 20),
  };
}
