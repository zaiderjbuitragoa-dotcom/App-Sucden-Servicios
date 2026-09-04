// ============================================================
// InventoryService.gs — Sucden Colombia · Trazabilidad Café
// Control de inventario con movimientos trazables
// ============================================================

/**
 * Registra un movimiento de inventario
 * NUNCA se edita el saldo directamente — solo se registran movimientos.
 */
function registerMovimientoInventario(params) {
  required(params.tipo, "tipo de movimiento");
  required(params.idLote, "lote");
  var kg = nonNegative(params.kg, "kg");

  if (!Object.values(TIPOS_MOVIMIENTO).includes(params.tipo)) {
    throw new Error("Tipo de movimiento no válido: " + params.tipo);
  }

  // Para SALIDA, verificar stock suficiente
  if (params.tipo === TIPOS_MOVIMIENTO.SALIDA || params.tipo === TIPOS_MOVIMIENTO.RESERVA) {
    var stock = getStockByLote(params.idLote);
    if (stock < kg) {
      throw new Error("Stock insuficiente para lote " + params.idLote + ". Disponible: " + stock + " kg. Solicitado: " + kg + " kg.");
    }
  }

  var id  = withLock(function() { return repoNextId(SHEETS.MOVIMIENTOS_INVENTARIO, "MOV"); });
  var now = timestamp();

  // Calcular kg anterior y nuevo
  var kgAnterior = getStockByLote(params.idLote);
  var kgNuevo;
  var entradasTipos = [TIPOS_MOVIMIENTO.ENTRADA, TIPOS_MOVIMIENTO.AJUSTE];
  if (entradasTipos.includes(params.tipo)) {
    kgNuevo = round2(kgAnterior + kg);
  } else {
    kgNuevo = round2(kgAnterior - kg);
  }

  var movimiento = {
    ID_MOVIMIENTO:   id,
    FECHA:           now,
    TIPO:            params.tipo,
    ID_LOTE:         params.idLote,
    PRODUCTO:        params.producto || "",
    ID_BODEGA:       params.idBodega || "",
    UBICACION:       params.ubicacion || "",
    KG:              kg,
    KG_ANTERIOR:     kgAnterior,
    KG_NUEVO:        kgNuevo,
    ID_REFERENCIA:   params.idReferencia || "",
    TIPO_REFERENCIA: params.tipoReferencia || "",
    NOTAS:           params.notas || "",
    USUARIO:         params.usuario || "",
    CREATED_AT:      now,
  };
  repoCreate(SHEETS.MOVIMIENTOS_INVENTARIO, movimiento);
  return movimiento;
}

/**
 * Calcula el stock actual de un lote sumando movimientos
 */
function getStockByLote(idLote) {
  var movimientos = repoSearch(SHEETS.MOVIMIENTOS_INVENTARIO, { ID_LOTE: idLote });
  return movimientos.reduce(function(acc, m) {
    var kg = parseFloat(m.KG) || 0;
    var entradasTipos = [TIPOS_MOVIMIENTO.ENTRADA, TIPOS_MOVIMIENTO.AJUSTE];
    if (entradasTipos.includes(m.TIPO)) return acc + kg;
    return acc - kg;
  }, 0);
}

/**
 * Obtiene el stock general por bodega y lote
 */
function getInventarioGeneral(filters) {
  var movimientos = repoGetAll(SHEETS.MOVIMIENTOS_INVENTARIO);
  var lotes = repoGetAll(SHEETS.LOTES);
  var bodegas = repoGetAll(SHEETS.BODEGAS);

  // Agrupar por lote
  var stockPorLote = {};
  movimientos.forEach(function(m) {
    var key = m.ID_LOTE;
    if (!stockPorLote[key]) stockPorLote[key] = 0;
    var kg = parseFloat(m.KG) || 0;
    var entradasTipos = [TIPOS_MOVIMIENTO.ENTRADA, TIPOS_MOVIMIENTO.AJUSTE];
    if (entradasTipos.includes(m.TIPO)) {
      stockPorLote[key] += kg;
    } else {
      stockPorLote[key] -= kg;
    }
  });

  // Construir resultado
  var resultado = [];
  lotes.forEach(function(lote) {
    var stock = round2(stockPorLote[lote.ID_LOTE] || 0);
    if (filters && filters.soloConStock && stock <= 0) return;
    resultado.push({
      ID_LOTE:    lote.ID_LOTE,
      TIPO_CAFE:  lote.TIPO_CAFE,
      ESTADO:     lote.ESTADO,
      STOCK_KG:   stock,
      FECHA_RECEPCION: lote.FECHA_RECEPCION,
    });
  });

  return resultado;
}

/**
 * Lista movimientos de inventario con filtros
 */
function listMovimientos(filters) {
  return repoSearch(SHEETS.MOVIMIENTOS_INVENTARIO, filters || {});
}

// ── Empaque ───────────────────────────────────────────────────

/**
 * Registra un empaque de producto terminado
 */
function createEmpaque(params, usuario, rol) {
  required(params.idLote, "lote");
  required(params.producto, "producto");
  required(params.presentacion, "presentación");
  required(params.fecha, "fecha");
  var cantidadSacos = positive(params.cantidadSacos, "cantidad de sacos");
  var pesoUnitario  = positive(params.pesoUnitarioKg, "peso unitario");
  var pesoTotal     = round2(cantidadSacos * pesoUnitario);

  var lote = getLote(params.idLote);
  if (!lote) throw new Error("Lote no encontrado: " + params.idLote);

  // Verificar stock disponible
  var stock = getStockByLote(params.idLote);
  if (stock < pesoTotal) {
    throw new Error("Stock insuficiente. Disponible: " + stock + " kg. Requerido: " + pesoTotal + " kg.");
  }

  var id  = withLock(function() { return repoNextId(SHEETS.EMPAQUES, ID_PREFIXES.EMPAQUE); });
  var now = timestamp();

  var empaque = {
    ID_EMPAQUE:      id,
    FECHA:           params.fecha,
    ID_LOTE:         params.idLote,
    PRODUCTO:        params.producto,
    PRESENTACION:    params.presentacion,
    PESO_UNITARIO_KG:pesoUnitario,
    CANTIDAD_SACOS:  cantidadSacos,
    PESO_TOTAL_KG:   pesoTotal,
    ID_BODEGA:       params.idBodega || "",
    UBICACION:       params.ubicacion || "",
    PALLET:          params.pallet || "",
    RESPONSABLE:     params.responsable || usuario,
    OBSERVACIONES:   params.observaciones || "",
    ESTADO:          "ACTIVO",
    CREATED_AT:      now,
    CREATED_BY:      usuario,
    UPDATED_AT:      now,
    UPDATED_BY:      usuario,
  };
  repoCreate(SHEETS.EMPAQUES, empaque);

  // Registrar movimiento TRANSFORMACION en inventario (de granel a empacado)
  registerMovimientoInventario({
    tipo:          TIPOS_MOVIMIENTO.TRANSFORMACION,
    idLote:        params.idLote,
    producto:      params.producto,
    idBodega:      params.idBodega || "",
    ubicacion:     params.ubicacion || "",
    kg:            pesoTotal,
    idReferencia:  id,
    tipoReferencia:"EMPAQUE",
    notas:         "Empaque " + params.presentacion + " x " + cantidadSacos + " sacos",
    usuario:       usuario,
  });

  auditLog("CREATE_EMPAQUE", "EMPAQUE", id, "OK",
    "Empaque creado lote " + params.idLote + " | " + cantidadSacos + " sacos | " + pesoTotal + " kg", usuario, rol);

  return { id, idLote: params.idLote, pesoTotal, cantidadSacos };
}

/**
 * Lista empaques con filtros
 */
function listEmpaques(filters) {
  return repoSearch(SHEETS.EMPAQUES, filters || {});
}
