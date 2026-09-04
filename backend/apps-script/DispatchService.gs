// ============================================================
// DispatchService.gs — Sucden Colombia · Trazabilidad Café
// Gestión de despachos y exportaciones
// ============================================================

/**
 * Crea un despacho en estado BORRADOR
 * @param {object} params — {
 *   fecha, cliente, paisDestino, ciudadDestino, transportadora,
 *   vehiculo, placa, conductor, contenedor, booking, bl, factura,
 *   lotes: [{ idLote, kg, sacos, producto }],
 *   observaciones, responsable
 * }
 */
function createDespacho(params, usuario, rol) {
  required(params.fecha, "fecha");
  required(params.cliente, "cliente");
  required(params.paisDestino, "país destino");

  if (!params.lotes || !Array.isArray(params.lotes) || params.lotes.length === 0) {
    throw new Error("Debe incluir al menos un lote en el despacho.");
  }

  var totalKg   = 0;
  var totalSacos = 0;

  // Validar cada lote antes de crear el despacho
  params.lotes.forEach(function(loteDet) {
    required(loteDet.idLote, "ID de lote");
    var kgDesp = positive(loteDet.kg, "kg del lote " + loteDet.idLote);
    var sacosDesp = positive(loteDet.sacos || 1, "sacos del lote " + loteDet.idLote);

    var lote = getLote(loteDet.idLote);
    if (!lote) throw new Error("Lote no encontrado: " + loteDet.idLote);

    // Validar estado del lote
    if (lote.ESTADO === ESTADOS_LOTE.BLOQUEADO) {
      throw new Error("El lote " + loteDet.idLote + " está BLOQUEADO. Requiere autorización para despachar.");
    }
    if (lote.ESTADO === ESTADOS_LOTE.RECHAZADO) {
      throw new Error("El lote " + loteDet.idLote + " está RECHAZADO. No puede despacharse.");
    }
    if (lote.ESTADO === ESTADOS_LOTE.RECIBIDO || lote.ESTADO === ESTADOS_LOTE.EN_CALIDAD) {
      throw new Error("El lote " + loteDet.idLote + " aún no ha sido APROBADO por calidad.");
    }

    // Validar stock disponible
    var stock = getStockByLote(loteDet.idLote);
    if (stock < kgDesp) {
      throw new Error("Stock insuficiente para lote " + loteDet.idLote +
        ". Disponible: " + round2(stock) + " kg. Solicitado: " + kgDesp + " kg.");
    }

    totalKg    += kgDesp;
    totalSacos += sacosDesp;
  });

  var id  = withLock(function() { return repoNextId(SHEETS.DESPACHOS, ID_PREFIXES.DESPACHO); });
  var now = timestamp();

  var despacho = {
    ID_DESPACHO:   id,
    FECHA:         params.fecha,
    CLIENTE:       params.cliente,
    PAIS_DESTINO:  params.paisDestino,
    CIUDAD_DESTINO:params.ciudadDestino || "",
    TRANSPORTADORA:params.transportadora || "",
    VEHICULO:      params.vehiculo || "",
    PLACA:         params.placa || "",
    CONDUCTOR:     params.conductor || "",
    CONTENEDOR:    params.contenedor || "",
    BOOKING:       params.booking || "",
    BL:            params.bl || "",
    FACTURA:       params.factura || "",
    CANTIDAD_SACOS:totalSacos,
    KG_TOTAL:      round2(totalKg),
    RESPONSABLE:   params.responsable || usuario,
    OBSERVACIONES: params.observaciones || "",
    ESTADO:        ESTADOS_DESPACHO.BORRADOR,
    CREATED_AT:    now,
    CREATED_BY:    usuario,
    UPDATED_AT:    now,
    UPDATED_BY:    usuario,
  };
  repoCreate(SHEETS.DESPACHOS, despacho);

  // Crear detalle de lotes
  params.lotes.forEach(function(loteDet) {
    var detId = withLock(function() { return repoNextId(SHEETS.DESPACHO_LOTES, "DLD"); });
    repoCreate(SHEETS.DESPACHO_LOTES, {
      ID_DETALLE:    detId,
      ID_DESPACHO:   id,
      ID_LOTE:       loteDet.idLote,
      KG:            parseFloat(loteDet.kg),
      SACOS:         parseInt(loteDet.sacos) || 1,
      PRODUCTO:      loteDet.producto || "",
      CREATED_AT:    now,
    });
  });

  auditLog("CREATE_DESPACHO", "DESPACHOS", id, "OK",
    "Despacho creado en BORRADOR. Cliente: " + params.cliente + " | Kg: " + round2(totalKg), usuario, rol);

  return { id, estado: ESTADOS_DESPACHO.BORRADOR, kgTotal: round2(totalKg), sacos: totalSacos };
}

/**
 * Confirma un despacho: genera movimientos de salida de inventario
 * y actualiza estado de lotes a DESPACHADO
 */
function confirmDespacho(idDespacho, usuario, rol) {
  var despacho = repoGetById(SHEETS.DESPACHOS, idDespacho, "ID_DESPACHO");
  if (!despacho) throw new Error("Despacho no encontrado: " + idDespacho);
  if (despacho.ESTADO !== ESTADOS_DESPACHO.BORRADOR && despacho.ESTADO !== ESTADOS_DESPACHO.VALIDADO) {
    throw new Error("Solo se puede confirmar un despacho en estado BORRADOR o VALIDADO.");
  }

  var lotesDetalle = repoSearch(SHEETS.DESPACHO_LOTES, { ID_DESPACHO: idDespacho });
  var now = timestamp();

  lotesDetalle.forEach(function(det) {
    var kgDesp = parseFloat(det.KG);

    // Re-validar stock antes de confirmar
    var stock = getStockByLote(det.ID_LOTE);
    if (stock < kgDesp) {
      throw new Error("Stock insuficiente al confirmar. Lote: " + det.ID_LOTE +
        ". Disponible: " + round2(stock) + " kg. Requerido: " + kgDesp + " kg.");
    }

    // Registrar salida de inventario
    registerMovimientoInventario({
      tipo:          TIPOS_MOVIMIENTO.SALIDA,
      idLote:        det.ID_LOTE,
      producto:      det.PRODUCTO || "CAFÉ EXCELSO",
      kg:            kgDesp,
      idReferencia:  idDespacho,
      tipoReferencia:"DESPACHO",
      notas:         "Salida por despacho " + idDespacho,
      usuario:       usuario,
    });

    // Actualizar estado del lote
    repoUpdate(SHEETS.LOTES, det.ID_LOTE, {
      ESTADO:     ESTADOS_LOTE.DESPACHADO,
      UPDATED_AT: now,
      UPDATED_BY: usuario,
    });
  });

  // Confirmar despacho
  repoUpdate(SHEETS.DESPACHOS, idDespacho, {
    ESTADO:     ESTADOS_DESPACHO.CONFIRMADO,
    UPDATED_AT: now,
    UPDATED_BY: usuario,
  });

  auditLog("CONFIRM_DESPACHO", "DESPACHOS", idDespacho, "OK",
    "Despacho CONFIRMADO. " + lotesDetalle.length + " lotes despachados.", usuario, rol);

  return { idDespacho, estado: ESTADOS_DESPACHO.CONFIRMADO };
}

/**
 * Lista despachos con filtros
 */
function listDespachos(filters) {
  return repoSearch(SHEETS.DESPACHOS, filters || {});
}

/**
 * Obtiene detalle completo de un despacho incluyendo lotes
 */
function getDespacho(idDespacho) {
  var despacho = repoGetById(SHEETS.DESPACHOS, idDespacho, "ID_DESPACHO");
  if (!despacho) return null;
  var lotes = repoSearch(SHEETS.DESPACHO_LOTES, { ID_DESPACHO: idDespacho });
  var documentos = repoSearch(SHEETS.DOCUMENTOS, { ENTIDAD_ID: idDespacho });
  return { ...despacho, lotes, documentos };
}

/**
 * Cancela un despacho (solo BORRADOR)
 */
function cancelDespacho(idDespacho, motivo, usuario, rol) {
  var despacho = repoGetById(SHEETS.DESPACHOS, idDespacho, "ID_DESPACHO");
  if (!despacho) throw new Error("Despacho no encontrado: " + idDespacho);
  if (despacho.ESTADO === ESTADOS_DESPACHO.CONFIRMADO) {
    throw new Error("No se puede cancelar un despacho ya CONFIRMADO.");
  }
  var now = timestamp();
  repoUpdate(SHEETS.DESPACHOS, idDespacho, {
    ESTADO:        ESTADOS_DESPACHO.CANCELADO,
    OBSERVACIONES: (despacho.OBSERVACIONES || "") + " | CANCELADO: " + (motivo || ""),
    UPDATED_AT:    now,
    UPDATED_BY:    usuario,
  });
  auditLog("CANCEL_DESPACHO", "DESPACHOS", idDespacho, "OK", "Despacho cancelado. Motivo: " + motivo, usuario, rol);
  return { idDespacho, estado: ESTADOS_DESPACHO.CANCELADO };
}
