// ============================================================
// QualityService.gs — Sucden Colombia · Trazabilidad Café
// Control de calidad de lotes
// ============================================================

/**
 * Registra un análisis de calidad para un lote
 */
function createCalidad(params, usuario, rol) {
  required(params.idLote, "lote");
  required(params.fecha, "fecha");
  required(params.responsable, "responsable");

  var lote = getLote(params.idLote);
  if (!lote) throw new Error("Lote no encontrado: " + params.idLote);

  // No se puede registrar calidad a un lote despachado
  if (lote.ESTADO === ESTADOS_LOTE.DESPACHADO) {
    throw new Error("No se puede registrar calidad a un lote ya despachado.");
  }

  var id  = withLock(function() { return repoNextId(SHEETS.CALIDAD, ID_PREFIXES.CALIDAD); });
  var now = timestamp();

  var resultado = (params.resultado || "").toUpperCase();
  if (![ESTADOS_CALIDAD.APROBADO, ESTADOS_CALIDAD.RECHAZADO, ESTADOS_CALIDAD.BLOQUEADO, ESTADOS_CALIDAD.PENDIENTE].includes(resultado)) {
    resultado = ESTADOS_CALIDAD.PENDIENTE;
  }

  var calidad = {
    ID_CALIDAD:    id,
    ID_LOTE:       params.idLote,
    FECHA:         params.fecha,
    HUMEDAD_PCT:   nonNegative(params.humedadPct || 0, "humedad"),
    FACTOR:        params.factor || "",
    CLASIFICACION: params.clasificacion || "",
    DEFECTOS_PCT:  nonNegative(params.defectosPct || 0, "defectos"),
    TAZA_PUNTAJE:  params.tazaPuntaje || "",
    RESULTADO:     resultado,
    RESPONSABLE:   params.responsable,
    LABORATORIO:   params.laboratorio || "",
    OBSERVACIONES: params.observaciones || "",
    ESTADO:        resultado,
    DRIVE_FILE_ID: params.driveFileId || "",
    DRIVE_URL:     params.driveUrl || "",
    CREATED_AT:    now,
    CREATED_BY:    usuario,
    UPDATED_AT:    now,
    UPDATED_BY:    usuario,
  };
  repoCreate(SHEETS.CALIDAD, calidad);

  // Actualizar estado del lote según resultado de calidad
  var nuevoEstadoLote = ESTADOS_LOTE.EN_CALIDAD;
  if (resultado === ESTADOS_CALIDAD.APROBADO)  nuevoEstadoLote = ESTADOS_LOTE.APROBADO;
  if (resultado === ESTADOS_CALIDAD.RECHAZADO) nuevoEstadoLote = ESTADOS_LOTE.RECHAZADO;
  if (resultado === ESTADOS_CALIDAD.BLOQUEADO) nuevoEstadoLote = ESTADOS_LOTE.BLOQUEADO;

  repoUpdate(SHEETS.LOTES, params.idLote, {
    ESTADO:     nuevoEstadoLote,
    UPDATED_AT: now,
    UPDATED_BY: usuario,
  });

  auditLog("CREATE_CALIDAD", "CALIDAD", id, "OK",
    "Calidad registrada para lote " + params.idLote + " — Resultado: " + resultado, usuario, rol);

  return { id, idLote: params.idLote, resultado, estadoLote: nuevoEstadoLote };
}

/**
 * Lista registros de calidad con filtros
 */
function listCalidad(filters) {
  return repoSearch(SHEETS.CALIDAD, filters || {});
}

/**
 * Obtiene el resultado de calidad de un lote
 */
function getCalidadByLote(idLote) {
  return repoSearch(SHEETS.CALIDAD, { ID_LOTE: idLote });
}

/**
 * Actualiza resultado de calidad (autorización requerida)
 */
function updateCalidad(idCalidad, params, usuario, rol) {
  var calidad = repoGetById(SHEETS.CALIDAD, idCalidad, "ID_CALIDAD");
  if (!calidad) throw new Error("Registro de calidad no encontrado: " + idCalidad);

  var now = timestamp();
  var updates = {
    RESULTADO:     params.resultado || calidad.RESULTADO,
    ESTADO:        params.resultado || calidad.ESTADO,
    OBSERVACIONES: params.observaciones || calidad.OBSERVACIONES,
    UPDATED_AT:    now,
    UPDATED_BY:    usuario,
  };
  repoUpdate(SHEETS.CALIDAD, idCalidad, updates);

  // Si cambia resultado, actualizar lote
  if (params.resultado) {
    var nuevoEstadoLote = ESTADOS_LOTE.EN_CALIDAD;
    if (params.resultado === ESTADOS_CALIDAD.APROBADO)  nuevoEstadoLote = ESTADOS_LOTE.APROBADO;
    if (params.resultado === ESTADOS_CALIDAD.RECHAZADO) nuevoEstadoLote = ESTADOS_LOTE.RECHAZADO;
    if (params.resultado === ESTADOS_CALIDAD.BLOQUEADO) nuevoEstadoLote = ESTADOS_LOTE.BLOQUEADO;

    repoUpdate(SHEETS.LOTES, calidad.ID_LOTE, {
      ESTADO:     nuevoEstadoLote,
      UPDATED_AT: now,
      UPDATED_BY: usuario,
    });
  }

  auditLog("UPDATE_CALIDAD", "CALIDAD", idCalidad, "OK",
    "Calidad actualizada. Resultado: " + (params.resultado || "-"), usuario, rol);

  return { idCalidad, ...updates };
}
