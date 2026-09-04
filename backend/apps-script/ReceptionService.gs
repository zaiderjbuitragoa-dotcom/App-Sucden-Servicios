// ============================================================
// ReceptionService.gs — Sucden Colombia · Trazabilidad Café
// Gestión de recepciones de café y lotes
// ============================================================

/**
 * Registra una nueva recepción de café y crea/asocia su lote
 */
function createRecepcion(params, usuario, rol) {
  // Validaciones obligatorias
  required(params.fecha, "fecha");
  required(params.hora, "hora");
  required(params.idProveedor, "proveedor");
  required(params.tipoCafe, "tipo de café");
  required(params.sacos, "número de sacos");
  var pesoBruto = positive(params.pesoBrutoKg, "peso bruto (kg)");
  var tara      = nonNegative(params.taraKg, "tara (kg)");
  var sacos     = positive(params.sacos, "sacos");
  var humedad   = nonNegative(params.humedadPct, "humedad");

  // Calcular peso neto automáticamente
  var pesoNeto = round2(pesoBruto - tara);
  if (pesoNeto <= 0) throw new Error("El peso neto debe ser mayor a cero.");

  var now = timestamp();

  // Generar IDs
  var idRecepcion = withLock(function() {
    return repoNextId(SHEETS.RECEPCIONES, ID_PREFIXES.RECEPCION);
  });
  var idLote = withLock(function() {
    return repoNextId(SHEETS.LOTES, ID_PREFIXES.LOTE);
  });

  // Crear lote
  var lote = {
    ID_LOTE:         idLote,
    FECHA_RECEPCION: params.fecha,
    ID_PROVEEDOR:    params.idProveedor || "",
    ID_PRODUCTOR:    params.idProductor || "",
    ID_FINCA:        params.idFinca || "",
    TIPO_CAFE:       params.tipoCafe,
    KG_RECEPCION:    pesoNeto,
    ESTADO:          ESTADOS_LOTE.RECIBIDO,
    MUNICIPIO:       params.municipio || "",
    VARIEDAD:        params.variedad || "",
    NOTAS:           params.observaciones || "",
    CREATED_AT:      now,
    CREATED_BY:      usuario,
    UPDATED_AT:      now,
    UPDATED_BY:      usuario,
  };
  repoCreate(SHEETS.LOTES, lote);

  // Crear recepción
  var recepcion = {
    ID_RECEPCION:      idRecepcion,
    FECHA:             params.fecha,
    HORA:              params.hora,
    ID_LOTE:           idLote,
    ID_PROVEEDOR:      params.idProveedor || "",
    ID_PRODUCTOR:      params.idProductor || "",
    ID_FINCA:          params.idFinca || "",
    MUNICIPIO:         params.municipio || "",
    DOCUMENTO_REMISION:params.documentoRemision || "",
    TIPO_CAFE:         params.tipoCafe,
    SACOS:             sacos,
    PESO_BRUTO_KG:     pesoBruto,
    TARA_KG:           tara,
    PESO_NETO_KG:      pesoNeto,
    HUMEDAD_PCT:       humedad,
    FACTOR:            params.factor || "",
    DEFECTOS_PCT:      params.defectosPct || 0,
    TEMPERATURA:       params.temperatura || "",
    OBSERVACIONES:     params.observaciones || "",
    RESPONSABLE:       usuario,
    ESTADO:            "ACTIVO",
    CREATED_AT:        now,
    CREATED_BY:        usuario,
    UPDATED_AT:        now,
    UPDATED_BY:        usuario,
  };
  repoCreate(SHEETS.RECEPCIONES, recepcion);

  // Registrar movimiento de entrada en inventario
  registerMovimientoInventario({
    tipo:          TIPOS_MOVIMIENTO.ENTRADA,
    idLote:        idLote,
    producto:      params.tipoCafe,
    idBodega:      params.idBodega || "",
    ubicacion:     params.ubicacion || "",
    kg:            pesoNeto,
    idReferencia:  idRecepcion,
    tipoReferencia:"RECEPCION",
    notas:         "Entrada por recepción " + idRecepcion,
    usuario:       usuario,
  });

  auditLog("CREATE_RECEPCION", "RECEPCIONES", idRecepcion, "OK",
    "Recepción creada. Lote: " + idLote + " | Kg neto: " + pesoNeto, usuario, rol);

  return { idRecepcion, idLote, pesoNeto, lote, recepcion };
}

/**
 * Lista recepciones con filtros opcionales
 */
function listRecepciones(filters) {
  return repoSearch(SHEETS.RECEPCIONES, filters || {});
}

/**
 * Obtiene el detalle de una recepción por ID
 */
function getRecepcion(idRecepcion) {
  return repoGetById(SHEETS.RECEPCIONES, idRecepcion, "ID_RECEPCION");
}

// ── Lotes ─────────────────────────────────────────────────────

/**
 * Lista todos los lotes con filtros
 */
function listLotes(filters) {
  return repoSearch(SHEETS.LOTES, filters || {});
}

/**
 * Obtiene un lote por ID
 */
function getLote(idLote) {
  return repoGetById(SHEETS.LOTES, idLote, "ID_LOTE");
}

/**
 * Actualiza estado de un lote
 */
function updateLoteEstado(idLote, nuevoEstado, usuario, rol) {
  var lote = getLote(idLote);
  if (!lote) throw new Error("Lote no encontrado: " + idLote);
  var now = timestamp();
  repoUpdate(SHEETS.LOTES, idLote, {
    ESTADO:     nuevoEstado,
    UPDATED_AT: now,
    UPDATED_BY: usuario,
  });
  auditLog("UPDATE_LOTE_ESTADO", "LOTES", idLote, "OK",
    "Estado cambiado a " + nuevoEstado, usuario, rol);
  return { idLote, estado: nuevoEstado };
}

/**
 * Obtiene la trazabilidad completa de un lote
 * (recepción, calidad, producciones, empaques, despachos, documentos)
 */
function getLoteTrazabilidad(idLote) {
  var lote = getLote(idLote);
  if (!lote) throw new Error("Lote no encontrado: " + idLote);

  var recepciones  = repoSearch(SHEETS.RECEPCIONES, { ID_LOTE: idLote });
  var calidades    = repoSearch(SHEETS.CALIDAD, { ID_LOTE: idLote });
  var prodLotes    = repoSearch(SHEETS.PRODUCCION_LOTES, { ID_LOTE: idLote });
  var empaques     = repoSearch(SHEETS.EMPAQUES, { ID_LOTE: idLote });
  var despLotes    = repoSearch(SHEETS.DESPACHO_LOTES, { ID_LOTE: idLote });
  var documentos   = repoSearch(SHEETS.DOCUMENTOS, { ENTIDAD_ID: idLote });
  var movimientos  = repoSearch(SHEETS.MOVIMIENTOS_INVENTARIO, { ID_LOTE: idLote });

  // Obtener detalles de producciones
  var prodIds = [...new Set(prodLotes.map(function(p) { return p.ID_PRODUCCION; }))];
  var producciones = prodIds.map(function(pid) {
    return repoGetById(SHEETS.PRODUCCION, pid, "ID_PRODUCCION");
  }).filter(Boolean);

  // Obtener detalles de despachos
  var despIds = [...new Set(despLotes.map(function(d) { return d.ID_DESPACHO; }))];
  var despachos = despIds.map(function(did) {
    return repoGetById(SHEETS.DESPACHOS, did, "ID_DESPACHO");
  }).filter(Boolean);

  return {
    lote,
    recepciones,
    calidades,
    producciones,
    prodLotes,
    empaques,
    despachos,
    despLotes,
    documentos,
    movimientos,
  };
}
