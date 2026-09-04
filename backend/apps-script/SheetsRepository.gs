// ============================================================
// SheetsRepository.gs — Sucden Colombia · Trazabilidad Café
// Capa de acceso a datos — Google Sheets
// ============================================================

// ── Cache del Spreadsheet ─────────────────────────────────────
var _spreadsheet = null;

function getSpreadsheet() {
  if (_spreadsheet) return _spreadsheet;

  if (CONFIG.SPREADSHEET_ID && CONFIG.SPREADSHEET_ID.trim() !== "") {
    try {
      _spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID.trim());
    } catch (e) {
      Logger.log("Error abriendo por SPREADSHEET_ID: " + e.message);
    }
  }

  if (!_spreadsheet) {
    try {
      _spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    } catch (e) {
      _spreadsheet = null;
    }
  }

  if (!_spreadsheet) {
    var files = DriveApp.getFilesByName(CONFIG.SPREADSHEET_NAME);
    if (files.hasNext()) {
      _spreadsheet = SpreadsheetApp.open(files.next());
    } else {
      _spreadsheet = SpreadsheetApp.create(CONFIG.SPREADSHEET_NAME);
    }
  }
  _initializeSheets(_spreadsheet);
  return _spreadsheet;
}

function getSheet(sheetName) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    _addSheetHeaders(sheet, sheetName);
  }
  return sheet;
}

// ── Cabeceras por hoja ────────────────────────────────────────
var SHEET_HEADERS = {
  USUARIOS: ["ID_USUARIO","NOMBRE","EMAIL","ROL","ESTADO","PASSWORD_HASH","ULTIMO_LOGIN","CREATED_AT","CREATED_BY"],
  ROLES: ["ID_ROL","NOMBRE","DESCRIPCION","PERMISOS","ESTADO","CREATED_AT"],
  PROVEEDORES: ["ID_PROVEEDOR","NOMBRE","NIT_CC","TELEFONO","EMAIL","MUNICIPIO","DEPARTAMENTO","DIRECCION","CONTACTO","ESTADO","NOTAS","CREATED_AT","CREATED_BY","UPDATED_AT","UPDATED_BY"],
  PRODUCTORES: ["ID_PRODUCTOR","NOMBRE","NIT_CC","TELEFONO","EMAIL","MUNICIPIO","DEPARTAMENTO","ID_PROVEEDOR","ESTADO","NOTAS","CREATED_AT","CREATED_BY","UPDATED_AT","UPDATED_BY"],
  FINCAS: ["ID_FINCA","NOMBRE","ID_PRODUCTOR","MUNICIPIO","DEPARTAMENTO","ALTITUD_MSNM","VARIEDAD","AREA_HAS","ESTADO","NOTAS","CREATED_AT","CREATED_BY","UPDATED_AT","UPDATED_BY"],
  LOTES: ["ID_LOTE","FECHA_RECEPCION","ID_PROVEEDOR","ID_PRODUCTOR","ID_FINCA","TIPO_CAFE","KG_RECEPCION","ESTADO","MUNICIPIO","VARIEDAD","NOTAS","CREATED_AT","CREATED_BY","UPDATED_AT","UPDATED_BY"],
  RECEPCIONES: ["ID_RECEPCION","FECHA","HORA","ID_LOTE","ID_PROVEEDOR","ID_PRODUCTOR","ID_FINCA","MUNICIPIO","DOCUMENTO_REMISION","TIPO_CAFE","SACOS","PESO_BRUTO_KG","TARA_KG","PESO_NETO_KG","HUMEDAD_PCT","FACTOR","DEFECTOS_PCT","TEMPERATURA","OBSERVACIONES","RESPONSABLE","ESTADO","CREATED_AT","CREATED_BY","UPDATED_AT","UPDATED_BY"],
  CALIDAD: ["ID_CALIDAD","ID_LOTE","FECHA","HUMEDAD_PCT","FACTOR","CLASIFICACION","DEFECTOS_PCT","TAZA_PUNTAJE","RESULTADO","RESPONSABLE","LABORATORIO","OBSERVACIONES","ESTADO","DRIVE_FILE_ID","DRIVE_URL","CREATED_AT","CREATED_BY","UPDATED_AT","UPDATED_BY"],
  MAQUINAS: ["ID_MAQUINA","NOMBRE","TIPO","MODELO","SERIE","CAPACIDAD_KG_H","ESTADO","UBICACION","NOTAS","CREATED_AT","CREATED_BY","UPDATED_AT","UPDATED_BY"],
  OPERARIOS: ["ID_OPERARIO","NOMBRE","CC","CARGO","TURNO_DEFAULT","TELEFONO","ESTADO","NOTAS","CREATED_AT","CREATED_BY","UPDATED_AT","UPDATED_BY"],
  TURNOS: ["ID_TURNO","NOMBRE","HORA_INICIO","HORA_FIN","DESCRIPCION","ESTADO","CREATED_AT","CREATED_BY"],
  PRODUCCION: ["ID_PRODUCCION","FECHA","ID_TURNO","ID_MAQUINA","ID_OPERARIO","HORA_INICIO","HORA_FIN","TIEMPO_HORAS","KG_ENTRADA","KG_EXCELSO","KG_SUBPRODUCTO","KG_MERMA","RENDIMIENTO_PCT","PRODUCTIVIDAD_KG_H","OBSERVACIONES","ESTADO","CREATED_AT","CREATED_BY","UPDATED_AT","UPDATED_BY"],
  PRODUCCION_LOTES: ["ID_DETALLE","ID_PRODUCCION","ID_LOTE","KG_ENTRADA","KG_EXCELSO","KG_SUBPRODUCTO","KG_MERMA","CREATED_AT"],
  BODEGAS: ["ID_BODEGA","NOMBRE","UBICACION","CAPACIDAD_KG","TIPO","ESTADO","RESPONSABLE","NOTAS","CREATED_AT","CREATED_BY","UPDATED_AT","UPDATED_BY"],
  MOVIMIENTOS_INVENTARIO: ["ID_MOVIMIENTO","FECHA","TIPO","ID_LOTE","PRODUCTO","ID_BODEGA","UBICACION","KG","KG_ANTERIOR","KG_NUEVO","ID_REFERENCIA","TIPO_REFERENCIA","NOTAS","USUARIO","CREATED_AT"],
  EMPAQUES: ["ID_EMPAQUE","FECHA","ID_LOTE","PRODUCTO","PRESENTACION","PESO_UNITARIO_KG","CANTIDAD_SACOS","PESO_TOTAL_KG","ID_BODEGA","UBICACION","PALLET","RESPONSABLE","OBSERVACIONES","ESTADO","CREATED_AT","CREATED_BY","UPDATED_AT","UPDATED_BY"],
  DESPACHOS: ["ID_DESPACHO","FECHA","CLIENTE","PAIS_DESTINO","CIUDAD_DESTINO","TRANSPORTADORA","VEHICULO","PLACA","CONDUCTOR","CONTENEDOR","BOOKING","BL","FACTURA","CANTIDAD_SACOS","KG_TOTAL","RESPONSABLE","OBSERVACIONES","ESTADO","CREATED_AT","CREATED_BY","UPDATED_AT","UPDATED_BY"],
  DESPACHO_LOTES: ["ID_DETALLE","ID_DESPACHO","ID_LOTE","KG","SACOS","PRODUCTO","CREATED_AT"],
  DOCUMENTOS: ["ID_DOCUMENTO","ENTIDAD_TIPO","ENTIDAD_ID","TIPO_DOCUMENTO","NOMBRE_ORIGINAL","NOMBRE_ESTANDAR","DRIVE_FILE_ID","DRIVE_URL","MIME_TYPE","TAMAÑO_BYTES","FECHA","USUARIO","NOTAS","CREATED_AT"],
  NOVEDADES: ["ID_NOVEDAD","FECHA","TIPO","MODULO","ENTIDAD_ID","DESCRIPCION","IMPACTO","RESPONSABLE","ESTADO","RESOLUCION","FECHA_RESOLUCION","CREATED_AT","CREATED_BY","UPDATED_AT","UPDATED_BY"],
  AUDITORIA: ["ID_AUDITORIA","FECHA_HORA","USUARIO","EMAIL_USUARIO","ROL_USUARIO","ACCION","MODULO","ENTIDAD_TIPO","ENTIDAD_ID","RESULTADO","DETALLE","IP"],
  CONFIGURACION: ["CLAVE","VALOR","DESCRIPCION","UPDATED_AT","UPDATED_BY"],
};

function _addSheetHeaders(sheet, sheetName) {
  var headers = SHEET_HEADERS[sheetName];
  if (!headers) return;
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground("#2C1810")
    .setFontColor("#FFFFFF")
    .setFontWeight("bold");
  sheet.setFrozenRows(1);
}

function _initializeSheets(ss) {
  Object.keys(SHEETS).forEach(function(key) {
    var name = SHEETS[key];
    var existing = ss.getSheetByName(name);
    if (!existing) {
      var sheet = ss.insertSheet(name);
      _addSheetHeaders(sheet, name);
    }
  });
  // Eliminar hoja por defecto "Sheet1" si existe
  var defaultSheet = ss.getSheetByName("Sheet1") || ss.getSheetByName("Hoja 1");
  if (defaultSheet && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultSheet);
  }
  // Insertar usuario administrador inicial
  _seedAdminUser(ss);
}

function _seedAdminUser(ss) {
  var sheet = ss.getSheetByName(SHEETS.USUARIOS);
  if (!sheet || sheet.getLastRow() > 1) return;
  var now = timestamp();
  sheet.appendRow([
    "USR-2026-000001",
    "Administrador Sucden",
    "admin@sucden.com.co",
    "ADMINISTRADOR",
    "ACTIVO",
    hashPassword("Admin2026!", "SucdenCafe2026"),
    "",
    now,
    "SISTEMA"
  ]);
}

// ── CRUD Genérico ─────────────────────────────────────────────

/**
 * Retorna todos los registros de una hoja como array de objetos
 */
function repoGetAll(sheetName, activeOnly) {
  var sheet = getSheet(sheetName);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var data = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  var result = [];
  data.forEach(function(row) {
    if (row[0] === "" || row[0] === null) return;
    var obj = {};
    headers.forEach(function(h, i) {
      obj[h] = row[i];
    });
    if (activeOnly && obj.ESTADO && obj.ESTADO === "INACTIVO") return;
    result.push(obj);
  });
  return result;
}

/**
 * Busca un registro por valor en la columna de ID (col 1 por defecto)
 */
function repoGetById(sheetName, id, idField) {
  var all = repoGetAll(sheetName);
  var field = idField || Object.keys(SHEET_HEADERS[sheetName] ? {[SHEET_HEADERS[sheetName][0]]: true} : {"ID": true})[0];
  var headerRow = SHEET_HEADERS[sheetName];
  var idCol = headerRow ? headerRow[0] : "ID";
  return all.find(function(r) { return r[idCol] === id; }) || null;
}

/**
 * Busca registros que coincidan con un conjunto de filtros
 */
function repoSearch(sheetName, filters) {
  var all = repoGetAll(sheetName);
  return all.filter(function(row) {
    return Object.keys(filters).every(function(key) {
      if (filters[key] === null || filters[key] === undefined || filters[key] === "") return true;
      return String(row[key]).toLowerCase().indexOf(String(filters[key]).toLowerCase()) !== -1;
    });
  });
}

/**
 * Crea un nuevo registro en la hoja
 */
function repoCreate(sheetName, data) {
  var sheet = getSheet(sheetName);
  var headers = SHEET_HEADERS[sheetName];
  var row = headers.map(function(h) {
    var v = data[h];
    return (v === undefined || v === null) ? "" : v;
  });
  sheet.appendRow(row);
  return data;
}

/**
 * Actualiza un registro existente por ID (col 1)
 */
function repoUpdate(sheetName, id, updates) {
  var sheet = getSheet(sheetName);
  var headers = SHEET_HEADERS[sheetName];
  var idField = headers[0];
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) throw new Error("No hay registros en " + sheetName);
  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  var rowIndex = -1;
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) {
      rowIndex = i + 2; // +2 por header y 1-based
      break;
    }
  }
  if (rowIndex === -1) throw new Error("Registro no encontrado: " + id);
  // Leer fila actual
  var currentRow = sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
  var currentObj = {};
  headers.forEach(function(h, i) { currentObj[h] = currentRow[i]; });
  // Aplicar updates
  Object.keys(updates).forEach(function(k) {
    if (k !== idField) currentObj[k] = updates[k];
  });
  var newRow = headers.map(function(h) {
    var v = currentObj[h];
    return (v === undefined || v === null) ? "" : v;
  });
  sheet.getRange(rowIndex, 1, 1, headers.length).setValues([newRow]);
  return currentObj;
}

/**
 * Obtiene el siguiente número de secuencia para un sheet
 * dado un prefijo de ID
 */
function repoNextId(sheetName, prefix, idColumn) {
  return generateId(prefix, sheetName, idColumn || 1);
}

/**
 * Cuenta registros por campo/valor
 */
function repoCount(sheetName, field, value) {
  var all = repoGetAll(sheetName);
  if (!field) return all.length;
  return all.filter(function(r) { return r[field] === value; }).length;
}

/**
 * Suma valores numéricos de un campo
 */
function repoSum(sheetName, field, filterField, filterValue) {
  var all = repoGetAll(sheetName);
  return all.reduce(function(acc, row) {
    if (filterField && row[filterField] !== filterValue) return acc;
    var v = parseFloat(row[field]);
    return acc + (isNaN(v) ? 0 : v);
  }, 0);
}
