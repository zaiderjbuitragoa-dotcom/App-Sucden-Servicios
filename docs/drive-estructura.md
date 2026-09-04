# Estructura de Google Drive — Sucden Colombia

La aplicación organiza automáticamente los archivos y evidencias fotográficas en la siguiente jerarquía de carpetas dentro de Google Drive:

```text
SUCDEN_COLOMBIA_CAFE/
├── 01_RECEPCIONES/
│   └── (Fotografías de recepción, remisiones del proveedor)
├── 02_LOTES/
│   ├── CAF-2026-000001/
│   ├── CAF-2026-000002/
│   └── (Carpetas creadas automáticamente por cada ID de Lote)
├── 03_PRODUCCION/
│   └── (Evidencias de orden de trilla y controles de turno)
├── 04_CALIDAD/
│   └── (Certificados de laboratorio, fichas de cata)
├── 05_EMPAQUE/
│   └── (Fotos de marquillas, estibas y sacos empacados)
├── 06_DESPACHOS/
│   ├── DES-2026-000001/
│   ├── DES-2026-000002/
│   └── (Bill of Lading, fotos de contenedor, pesajes de salida)
├── 07_DOCUMENTOS/
│   └── (Documentación general del sistema)
└── 08_REPORTES/
    └── (Reportes exportados en PDF o XLSX)
```

---

## Estandarización de Nombres de Archivo

Los archivos guardados en Google Drive se renombran automáticamente siguiendo la convención:

```text
{ID_ENTIDAD}_{TIPO_DOCUMENTO}_{FECHA_AAAAMMDD}.{EXTENSION}
```

*Ejemplo*: `CAF-2026-000001_RECEPCION_20260903.jpg`
