// ============================================================
// DriveService.gs — Sucden Colombia · Trazabilidad Café
// Gestión de archivos en Google Drive
// ============================================================

// ── Cache de carpetas ─────────────────────────────────────────
var _folderCache = {};

/**
 * Obtiene o crea una carpeta dentro de un padre
 */
function getOrCreateFolder(name, parentFolder) {
  var cacheKey = name + (parentFolder ? parentFolder.getId() : "root");
  if (_folderCache[cacheKey]) return _folderCache[cacheKey];

  var parent = parentFolder || DriveApp.getRootFolder();
  var folders = parent.getFoldersByName(name);
  var folder;
  if (folders.hasNext()) {
    folder = folders.next();
  } else {
    folder = parent.createFolder(name);
  }
  _folderCache[cacheKey] = folder;
  return folder;
}

/**
 * Inicializa la estructura completa de carpetas en Drive.
 * Retorna el ID de la carpeta raíz.
 */
function initDriveFolderStructure() {
  var root = getOrCreateFolder(DRIVE_FOLDERS.ROOT);
  Object.keys(DRIVE_FOLDERS).forEach(function(key) {
    if (key === "ROOT") return;
    getOrCreateFolder(DRIVE_FOLDERS[key], root);
  });
  return root.getId();
}

/**
 * Obtiene la carpeta raíz de Sucden Colombia en Drive
 */
function getRootFolder() {
  return getOrCreateFolder(DRIVE_FOLDERS.ROOT);
}

/**
 * Obtiene una subcarpeta por nombre dentro de la raíz
 */
function getSubFolder(folderKey) {
  var root = getRootFolder();
  return getOrCreateFolder(DRIVE_FOLDERS[folderKey] || folderKey, root);
}

/**
 * Obtiene o crea carpeta específica para una entidad (ej: un lote, un despacho)
 * @param {string} folderKey  — clave en DRIVE_FOLDERS (ej: "LOTES")
 * @param {string} entityId   — ID de la entidad (ej: "CAF-2026-000001")
 */
function getEntityFolder(folderKey, entityId) {
  var parent = getSubFolder(folderKey);
  return getOrCreateFolder(entityId, parent);
}

/**
 * Guarda un archivo en Drive desde un string Base64
 * @param {string} base64     — Contenido del archivo codificado en Base64
 * @param {string} fileName   — Nombre del archivo (estandarizado)
 * @param {string} mimeType   — MIME type del archivo
 * @param {object} folder     — Objeto Folder de Drive destino
 * @returns {{ fileId, url, nombre }}
 */
function saveFileFromBase64(base64, fileName, mimeType, folder) {
  try {
    var bytes = Utilities.base64Decode(base64);
    var blob = Utilities.newBlob(bytes, mimeType, fileName);
    var file = folder.createFile(blob);
    // Compartir como lectura pública (para preview desde frontend)
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return {
      fileId: file.getId(),
      url: "https://drive.google.com/file/d/" + file.getId() + "/view",
      previewUrl: "https://drive.google.com/thumbnail?id=" + file.getId(),
      nombre: fileName,
      tamaño: blob.getBytes().length,
    };
  } catch(err) {
    throw new Error("Error al guardar archivo en Drive: " + err.message);
  }
}

/**
 * Genera nombre estandarizado para documento
 * @param {string} entityId    — ID entidad (CAF-2026-000001)
 * @param {string} tipoDoc     — Tipo de documento (RECEPCION, CALIDAD, etc.)
 * @param {string} extension   — Extensión del archivo (jpg, pdf, etc.)
 */
function standardFileName(entityId, tipoDoc, extension) {
  var fecha = Utilities.formatDate(new Date(), "America/Bogota", "yyyyMMdd");
  return (entityId + "_" + tipoDoc + "_" + fecha + "." + extension)
    .replace(/[^a-zA-Z0-9._\-]/g, "_");
}

/**
 * Elimina un archivo de Drive por ID
 */
function deleteFileFromDrive(fileId) {
  try {
    var file = DriveApp.getFileById(fileId);
    file.setTrashed(true);
    return true;
  } catch(err) {
    Logger.log("[DriveService] Error al eliminar archivo " + fileId + ": " + err.message);
    return false;
  }
}

/**
 * Sube un documento y lo registra en la hoja DOCUMENTOS
 * @param {object} params — { base64, fileName, mimeType, extension, entityTipo, entityId, tipoDocumento, usuario, notas }
 */
function uploadAndRegisterDocument(params) {
  required(params.base64, "base64");
  required(params.entityTipo, "entityTipo");
  required(params.entityId, "entityId");
  required(params.tipoDocumento, "tipoDocumento");
  required(params.usuario, "usuario");

  // Determinar carpeta destino según tipo de entidad
  var folderMap = {
    LOTE:       "LOTES",
    RECEPCION:  "RECEPCIONES",
    PRODUCCION: "PRODUCCION",
    CALIDAD:    "CALIDAD",
    EMPAQUE:    "EMPAQUE",
    DESPACHO:   "DESPACHOS",
    GENERAL:    "DOCUMENTOS",
  };
  var folderKey = folderMap[params.entityTipo] || "DOCUMENTOS";
  var folder;
  if (["LOTE","DESPACHO"].indexOf(params.entityTipo) !== -1) {
    folder = getEntityFolder(folderKey, params.entityId);
  } else {
    folder = getSubFolder(folderKey);
  }

  var ext = (params.extension || "bin").replace(/^\./, "");
  var stdName = standardFileName(params.entityId, params.tipoDocumento, ext);
  var mimeType = params.mimeType || "application/octet-stream";

  var result = saveFileFromBase64(params.base64, stdName, mimeType, folder);

  // Registrar en hoja DOCUMENTOS
  var docId = repoNextId(SHEETS.DOCUMENTOS, ID_PREFIXES.DOCUMENTO);
  var now = timestamp();
  var docRecord = {
    ID_DOCUMENTO:    docId,
    ENTIDAD_TIPO:    params.entityTipo,
    ENTIDAD_ID:      params.entityId,
    TIPO_DOCUMENTO:  params.tipoDocumento,
    NOMBRE_ORIGINAL: params.fileName || stdName,
    NOMBRE_ESTANDAR: stdName,
    DRIVE_FILE_ID:   result.fileId,
    DRIVE_URL:       result.url,
    MIME_TYPE:       mimeType,
    TAMAÑO_BYTES:    result.tamaño || 0,
    FECHA:           now,
    USUARIO:         params.usuario,
    NOTAS:           params.notas || "",
    CREATED_AT:      now,
  };
  repoCreate(SHEETS.DOCUMENTOS, docRecord);

  auditLog("UPLOAD_DOCUMENTO", params.entityTipo, params.entityId, "OK",
    "Documento subido: " + stdName, params.usuario, "");

  return { docId: docId, fileId: result.fileId, url: result.url, nombre: stdName };
}
