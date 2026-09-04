# Especificación de Endpoints (API REST / JSON)

Todas las comunicaciones se realizan a la URL del Web App desplegado en Google Apps Script.

## Peticiones GET (`doGet`)

| `action` | Descripción | Parámetros adicionales | Requiere Auth |
| :--- | :--- | :--- | :--- |
| `health` | Estado del servidor y versión | N/A | No |
| `init` | Inicializa estructura de carpetas e Hojas | N/A | No |
| `dashboard` | KPIs, alertas y resúmenes ejecutivos | N/A | Sí |
| `listRecepciones` | Lista recepciones registradas | `filters` | Sí |
| `listLotes` | Lista maestro de lotes | `filters` | Sí |
| `trazabilidadLote` | Obtiene historial completo de un lote | `id` (ID Lote) | Sí |
| `listCalidad` | Lista análisis de calidad | `filters` | Sí |
| `listProduccion` | Lista órdenes de producción/trilla | `filters` | Sí |
| `inventario` | Obtiene existencias actuales por lote | `soloConStock` | Sí |
| `listMovimientos` | Kardex de inventario | `filters` | Sí |
| `listEmpaques` | Registros de empaque | `filters` | Sí |
| `listDespachos` | Órdenes de despacho/exportación | `filters` | Sí |
| `listDocumentos` | Lista de archivos guardados en Drive | `filters` | Sí |
| `auditoria` | Registros de auditoría de usuarios | `limit`, `fechaDesde` | Sí |

---

## Peticiones POST (`doPost`)

| `action` | Descripción | Payload Body (JSON) |
| :--- | :--- | :--- |
| `login` | Autenticación de usuario | `{ email, password }` |
| `createRecepcion` | Registro de recepción + creación automática de lote | `{ fecha, hora, idProveedor, tipoCafe, sacos, pesoBrutoKg, taraKg, ... }` |
| `createCalidad` | Registro de análisis físico y sensorial | `{ idLote, fecha, humedadPct, factor, resultado, responsable, ... }` |
| `startProduccion` | Inicia orden de trilla multi-lote | `{ fecha, horaInicio, idMaquina, idOperario, lotes: [{ idLote, kgEntrada }] }` |
| `finishProduccion` | Cierra orden de trilla y calcula rendimientos | `{ idProduccion, horaFin, kgExcelso, kgSubproducto, ... }` |
| `createEmpaque` | Empacado de café en sacos/presentaciones | `{ idLote, fecha, producto, presentacion, cantidadSacos, pesoUnitarioKg }` |
| `createDespacho` | Registro de orden de exportación | `{ fecha, cliente, paisDestino, lotes: [{ idLote, kg, sacos }] }` |
| `confirmDespacho` | Confirma despacho y efectúa salidas en kardex | `{ idDespacho }` |
| `uploadDocument` | Sube archivo a Google Drive (Base64) | `{ base64, fileName, mimeType, entityTipo, entityId, tipoDocumento }` |
| `ajusteInventario` | Registro de movimiento de ajuste | `{ idLote, kg, notas }` |
