// ============================================================
// Api.gs — Sucden Colombia · Trazabilidad Café
// Punto de entrada único de la API — Router HTTP
// ============================================================

/**
 * Función para ejecutar directamente desde el editor de Google Apps Script.
 * Inicializa las 22 hojas, crea encabezados, carpetas en Drive y usuario Admin.
 */
function initSystem() {
  initDriveFolderStructure();
  var ss = getSpreadsheet();
  Logger.log("✅ Sistema Sucden Colombia inicializado con éxito.");
  Logger.log("📄 Nombre del Spreadsheet: " + ss.getName());
  Logger.log("🔗 URL del Spreadsheet: " + ss.getUrl());
  Logger.log("🔑 ID del Spreadsheet: " + ss.getId());
  return {
    url: ss.getUrl(),
    id: ss.getId(),
    name: ss.getName()
  };
}

/**
 * Maneja peticiones GET (lectura de datos)
 */
function doGet(e) {
  try {
    var params = parseParams(e);
    var action = params.action || "";

    // Inicialización pública (primer uso)
    if (action === "init") {
      initDriveFolderStructure();
      getSpreadsheet(); // Crea hojas si no existen
      return successResponse({ initialized: true }, "Sistema inicializado correctamente.");
    }

    // Health check público
    if (action === "health") {
      return successResponse({
        status: "ok",
        version: CONFIG.API_VERSION,
        timestamp: timestamp()
      }, "API Sucden Colombia operativa.");
    }

    // ── Rutas que requieren autenticación ──────────────────────
    var user = requireAuth(params);

    switch (action) {
      // Dashboard
      case "dashboard":        return successResponse(getDashboardData());

      // Recepciones
      case "listRecepciones":  return successResponse(listRecepciones(params));
      case "getRecepcion":     return successResponse(getRecepcion(params.id));

      // Lotes
      case "listLotes":        return successResponse(listLotes(params));
      case "getLote":          return successResponse(getLote(params.id));
      case "trazabilidadLote": return successResponse(getLoteTrazabilidad(params.id));

      // Calidad
      case "listCalidad":      return successResponse(listCalidad(params));
      case "getCalidadByLote": return successResponse(getCalidadByLote(params.idLote));

      // Producción
      case "listProduccion":   return successResponse(listProduccion(params));
      case "getProduccion":    return successResponse(getProduccion(params.id));

      // Inventario
      case "inventario":       return successResponse(getInventarioGeneral(params));
      case "stockLote":        return successResponse({ stock: getStockByLote(params.idLote) });
      case "listMovimientos":  return successResponse(listMovimientos(params));

      // Empaques
      case "listEmpaques":     return successResponse(listEmpaques(params));

      // Despachos
      case "listDespachos":    return successResponse(listDespachos(params));
      case "getDespacho":      return successResponse(getDespacho(params.id));

      // Documentos
      case "listDocumentos":   return successResponse(repoSearch(SHEETS.DOCUMENTOS, params));

      // Maestros
      case "listProveedores":  return successResponse(repoGetAll(SHEETS.PROVEEDORES));
      case "listProductores":  return successResponse(repoGetAll(SHEETS.PRODUCTORES));
      case "listFincas":       return successResponse(repoGetAll(SHEETS.FINCAS));
      case "listMaquinas":     return successResponse(repoGetAll(SHEETS.MAQUINAS));
      case "listOperarios":    return successResponse(repoGetAll(SHEETS.OPERARIOS));
      case "listTurnos":       return successResponse(repoGetAll(SHEETS.TURNOS));
      case "listBodegas":      return successResponse(repoGetAll(SHEETS.BODEGAS));
      case "listUsuarios":     return successResponse(listUsers());
      case "listNovedades":    return successResponse(repoGetAll(SHEETS.NOVEDADES));

      // Auditoría
      case "auditoria":        return successResponse(getAuditLogs(params.limit || 100, params));

      // Reportes
      case "reporteTrazabilidad":   return successResponse(reporteTrazabilidadLote(params.idLote));
      case "reporteProduccion":     return successResponse(reporteProduccionDiaria(params.fecha));
      case "reporteRendimiento":    return successResponse(reporteRendimientoPorLote());
      case "reporteProductividad":  return successResponse(reporteProductividadMaquina());
      case "reporteDespachos":      return successResponse(reporteDespachos(params));
      case "reporteInventario":     return successResponse(reporteInventario());
      case "reporteMermas":         return successResponse(reporteMermas(params.fechaDesde, params.fechaHasta));
      case "reporteNovedades":      return successResponse(reporteNovedades(params));

      // Tipos de café (catálogo)
      case "tiposCafe":        return successResponse(TIPOS_CAFE);
      case "roles":            return successResponse(Object.values(ROLES));
      case "estadosLote":      return successResponse(Object.values(ESTADOS_LOTE));

      default:
        return errorResponse("Acción no reconocida: " + action, "UNKNOWN_ACTION");
    }
  } catch(err) {
    logError("doGet", err);
    return errorResponse(err.message, err.code || "ERROR");
  }
}

/**
 * Maneja peticiones POST (escritura / mutaciones)
 */
function doPost(e) {
  try {
    var params = parseParams(e);
    var action = params.action || "";

    // ── Login y Registro (públicos) ───────────────────────────
    if (action === "login") {
      var result = authLogin(params.email, params.password);
      return successResponse(result, "Login exitoso.");
    }

    if (action === "register") {
      var newUsr = registerUser(params);
      return successResponse(newUsr, "Usuario registrado exitosamente. Ya puede iniciar sesión.");
    }

    // ── Rutas que requieren autenticación ──────────────────────
    var user = requireAuth(params);
    var usr  = user.email;
    var rol  = user.rol;

    switch (action) {

      // ── Usuarios ─────────────────────────────────────────────
      case "createUser":
        requireAuth(params, "admin"); // Solo admin
        return successResponse(createUser(params, usr), "Usuario creado.");

      case "changePassword":
        return successResponse(changePassword(params.userId, params.oldPassword, params.newPassword, usr));

      case "updateUser":
        return successResponse(repoUpdate(SHEETS.USUARIOS, params.id, {
          NOMBRE: params.nombre, ROL: params.rol, ESTADO: params.estado,
          UPDATED_AT: timestamp(), UPDATED_BY: usr,
        }), "Usuario actualizado.");

      // ── Maestros ──────────────────────────────────────────────
      case "createProveedor": {
        required(params.nombre, "nombre del proveedor");
        var id = withLock(function() { return repoNextId(SHEETS.PROVEEDORES, "PRV"); });
        var now = timestamp();
        var prov = { ID_PROVEEDOR: id, NOMBRE: params.nombre, NIT_CC: params.nit || "",
          TELEFONO: params.telefono || "", EMAIL: params.email || "",
          MUNICIPIO: params.municipio || "", DEPARTAMENTO: params.departamento || "",
          DIRECCION: params.direccion || "", CONTACTO: params.contacto || "",
          ESTADO: "ACTIVO", NOTAS: params.notas || "",
          CREATED_AT: now, CREATED_BY: usr, UPDATED_AT: now, UPDATED_BY: usr };
        repoCreate(SHEETS.PROVEEDORES, prov);
        auditLog("CREATE_PROVEEDOR", "PROVEEDORES", id, "OK", "Proveedor: " + params.nombre, usr, rol);
        return successResponse(prov, "Proveedor creado.");
      }

      case "createProductor": {
        var id2 = withLock(function() { return repoNextId(SHEETS.PRODUCTORES, "PDR"); });
        var now2 = timestamp();
        var prod2 = { ID_PRODUCTOR: id2, NOMBRE: params.nombre, NIT_CC: params.nit || "",
          TELEFONO: params.telefono || "", EMAIL: params.email || "",
          MUNICIPIO: params.municipio || "", DEPARTAMENTO: params.departamento || "",
          ID_PROVEEDOR: params.idProveedor || "", ESTADO: "ACTIVO", NOTAS: params.notas || "",
          CREATED_AT: now2, CREATED_BY: usr, UPDATED_AT: now2, UPDATED_BY: usr };
        repoCreate(SHEETS.PRODUCTORES, prod2);
        auditLog("CREATE_PRODUCTOR", "PRODUCTORES", id2, "OK", "Productor: " + params.nombre, usr, rol);
        return successResponse(prod2, "Productor creado.");
      }

      case "createFinca": {
        var id3 = withLock(function() { return repoNextId(SHEETS.FINCAS, "FIN"); });
        var now3 = timestamp();
        var finca = { ID_FINCA: id3, NOMBRE: params.nombre, ID_PRODUCTOR: params.idProductor || "",
          MUNICIPIO: params.municipio || "", DEPARTAMENTO: params.departamento || "",
          ALTITUD_MSNM: params.altitud || "", VARIEDAD: params.variedad || "",
          AREA_HAS: params.area || "", ESTADO: "ACTIVO", NOTAS: params.notas || "",
          CREATED_AT: now3, CREATED_BY: usr, UPDATED_AT: now3, UPDATED_BY: usr };
        repoCreate(SHEETS.FINCAS, finca);
        auditLog("CREATE_FINCA", "FINCAS", id3, "OK", "Finca: " + params.nombre, usr, rol);
        return successResponse(finca, "Finca creada.");
      }

      case "createMaquina": {
        var idM = withLock(function() { return repoNextId(SHEETS.MAQUINAS, "MAQ"); });
        var nowM = timestamp();
        var maq = { ID_MAQUINA: idM, NOMBRE: params.nombre, TIPO: params.tipo || "",
          MODELO: params.modelo || "", SERIE: params.serie || "",
          CAPACIDAD_KG_H: params.capacidad || "", ESTADO: "ACTIVO",
          UBICACION: params.ubicacion || "", NOTAS: params.notas || "",
          CREATED_AT: nowM, CREATED_BY: usr, UPDATED_AT: nowM, UPDATED_BY: usr };
        repoCreate(SHEETS.MAQUINAS, maq);
        return successResponse(maq, "Máquina creada.");
      }

      case "createOperario": {
        var idOp = withLock(function() { return repoNextId(SHEETS.OPERARIOS, "OPE"); });
        var nowOp = timestamp();
        var op = { ID_OPERARIO: idOp, NOMBRE: params.nombre, CC: params.cc || "",
          CARGO: params.cargo || "", TURNO_DEFAULT: params.turnoDefault || "",
          TELEFONO: params.telefono || "", ESTADO: "ACTIVO", NOTAS: params.notas || "",
          CREATED_AT: nowOp, CREATED_BY: usr, UPDATED_AT: nowOp, UPDATED_BY: usr };
        repoCreate(SHEETS.OPERARIOS, op);
        return successResponse(op, "Operario creado.");
      }

      case "createTurno": {
        var idT = withLock(function() { return repoNextId(SHEETS.TURNOS, "TUR"); });
        var nowT = timestamp();
        var turno = { ID_TURNO: idT, NOMBRE: params.nombre, HORA_INICIO: params.horaInicio || "",
          HORA_FIN: params.horaFin || "", DESCRIPCION: params.descripcion || "",
          ESTADO: "ACTIVO", CREATED_AT: nowT, CREATED_BY: usr };
        repoCreate(SHEETS.TURNOS, turno);
        return successResponse(turno, "Turno creado.");
      }

      case "createBodega": {
        var idB = withLock(function() { return repoNextId(SHEETS.BODEGAS, "BOD"); });
        var nowB = timestamp();
        var bod = { ID_BODEGA: idB, NOMBRE: params.nombre, UBICACION: params.ubicacion || "",
          CAPACIDAD_KG: params.capacidad || "", TIPO: params.tipo || "",
          ESTADO: "ACTIVO", RESPONSABLE: params.responsable || "",
          NOTAS: params.notas || "", CREATED_AT: nowB, CREATED_BY: usr,
          UPDATED_AT: nowB, UPDATED_BY: usr };
        repoCreate(SHEETS.BODEGAS, bod);
        return successResponse(bod, "Bodega creada.");
      }

      // ── Recepción / Lotes ─────────────────────────────────────
      case "createRecepcion":
        return successResponse(createRecepcion(params, usr, rol), "Recepción registrada.");

      case "updateLoteEstado":
        return successResponse(updateLoteEstado(params.idLote, params.estado, usr, rol));

      case "updateLote":
        return successResponse(repoUpdate(SHEETS.LOTES, params.idLote, {
          NOTAS: params.notas, VARIEDAD: params.variedad,
          UPDATED_AT: timestamp(), UPDATED_BY: usr,
        }));

      // ── Calidad ───────────────────────────────────────────────
      case "createCalidad":
        return successResponse(createCalidad(params, usr, rol), "Calidad registrada.");

      case "updateCalidad":
        return successResponse(updateCalidad(params.idCalidad, params, usr, rol));

      // ── Producción ────────────────────────────────────────────
      case "startProduccion":
        return successResponse(startProduccion(params, usr, rol), "Producción iniciada.");

      case "finishProduccion":
        return successResponse(finishProduccion(params, usr, rol), "Producción finalizada.");

      // ── Inventario ────────────────────────────────────────────
      case "ajusteInventario":
        return successResponse(registerMovimientoInventario({
          tipo: TIPOS_MOVIMIENTO.AJUSTE, idLote: params.idLote,
          producto: params.producto, idBodega: params.idBodega,
          kg: params.kg, idReferencia: "AJUSTE", tipoReferencia: "AJUSTE",
          notas: params.notas, usuario: usr,
        }), "Ajuste registrado.");

      // ── Empaque ───────────────────────────────────────────────
      case "createEmpaque":
        return successResponse(createEmpaque(params, usr, rol), "Empaque registrado.");

      // ── Despachos ─────────────────────────────────────────────
      case "createDespacho":
        return successResponse(createDespacho(params, usr, rol), "Despacho creado.");

      case "confirmDespacho":
        return successResponse(confirmDespacho(params.idDespacho, usr, rol), "Despacho confirmado.");

      case "cancelDespacho":
        return successResponse(cancelDespacho(params.idDespacho, params.motivo, usr, rol));

      case "updateDespacho":
        return successResponse(repoUpdate(SHEETS.DESPACHOS, params.idDespacho, {
          BOOKING: params.booking, BL: params.bl, FACTURA: params.factura,
          CONTENEDOR: params.contenedor, OBSERVACIONES: params.observaciones,
          UPDATED_AT: timestamp(), UPDATED_BY: usr,
        }));

      // ── Documentos ────────────────────────────────────────────
      case "uploadDocument":
        return successResponse(uploadAndRegisterDocument({ ...params, usuario: usr }), "Documento subido.");

      // ── Novedades ─────────────────────────────────────────────
      case "createNovedad": {
        var idN = withLock(function() { return repoNextId(SHEETS.NOVEDADES, ID_PREFIXES.NOVEDAD); });
        var nowN = timestamp();
        var nov = { ID_NOVEDAD: idN, FECHA: params.fecha || nowN, TIPO: params.tipo || "",
          MODULO: params.modulo || "", ENTIDAD_ID: params.entidadId || "",
          DESCRIPCION: params.descripcion || "", IMPACTO: params.impacto || "",
          RESPONSABLE: params.responsable || usr, ESTADO: "ABIERTA",
          RESOLUCION: "", FECHA_RESOLUCION: "",
          CREATED_AT: nowN, CREATED_BY: usr, UPDATED_AT: nowN, UPDATED_BY: usr };
        repoCreate(SHEETS.NOVEDADES, nov);
        auditLog("CREATE_NOVEDAD", "NOVEDADES", idN, "OK", "Novedad: " + params.descripcion, usr, rol);
        return successResponse(nov, "Novedad registrada.");
      }

      case "resolverNovedad":
        return successResponse(repoUpdate(SHEETS.NOVEDADES, params.idNovedad, {
          ESTADO: "RESUELTA", RESOLUCION: params.resolucion,
          FECHA_RESOLUCION: timestamp(), UPDATED_AT: timestamp(), UPDATED_BY: usr,
        }));

      // ── Drive init ────────────────────────────────────────────
      case "initDrive":
        return successResponse({ rootId: initDriveFolderStructure() }, "Estructura Drive inicializada.");

      default:
        return errorResponse("Acción no reconocida: " + action, "UNKNOWN_ACTION");
    }
  } catch(err) {
    logError("doPost", err);
    return errorResponse(err.message, err.code || "ERROR");
  }
}
