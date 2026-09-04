// ============================================================
// ReportService.gs — Sucden Colombia · Trazabilidad Café
// Generación de reportes
// ============================================================

/**
 * Reporte de trazabilidad por lote
 */
function reporteTrazabilidadLote(idLote) {
  return getLoteTrazabilidad(idLote);
}

/**
 * Reporte de producción diaria
 */
function reporteProduccionDiaria(fecha) {
  var producciones = fecha
    ? repoSearch(SHEETS.PRODUCCION, { FECHA: fecha })
    : repoGetAll(SHEETS.PRODUCCION);
  var totales = producciones.reduce(function(acc, p) {
    acc.kgEntrada     += parseFloat(p.KG_ENTRADA) || 0;
    acc.kgExcelso     += parseFloat(p.KG_EXCELSO) || 0;
    acc.kgSubproducto += parseFloat(p.KG_SUBPRODUCTO) || 0;
    acc.kgMerma       += parseFloat(p.KG_MERMA) || 0;
    acc.horas         += parseFloat(p.TIEMPO_HORAS) || 0;
    acc.count++;
    return acc;
  }, { kgEntrada: 0, kgExcelso: 0, kgSubproducto: 0, kgMerma: 0, horas: 0, count: 0 });
  totales.rendimientoPromedio = totales.kgEntrada > 0
    ? round2((totales.kgExcelso / totales.kgEntrada) * 100) : 0;
  return { producciones, totales };
}

/**
 * Reporte de rendimiento por lote
 */
function reporteRendimientoPorLote() {
  var prodLotes = repoGetAll(SHEETS.PRODUCCION_LOTES);
  var lotes = repoGetAll(SHEETS.LOTES);
  var loteMap = {};
  lotes.forEach(function(l) { loteMap[l.ID_LOTE] = l; });

  return prodLotes.map(function(det) {
    var lote = loteMap[det.ID_LOTE] || {};
    var kgEnt = parseFloat(det.KG_ENTRADA) || 0;
    var kgExc = parseFloat(det.KG_EXCELSO) || 0;
    return {
      ID_LOTE:       det.ID_LOTE,
      TIPO_CAFE:     lote.TIPO_CAFE || "",
      ID_PRODUCCION: det.ID_PRODUCCION,
      KG_ENTRADA:    kgEnt,
      KG_EXCELSO:    kgExc,
      KG_SUBPRODUCTO:parseFloat(det.KG_SUBPRODUCTO) || 0,
      KG_MERMA:      parseFloat(det.KG_MERMA) || 0,
      RENDIMIENTO:   kgEnt > 0 ? round2((kgExc / kgEnt) * 100) : 0,
    };
  });
}

/**
 * Reporte de productividad por máquina
 */
function reporteProductividadMaquina() {
  var producciones = repoGetAll(SHEETS.PRODUCCION)
    .filter(function(p) { return p.ESTADO === ESTADOS_PRODUCCION.FINALIZADO; });
  var maquinas = repoGetAll(SHEETS.MAQUINAS);
  var maqMap = {};
  maquinas.forEach(function(m) { maqMap[m.ID_MAQUINA] = m; });

  var resultado = {};
  producciones.forEach(function(p) {
    var key = p.ID_MAQUINA;
    if (!resultado[key]) {
      resultado[key] = {
        ID_MAQUINA:  key,
        NOMBRE:      (maqMap[key] || {}).NOMBRE || key,
        totalKgEnt:  0,
        totalKgExc:  0,
        totalHoras:  0,
        cantOrdenes: 0,
      };
    }
    resultado[key].totalKgEnt  += parseFloat(p.KG_ENTRADA) || 0;
    resultado[key].totalKgExc  += parseFloat(p.KG_EXCELSO) || 0;
    resultado[key].totalHoras  += parseFloat(p.TIEMPO_HORAS) || 0;
    resultado[key].cantOrdenes++;
  });

  return Object.values(resultado).map(function(r) {
    r.productividadPromedio = r.totalHoras > 0 ? round2(r.totalKgEnt / r.totalHoras) : 0;
    r.rendimientoPromedio   = r.totalKgEnt > 0 ? round2((r.totalKgExc / r.totalKgEnt) * 100) : 0;
    return r;
  });
}

/**
 * Reporte de despachos
 */
function reporteDespachos(filters) {
  var despachos = repoSearch(SHEETS.DESPACHOS, filters || {});
  var totales = {
    kgTotal:   despachos.reduce(function(a, d) { return a + (parseFloat(d.KG_TOTAL) || 0); }, 0),
    sacosTotal:despachos.reduce(function(a, d) { return a + (parseInt(d.CANTIDAD_SACOS) || 0); }, 0),
    count:     despachos.length,
  };
  return { despachos, totales };
}

/**
 * Reporte de inventario actual
 */
function reporteInventario() {
  return getInventarioGeneral({});
}

/**
 * Reporte de mermas por periodo
 */
function reporteMermas(fechaDesde, fechaHasta) {
  var producciones = repoGetAll(SHEETS.PRODUCCION)
    .filter(function(p) {
      if (p.ESTADO !== ESTADOS_PRODUCCION.FINALIZADO) return false;
      if (fechaDesde && p.FECHA < fechaDesde) return false;
      if (fechaHasta && p.FECHA > fechaHasta) return false;
      return true;
    });

  var totales = producciones.reduce(function(acc, p) {
    acc.kgEntrada += parseFloat(p.KG_ENTRADA) || 0;
    acc.kgMerma   += parseFloat(p.KG_MERMA) || 0;
    acc.count++;
    return acc;
  }, { kgEntrada: 0, kgMerma: 0, count: 0 });
  totales.pctMerma = totales.kgEntrada > 0
    ? round2((totales.kgMerma / totales.kgEntrada) * 100) : 0;

  return { producciones, totales };
}

/**
 * Reporte de novedades
 */
function reporteNovedades(filters) {
  return repoSearch(SHEETS.NOVEDADES, filters || {});
}
