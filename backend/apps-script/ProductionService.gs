// ============================================================
// ProductionService.gs — Sucden Colombia · Trazabilidad Café
// Gestión de producción/trilla de café
// ============================================================

/**
 * Inicia una orden de producción con uno o varios lotes
 * @param {object} params — {
 *   fecha, idTurno, idMaquina, idOperario, horaInicio,
 *   lotes: [{ idLote, kgEntrada }],
 *   observaciones
 * }
 */
function startProduccion(params, usuario, rol) {
  required(params.fecha, "fecha");
  required(params.idMaquina, "máquina");
  required(params.idOperario, "operario");
  required(params.horaInicio, "hora de inicio");

  if (!params.lotes || !Array.isArray(params.lotes) || params.lotes.length === 0) {
    throw new Error("Debe incluir al menos un lote en la orden de producción.");
  }

  var totalKgEntrada = 0;

  // Validar cada lote
  params.lotes.forEach(function(loteDet) {
    required(loteDet.idLote, "ID de lote en detalle");
    var kgEnt = positive(loteDet.kgEntrada, "kg entrada del lote " + loteDet.idLote);

    var lote = getLote(loteDet.idLote);
    if (!lote) throw new Error("Lote no encontrado: " + loteDet.idLote);

    // Solo lotes aprobados pueden ir a producción
    if (lote.ESTADO === ESTADOS_LOTE.BLOQUEADO) {
      throw new Error("El lote " + loteDet.idLote + " está BLOQUEADO. No puede procesarse.");
    }
    if (lote.ESTADO === ESTADOS_LOTE.RECHAZADO) {
      throw new Error("El lote " + loteDet.idLote + " está RECHAZADO. No puede procesarse.");
    }

    // Verificar stock disponible
    var stock = getStockByLote(loteDet.idLote);
    if (stock < kgEnt) {
      throw new Error("Stock insuficiente para lote " + loteDet.idLote +
        ". Disponible: " + stock + " kg. Requerido: " + kgEnt + " kg.");
    }
    totalKgEntrada += kgEnt;
  });

  var id  = withLock(function() { return repoNextId(SHEETS.PRODUCCION, ID_PREFIXES.PRODUCCION); });
  var now = timestamp();

  var produccion = {
    ID_PRODUCCION:      id,
    FECHA:              params.fecha,
    ID_TURNO:           params.idTurno || "",
    ID_MAQUINA:         params.idMaquina,
    ID_OPERARIO:        params.idOperario,
    HORA_INICIO:        params.horaInicio,
    HORA_FIN:           "",
    TIEMPO_HORAS:       "",
    KG_ENTRADA:         totalKgEntrada,
    KG_EXCELSO:         "",
    KG_SUBPRODUCTO:     "",
    KG_MERMA:           "",
    RENDIMIENTO_PCT:    "",
    PRODUCTIVIDAD_KG_H: "",
    OBSERVACIONES:      params.observaciones || "",
    ESTADO:             ESTADOS_PRODUCCION.EN_PROCESO,
    CREATED_AT:         now,
    CREATED_BY:         usuario,
    UPDATED_AT:         now,
    UPDATED_BY:         usuario,
  };
  repoCreate(SHEETS.PRODUCCION, produccion);

  // Crear detalle por lote y reservar inventario
  params.lotes.forEach(function(loteDet) {
    var kgEnt = parseFloat(loteDet.kgEntrada);
    var detId = withLock(function() { return repoNextId(SHEETS.PRODUCCION_LOTES, "PDL"); });
    repoCreate(SHEETS.PRODUCCION_LOTES, {
      ID_DETALLE:    detId,
      ID_PRODUCCION: id,
      ID_LOTE:       loteDet.idLote,
      KG_ENTRADA:    kgEnt,
      KG_EXCELSO:    "",
      KG_SUBPRODUCTO:"",
      KG_MERMA:      "",
      CREATED_AT:    now,
    });

    // Reservar kg del inventario
    registerMovimientoInventario({
      tipo:          TIPOS_MOVIMIENTO.RESERVA,
      idLote:        loteDet.idLote,
      producto:      "EN_PROCESO",
      kg:            kgEnt,
      idReferencia:  id,
      tipoReferencia:"PRODUCCION",
      notas:         "Reserva para producción " + id,
      usuario:       usuario,
    });

    // Actualizar estado del lote
    repoUpdate(SHEETS.LOTES, loteDet.idLote, {
      ESTADO:     ESTADOS_LOTE.EN_PROCESO,
      UPDATED_AT: now,
      UPDATED_BY: usuario,
    });
  });

  auditLog("START_PRODUCCION", "PRODUCCION", id, "OK",
    "Producción iniciada. Lotes: " + params.lotes.map(function(l) { return l.idLote; }).join(",") +
    " | Kg entrada total: " + totalKgEntrada, usuario, rol);

  return { id, estado: ESTADOS_PRODUCCION.EN_PROCESO, kgEntrada: totalKgEntrada };
}

/**
 * Finaliza una orden de producción registrando resultados
 * @param {object} params — {
 *   idProduccion, horaFin, kgExcelso, kgSubproducto, observaciones,
 *   lotes: [{ idLote, kgExcelso, kgSubproducto }]  (detalle por lote)
 * }
 */
function finishProduccion(params, usuario, rol) {
  required(params.idProduccion, "ID de producción");
  required(params.horaFin, "hora fin");

  var produccion = repoGetById(SHEETS.PRODUCCION, params.idProduccion, "ID_PRODUCCION");
  if (!produccion) throw new Error("Producción no encontrada: " + params.idProduccion);
  if (produccion.ESTADO !== ESTADOS_PRODUCCION.EN_PROCESO) {
    throw new Error("Solo se puede finalizar una producción en estado EN_PROCESO.");
  }

  // Validar hora
  var horaIni = produccion.HORA_INICIO;
  var horaFin = params.horaFin;
  var tiempoHoras = diffHours(horaIni, horaFin);
  if (tiempoHoras <= 0) throw new Error("La hora fin debe ser posterior a la hora inicio.");

  var kgEntrada     = parseFloat(produccion.KG_ENTRADA) || 0;
  var kgExcelso     = nonNegative(params.kgExcelso, "kg excelso");
  var kgSubproducto = nonNegative(params.kgSubproducto || 0, "kg subproducto");
  var kgMerma       = round2(kgEntrada - kgExcelso - kgSubproducto);

  if (kgMerma < 0) {
    throw new Error("La suma de excelso + subproducto (" + (kgExcelso + kgSubproducto) +
      " kg) no puede superar el kg de entrada (" + kgEntrada + " kg).");
  }

  var rendimiento   = round2((kgExcelso / kgEntrada) * 100);
  var productividad = tiempoHoras > 0 ? round2(kgEntrada / tiempoHoras) : 0;
  var now = timestamp();

  // Actualizar registro de producción
  repoUpdate(SHEETS.PRODUCCION, params.idProduccion, {
    HORA_FIN:           horaFin,
    TIEMPO_HORAS:       tiempoHoras,
    KG_EXCELSO:         kgExcelso,
    KG_SUBPRODUCTO:     kgSubproducto,
    KG_MERMA:           kgMerma,
    RENDIMIENTO_PCT:    rendimiento,
    PRODUCTIVIDAD_KG_H: productividad,
    OBSERVACIONES:      params.observaciones || produccion.OBSERVACIONES,
    ESTADO:             ESTADOS_PRODUCCION.FINALIZADO,
    UPDATED_AT:         now,
    UPDATED_BY:         usuario,
  });

  // Actualizar detalle por lote si se provee
  var lotesDetalle = repoSearch(SHEETS.PRODUCCION_LOTES, { ID_PRODUCCION: params.idProduccion });

  lotesDetalle.forEach(function(det) {
    var lotParam = params.lotes ? params.lotes.find(function(l) { return l.idLote === det.ID_LOTE; }) : null;
    var kgEntLote  = parseFloat(det.KG_ENTRADA) || 0;
    var kgExcLote  = lotParam ? parseFloat(lotParam.kgExcelso) : round2((kgExcelso / kgEntrada) * kgEntLote);
    var kgSubLote  = lotParam ? parseFloat(lotParam.kgSubproducto) : round2((kgSubproducto / kgEntrada) * kgEntLote);
    var kgMerLote  = round2(kgEntLote - kgExcLote - kgSubLote);

    repoUpdate(SHEETS.PRODUCCION_LOTES, det.ID_DETALLE, {
      KG_EXCELSO:     kgExcLote,
      KG_SUBPRODUCTO: kgSubLote,
      KG_MERMA:       kgMerLote,
    });

    // Registrar salida del café en bruto (consumido)
    registerMovimientoInventario({
      tipo:          TIPOS_MOVIMIENTO.SALIDA,
      idLote:        det.ID_LOTE,
      producto:      "CAFÉ PROCESO",
      kg:            kgEntLote,
      idReferencia:  params.idProduccion,
      tipoReferencia:"PRODUCCION",
      notas:         "Consumo en producción " + params.idProduccion,
      usuario:       usuario,
    });

    // Registrar entrada del producto terminado (excelso)
    if (kgExcLote > 0) {
      registerMovimientoInventario({
        tipo:          TIPOS_MOVIMIENTO.ENTRADA,
        idLote:        det.ID_LOTE,
        producto:      "CAFÉ EXCELSO",
        kg:            kgExcLote,
        idReferencia:  params.idProduccion,
        tipoReferencia:"PRODUCCION",
        notas:         "Excelso producido en " + params.idProduccion,
        usuario:       usuario,
      });
    }

    // Actualizar estado del lote a PROCESADO
    repoUpdate(SHEETS.LOTES, det.ID_LOTE, {
      ESTADO:     ESTADOS_LOTE.PROCESADO,
      UPDATED_AT: now,
      UPDATED_BY: usuario,
    });
  });

  auditLog("FINISH_PRODUCCION", "PRODUCCION", params.idProduccion, "OK",
    "Producción finalizada. Excelso: " + kgExcelso + " kg | Rendimiento: " + rendimiento + "%", usuario, rol);

  return {
    id:           params.idProduccion,
    tiempoHoras,
    kgExcelso,
    kgSubproducto,
    kgMerma,
    rendimiento,
    productividad,
  };
}

/**
 * Lista producciones con filtros
 */
function listProduccion(filters) {
  return repoSearch(SHEETS.PRODUCCION, filters || {});
}

/**
 * Obtiene detalle de una producción incluyendo lotes
 */
function getProduccion(idProduccion) {
  var prod = repoGetById(SHEETS.PRODUCCION, idProduccion, "ID_PRODUCCION");
  if (!prod) return null;
  var lotes = repoSearch(SHEETS.PRODUCCION_LOTES, { ID_PRODUCCION: idProduccion });
  return { ...prod, lotes };
}
