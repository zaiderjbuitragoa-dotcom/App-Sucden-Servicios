# Sucden Colombia — Sistema de Gestión y Trazabilidad para Exportadora de Café

Aplicación web empresarial responsiva para el control y trazabilidad integral del café, desde la recepción del lote hasta su producción, almacenamiento, empaque y despacho/exportación.

---

## ☕ Arquitectura del Sistema

- **Frontend**: Aplicación Web SPA alojada y versionada en GitHub / GitHub Pages (HTML5, CSS Vanilla Design System, JS ES6+).
- **Backend**: API REST/JSON en Google Apps Script Web App.
- **Base de Datos**: Google Sheets (22 pestañas relacionales normalizadas).
- **Archivos y Fotos**: Google Drive (Estructura de carpetas `SUCDEN_COLOMBIA_CAFE/`).

---

## 📦 Estructura del Proyecto

```text
exportadora-cafe/
├── frontend/
│   ├── index.html                   # Pantalla de Login
│   ├── app.html                     # Shell principal de la SPA
│   └── src/
│       ├── styles/                  # CSS Design System
│       ├── services/                # API client HTTP y autenticación
│       ├── utils/                   # Formateadores y validaciones
│       ├── components/              # SPA Router, Sidebar y UI DataTables/Modales
│       └── pages/                   # Módulos del sistema (Dashboard, Recepción, Lotes, etc.)
├── backend/
│   └── apps-script/                 # 14 Servicios Google Apps Script (.gs)
├── docs/                            # Documentación técnica completa
├── tests/                           # Pruebas de integración
├── assets/                          # Imágenes y recursos estáticos
├── .gitignore
└── README.md
```

---

## 🚀 Instalación y Despliegue

Consulte la guía paso a paso en [docs/despliegue.md](docs/despliegue.md).

### Credenciales por Defecto para Inicio (Primer Despliegue):
- **Usuario**: `admin@sucden.com.co`
- **Contraseña**: `Admin2026!`

---

## 📋 Módulos Implementados

1. **Dashboard Ejecutivo**: KPIs en tiempo real, gráficos de producción por máquina/turno, alertas de lotes bloqueados.
2. **Recepción de Café**: Formularios con cálculo de peso neto, validaciones de tara/humedad y carga de fotos.
3. **Maestro de Lotes**: Trazabilidad con línea de tiempo interactiva.
4. **Control de Calidad**: Análisis físico y sensorial (catación SCA), estados con bloqueo automático.
5. **Producción y Trilla**: Ordenes de producción multi-lote, métricas de rendimiento, productividad (kg/h) y merma.
6. **Inventario & Bodegas**: Kardex de movimientos (entradas, salidas, ajustes, reservas) con validación de saldo no negativo.
7. **Empaque**: Presentaciones (Sacos 70kg, 60kg, GrainPro, BigBag) y trazabilidad por pallet.
8. **Despachos & Exportación**: Contenedores, Booking, BL, asignación de lotes y salidas de inventario.
9. **Documentos & Fotos**: Repositorio vinculado a Google Drive.
10. **Novedades & Incidencias**: Registro y seguimiento de excepciones operativas.
11. **Reportes & Exportación**: Generación de reportes ejecutivos y exportación CSV.
12. **Administración & Auditoría**: Gestión de usuarios, roles y log de auditoría.

---

## 🔒 Seguridad e Integridad de Datos
- **LockService**: Protección contra concurrencia en la generación de IDs únicos (ej: `CAF-2026-000001`).
- **Control RBAC**: Matriz de permisos estricta enforced en backend.
- **Auditoría**: Registro de fecha, hora, usuario, módulo y acción en la hoja `AUDITORIA`.

---

© 2026 **Sucden Colombia S.A.S.** — Todos los derechos reservados.
