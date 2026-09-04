// ============================================================
// AuditService.gs — Sucden Colombia · Trazabilidad Café
// Registro de auditoría de todas las operaciones
// ============================================================

/**
 * Registra una entrada en la hoja AUDITORIA
 * @param {string} accion       — Nombre de la acción (CREATE_LOTE, LOGIN, etc.)
 * @param {string} modulo       — Módulo del sistema
 * @param {string} entidadId    — ID de la entidad afectada
 * @param {string} resultado    — OK | ERROR
 * @param {string} detalle      — Descripción detallada
 * @param {string} usuario      — Email del usuario
 * @param {string} rol          — Rol del usuario
 */
function auditLog(accion, modulo, entidadId, resultado, detalle, usuario, rol) {
  try {
    var id = repoNextId(SHEETS.AUDITORIA, ID_PREFIXES.AUDITORIA);
    var now = timestamp();
    repoCreate(SHEETS.AUDITORIA, {
      ID_AUDITORIA:  id,
      FECHA_HORA:    now,
      USUARIO:       usuario || "SISTEMA",
      EMAIL_USUARIO: usuario || "",
      ROL_USUARIO:   rol || "",
      ACCION:        accion || "",
      MODULO:        modulo || "",
      ENTIDAD_TIPO:  modulo || "",
      ENTIDAD_ID:    entidadId || "",
      RESULTADO:     resultado || "OK",
      DETALLE:       detalle || "",
      IP:            "",
    });
  } catch(err) {
    // No propagar errores de auditoría para no interrumpir operación principal
    Logger.log("[AUDIT ERROR] " + err.message);
  }
}

/**
 * Retorna los últimos N registros de auditoría
 */
function getAuditLogs(limit, filters) {
  var all = repoGetAll(SHEETS.AUDITORIA);
  // Ordenar por fecha DESC
  all.sort(function(a, b) {
    return new Date(b.FECHA_HORA) - new Date(a.FECHA_HORA);
  });
  // Aplicar filtros
  if (filters) {
    if (filters.usuario) {
      all = all.filter(function(r) {
        return String(r.USUARIO).toLowerCase().indexOf(filters.usuario.toLowerCase()) !== -1;
      });
    }
    if (filters.modulo) {
      all = all.filter(function(r) { return r.MODULO === filters.modulo; });
    }
    if (filters.resultado) {
      all = all.filter(function(r) { return r.RESULTADO === filters.resultado; });
    }
    if (filters.fechaDesde) {
      var desde = new Date(filters.fechaDesde);
      all = all.filter(function(r) { return new Date(r.FECHA_HORA) >= desde; });
    }
    if (filters.fechaHasta) {
      var hasta = new Date(filters.fechaHasta);
      all = all.filter(function(r) { return new Date(r.FECHA_HORA) <= hasta; });
    }
  }
  return all.slice(0, limit || 200);
}
