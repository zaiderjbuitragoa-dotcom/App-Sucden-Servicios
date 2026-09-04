# Arquitectura del Sistema — Sucden Colombia

## 1. Resumen Arquitectónico

El sistema de gestión y trazabilidad de café para **Sucden Colombia S.A.S.** está diseñado bajo una arquitectura serverless desacoplada de tres capas:

```
[ Frontend: GitHub Pages ]  <--- HTTP JSON (CORS) --->  [ Backend: Google Apps Script Web App ]
         (HTML5/CSS/JS)                                             (Google Apps Script Engine)
                                                                       |               |
                                                                       v               v
                                                             [ Google Sheets ]  [ Google Drive ]
                                                             (Base de Datos)    (Archivos/Fotos)
```

### Componentes Clave:
1. **Frontend**: Aplicación web SPA (Single Page Application) responsiva alojada en GitHub Pages. Desarrollada en HTML5, CSS3 vanilla (Design System a medida) y JavaScript (ES6+ Módulos sin frameworks pesados).
2. **Backend**: API REST/JSON ejecutada en Google Apps Script Web App (`doGet` / `doPost`). Maneja la lógica de negocio, reglas de validación, concurrencia (LockService) y auditoría.
3. **Persistencia Estructurada**: Google Sheets actúa como fuente de datos relacional (22 hojas maestras con IDs normalizados y llaves foráneas).
4. **Almacenamiento Documental**: Google Drive actúa como repositorio fotográfico y documental jerárquico (`SUCDEN_COLOMBIA_CAFE/`).

---

## 2. Flujo de Datos Operativo

```
RECEPCIÓN → CREACIÓN/ASIGNACIÓN DE LOTE → CONTROL DE CALIDAD → ALMACENAMIENTO → 
ORDEN DE PRODUCCIÓN → TRILLA → CLASIFICACIÓN → PRODUCTO TERMINADO → EMPAQUE → 
INVENTARIO → PREPARACIÓN DE DESPACHO → VALIDACIÓN → DESPACHO → AUDITORÍA.
```

---

## 3. Seguridad y Permisos
- **Autenticación**: Basada en tokens con firma de integridad HMAC (simulado vía SHA-256 en Apps Script).
- **Contraseñas**: Almacenadas con Hashing SHA-256 + Salt.
- **Control de Acceso (RBAC)**: 8 roles empresariales con matrices de permisos estrictas enforced en backend.
