# Modelo de Datos — Sucden Colombia

## 1. Entidades Principales y Relaciones

El sistema almacena la información estructurada en **Google Sheets** utilizando identificadores únicos con formato secuencial:

- **LOTES**: `CAF-2026-000001`
- **RECEPCIONES**: `REC-2026-000001`
- **CALIDAD**: `CAL-2026-000001`
- **PRODUCCION**: `PRO-2026-000001`
- **EMPAQUES**: `EMP-2026-000001`
- **DESPACHOS**: `DES-2026-000001`
- **DOCUMENTOS**: `DOC-2026-000001`

---

## 2. Diagrama Entidad-Relación (Conceptual)

```
[ PROVEEDOR ] 1 --- N [ PRODUCTOR ] 1 --- N [ FINCA ]
                                                |
                                                v
[ RECEPCION ] 1 --- 1 [ LOTE ] 1 --- N [ CALIDAD ]
                        |
                        +--- N [ PRODUCCION_LOTES ] N --- 1 [ PRODUCCION ]
                        |                                       |
                        |                                       v
                        +--- N [ EMPAQUES ]             [ MAQUINAS / OPERARIOS / TURNOS ]
                        |
                        +--- N [ DESPACHO_LOTES ] N --- 1 [ DESPACHOS ]
                        |
                        +--- N [ MOVIMIENTOS_INVENTARIO ]
                        |
                        +--- N [ DOCUMENTOS ]
```

---

## 3. Formato de Identificadores (Regla de Negocio)
Cada entidad tiene una secuencia protegida contra condiciones de carrera mediante `LockService`:
- El identificador incluye el prefijo funcional, el año en curso y un correlativo de 6 dígitos rellenado con ceros a la izquierda.
- **Jamás** se utiliza el número de fila física de la hoja de cálculo como identificador de entidad.
