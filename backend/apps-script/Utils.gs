// ============================================================
// Utils.gs — Sucden Colombia · Sistema de Trazabilidad Café
// Funciones utilitarias compartidas
// ============================================================

/**
 * Genera un ID único con formato PREFIX-AAAA-000001
 * Usa LockService para evitar duplicados bajo concurrencia.
 * @param {string} prefix  — Ej: "CAF", "REC", "PRO"
 * @param {string} sheetName — Hoja donde buscar el último ID
 * @param {number} idColumn — Columna (1-based) donde están los IDs
 */
function generateId(prefix, sheetName, idColumn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var year = new Date().getFullYear();
    var sheet = getSheet(sheetName);
    var lastRow = sheet.getLastRow();
    var seq = 1;

    if (lastRow > 1) {
      var ids = sheet.getRange(2, idColumn || 1, lastRow - 1, 1).getValues();
      var pattern = new RegExp("^" + prefix + "-" + year + "-(\\d+)$");
      var maxSeq = 0;
      ids.forEach(function(row) {
        var m = String(row[0]).match(pattern);
        if (m) {
          var n = parseInt(m[1], 10);
          if (n > maxSeq) maxSeq = n;
        }
      });
      seq = maxSeq + 1;
    }

    return prefix + "-" + year + "-" + String(seq).padStart(6, "0");
  } finally {
    lock.releaseLock();
  }
}

/**
 * Ejecuta una función dentro de un lock de script
 * para proteger operaciones críticas.
 */
function withLock(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

/**
 * Retorna timestamp ISO actual (Colombia UTC-5)
 */
function timestamp() {
  return new Date().toISOString();
}

/**
 * Formatea fecha a DD/MM/AAAA HH:MM
 */
function formatDateTime(date) {
  if (!date) return "";
  var d = date instanceof Date ? date : new Date(date);
  var pad = function(n) { return String(n).padStart(2, "0"); };
  return pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + d.getFullYear() +
         " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
}

/**
 * Calcula diferencia de horas entre dos strings "HH:MM"
 */
function diffHours(horaInicio, horaFin) {
  var parseTime = function(t) {
    var parts = String(t).split(":");
    return parseInt(parts[0], 10) + (parseInt(parts[1], 10) / 60);
  };
  var ini = parseTime(horaInicio);
  var fin = parseTime(horaFin);
  if (fin < ini) fin += 24; // turno nocturno
  return Math.round((fin - ini) * 100) / 100;
}

/**
 * Hash SHA-256 con salt para contraseñas
 * Apps Script no tiene crypto nativo, usamos Utilities.computeDigest
 */
function hashPassword(password, salt) {
  var s = salt || "SucdenCafe2026";
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    s + password + s,
    Utilities.Charset.UTF_8
  );
  return bytes.map(function(b) {
    return ("0" + (b & 0xff).toString(16)).slice(-2);
  }).join("");
}

/**
 * Valida que un valor no sea nulo/vacío
 */
function required(value, fieldName) {
  if (value === null || value === undefined || String(value).trim() === "") {
    throw new Error("El campo '" + fieldName + "' es obligatorio.");
  }
  return String(value).trim();
}

/**
 * Valida que un número sea >= 0
 */
function nonNegative(value, fieldName) {
  var n = parseFloat(value);
  if (isNaN(n) || n < 0) {
    throw new Error("El campo '" + fieldName + "' debe ser un número mayor o igual a cero.");
  }
  return n;
}

/**
 * Valida que un número sea > 0
 */
function positive(value, fieldName) {
  var n = parseFloat(value);
  if (isNaN(n) || n <= 0) {
    throw new Error("El campo '" + fieldName + "' debe ser un número mayor a cero.");
  }
  return n;
}

/**
 * Construye respuesta JSON uniforme de éxito
 */
function successResponse(data, message) {
  return ContentService
    .createTextOutput(JSON.stringify({
      ok: true,
      message: message || "OK",
      data: data || null,
      timestamp: timestamp()
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Construye respuesta JSON uniforme de error
 */
function errorResponse(message, code) {
  return ContentService
    .createTextOutput(JSON.stringify({
      ok: false,
      message: message || "Error inesperado",
      code: code || "ERROR",
      timestamp: timestamp()
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Parsea parámetros de la request (GET o POST)
 */
function parseParams(e) {
  if (!e) return {};
  var params = {};
  // GET params
  if (e.parameter) {
    Object.keys(e.parameter).forEach(function(k) {
      params[k] = e.parameter[k];
    });
  }
  // POST body JSON
  if (e.postData && e.postData.contents) {
    try {
      var body = JSON.parse(e.postData.contents);
      Object.keys(body).forEach(function(k) {
        params[k] = body[k];
      });
    } catch(err) { /* no body JSON */ }
  }
  return params;
}

/**
 * Genera token de sesión firmado (HMAC simulado con SHA-256)
 * Payload: { userId, email, rol, exp }
 */
function generateToken(userId, email, rol) {
  var exp = new Date().getTime() + CONFIG.TOKEN_DURATION_MS;
  var payload = JSON.stringify({ userId: userId, email: email, rol: rol, exp: exp });
  var encoded = Utilities.base64Encode(payload);
  var sig = hashPassword(encoded, CONFIG.JWT_SECRET);
  return encoded + "." + sig;
}

/**
 * Verifica y decodifica token
 * Retorna payload o lanza error
 */
function verifyToken(token) {
  if (!token) throw new Error("Token requerido.");
  var parts = token.split(".");
  if (parts.length !== 2) throw new Error("Token inválido.");
  var encoded = parts[0];
  var sig = parts[1];
  var expectedSig = hashPassword(encoded, CONFIG.JWT_SECRET);
  if (sig !== expectedSig) throw new Error("Token no válido.");
  var payload = JSON.parse(Utilities.newBlob(Utilities.base64Decode(encoded)).getDataAsString());
  if (payload.exp < new Date().getTime()) throw new Error("Sesión expirada.");
  return payload;
}

/**
 * Redondea a 2 decimales
 */
function round2(n) {
  return Math.round(parseFloat(n) * 100) / 100;
}

/**
 * Convierte fecha string/Date a objeto Date
 */
function toDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  return new Date(v);
}

/**
 * Log de error en consola
 */
function logError(context, err) {
  Logger.log("[ERROR][" + context + "] " + (err.message || err));
}
