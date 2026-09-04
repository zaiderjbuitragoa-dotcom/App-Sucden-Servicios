# Matriz de Roles y Permisos — Sucden Colombia

El sistema incluye 8 roles de usuario para controlar el acceso a los módulos y las acciones disponibles:

| Módulo / Acción | ADMINISTRADOR | GERENCIA | RECEPCION | PRODUCCION | CALIDAD | BODEGA | DESPACHOS | CONSULTA |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Dashboard** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Recepción** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Maestro Lotes** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Control Calidad** | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| **Producción / Trilla**| ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| **Inventario** | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ |
| **Empaque** | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Despachos** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Documentos** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Novedades** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Reportes** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Administración** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Auditoría** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## Restricciones Críticas Enforced en Backend
1. **Lote Rechazado / Bloqueado**: Ningún lote con dictamen `RECHAZADO` o `BLOQUEADO` puede ser seleccionado para iniciar una orden de producción o para ser incluido en un despacho de exportación.
2. **Saldo Negativo**: El backend (`InventoryService.gs`) no permite generar despachos o consumos que dejen un saldo de inventario menor a 0 kg.
3. **Producción Incompleta**: No se puede marcar una orden como `FINALIZADA` sin haber registrado previamente la hora de inicio y kg de entrada en estado `EN_PROCESO`.
