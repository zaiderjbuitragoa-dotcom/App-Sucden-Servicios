// ============================================================
// Config.gs — Sucden Colombia · Sistema de Trazabilidad Café
// Configuración central del backend
// ============================================================

var CONFIG = {
  // ── ID de la Hoja de Google Sheets
  SPREADSHEET_ID: "12C94my9ok88aML9LxMxXeGgV788fH7iLWZMvKSSuFLE",

  // ── Nombre del archivo maestro en Google Drive ──────────────
  SPREADSHEET_NAME: "Sucden Colombia — Base de Datos Trazabilidad",

  // ── Nombre de la carpeta raíz en Google Drive ───────────────
  DRIVE_ROOT_FOLDER: "SUCDEN_COLOMBIA_CAFE",

  // ── Clave secreta para firma de tokens (cambiar en producción)
  JWT_SECRET: "SucdenColombia_SecretKey_2026_TrazaCafe!",

  // ── Duración del token en milisegundos (8 horas) ────────────
  TOKEN_DURATION_MS: 8 * 60 * 60 * 1000,

  // ── Versión de la API ────────────────────────────────────────
  API_VERSION: "1.0.0",

  // ── Empresa ──────────────────────────────────────────────────
  COMPANY_NAME: "Sucden Colombia S.A.S.",
  COMPANY_NIT: "",
};

// ── Hojas de Google Sheets ────────────────────────────────────
var SHEETS = {
  USUARIOS:              "USUARIOS",
  ROLES:                 "ROLES",
  PROVEEDORES:           "PROVEEDORES",
  PRODUCTORES:           "PRODUCTORES",
  FINCAS:                "FINCAS",
  LOTES:                 "LOTES",
  RECEPCIONES:           "RECEPCIONES",
  CALIDAD:               "CALIDAD",
  MAQUINAS:              "MAQUINAS",
  OPERARIOS:             "OPERARIOS",
  TURNOS:                "TURNOS",
  PRODUCCION:            "PRODUCCION",
  PRODUCCION_LOTES:      "PRODUCCION_LOTES",
  BODEGAS:               "BODEGAS",
  MOVIMIENTOS_INVENTARIO:"MOVIMIENTOS_INVENTARIO",
  EMPAQUES:              "EMPAQUES",
  DESPACHOS:             "DESPACHOS",
  DESPACHO_LOTES:        "DESPACHO_LOTES",
  DOCUMENTOS:            "DOCUMENTOS",
  NOVEDADES:             "NOVEDADES",
  AUDITORIA:             "AUDITORIA",
  CONFIGURACION:         "CONFIGURACION",
};

// ── Prefijos de IDs ───────────────────────────────────────────
var ID_PREFIXES = {
  LOTE:       "CAF",
  RECEPCION:  "REC",
  PRODUCCION: "PRO",
  DESPACHO:   "DES",
  DOCUMENTO:  "DOC",
  CALIDAD:    "CAL",
  EMPAQUE:    "EMP",
  NOVEDAD:    "NOV",
  AUDITORIA:  "AUD",
};

// ── Roles del sistema ─────────────────────────────────────────
var ROLES = {
  ADMINISTRADOR: "ADMINISTRADOR",
  RECEPCION:     "RECEPCION",
  PRODUCCION:    "PRODUCCION",
  CALIDAD:       "CALIDAD",
  BODEGA:        "BODEGA",
  DESPACHOS:     "DESPACHOS",
  GERENCIA:      "GERENCIA",
  CONSULTA:      "CONSULTA",
};

// ── Permisos por rol ──────────────────────────────────────────
var PERMISOS = {
  ADMINISTRADOR: ["*"],
  GERENCIA:      ["dashboard","lotes","recepciones","calidad","produccion","inventario","empaque","despachos","documentos","reportes","novedades"],
  RECEPCION:     ["recepcion","lotes","documentos","novedades"],
  PRODUCCION:    ["produccion","inventario","lotes","documentos","novedades"],
  CALIDAD:       ["calidad","lotes","documentos","novedades"],
  BODEGA:        ["inventario","empaque","lotes","documentos"],
  DESPACHOS:     ["despachos","inventario","lotes","documentos","novedades"],
  CONSULTA:      ["dashboard","lotes","calidad","produccion","inventario","despachos","reportes"],
};

// ── Estados de lote ───────────────────────────────────────────
var ESTADOS_LOTE = {
  RECIBIDO:    "RECIBIDO",
  EN_CALIDAD:  "EN_CALIDAD",
  APROBADO:    "APROBADO",
  RECHAZADO:   "RECHAZADO",
  BLOQUEADO:   "BLOQUEADO",
  EN_PROCESO:  "EN_PROCESO",
  PROCESADO:   "PROCESADO",
  EMPACADO:    "EMPACADO",
  DESPACHADO:  "DESPACHADO",
};

// ── Estados de calidad ────────────────────────────────────────
var ESTADOS_CALIDAD = {
  PENDIENTE:  "PENDIENTE",
  APROBADO:   "APROBADO",
  RECHAZADO:  "RECHAZADO",
  BLOQUEADO:  "BLOQUEADO",
};

// ── Estados de producción ─────────────────────────────────────
var ESTADOS_PRODUCCION = {
  EN_PROCESO:  "EN_PROCESO",
  FINALIZADO:  "FINALIZADO",
  CANCELADO:   "CANCELADO",
};

// ── Estados de despacho ───────────────────────────────────────
var ESTADOS_DESPACHO = {
  BORRADOR:   "BORRADOR",
  VALIDADO:   "VALIDADO",
  CONFIRMADO: "CONFIRMADO",
  CANCELADO:  "CANCELADO",
};

// ── Tipos de movimiento inventario ────────────────────────────
var TIPOS_MOVIMIENTO = {
  ENTRADA:        "ENTRADA",
  SALIDA:         "SALIDA",
  TRANSFORMACION: "TRANSFORMACION",
  TRASLADO:       "TRASLADO",
  AJUSTE:         "AJUSTE",
  RESERVA:        "RESERVA",
};

// ── Tipos de café ─────────────────────────────────────────────
var TIPOS_CAFE = [
  "CAFÉ PERGAMINO SECO",
  "CAFÉ PERGAMINO HÚMEDO",
  "CAFÉ EN BABA",
  "CAFÉ VERDE (EXCELSO)",
  "CAFÉ SUPREMO",
  "CAFÉ UGQ",
  "CAFÉ PASILLA",
  "CAFÉ ESPECIAL",
  "CAFÉ ORGÁNICO",
];

// ── Estructura de carpetas en Drive ───────────────────────────
var DRIVE_FOLDERS = {
  ROOT:        "SUCDEN_COLOMBIA_CAFE",
  RECEPCIONES: "01_RECEPCIONES",
  LOTES:       "02_LOTES",
  PRODUCCION:  "03_PRODUCCION",
  CALIDAD:     "04_CALIDAD",
  EMPAQUE:     "05_EMPAQUE",
  DESPACHOS:   "06_DESPACHOS",
  DOCUMENTOS:  "07_DOCUMENTOS",
  REPORTES:    "08_REPORTES",
};
