# Guía de Despliegue y Configuración — Sucden Colombia

## Paso 1: Configurar Google Apps Script y Google Sheets

1. Ingrese a [Google Drive](https://drive.google.com).
2. Cree una nueva hoja de cálculo llamada: `Sucden Colombia — Base de Datos Trazabilidad`.
3. Vaya a **Extensiones → Apps Script**.
4. Copie y pegue todos los archivos `.gs` ubicados en el directorio `backend/apps-script/`:
   - `Config.gs`
   - `Utils.gs`
   - `SheetsRepository.gs`
   - `DriveService.gs`
   - `AuditService.gs`
   - `Auth.gs`
   - `ReceptionService.gs`
   - `QualityService.gs`
   - `ProductionService.gs`
   - `InventoryService.gs`
   - `DispatchService.gs`
   - `DashboardService.gs`
   - `ReportService.gs`
   - `Api.gs`
5. Guarde todos los archivos en Apps Script.

---

## Paso 2: Publicar Apps Script como Web App

1. En la parte superior derecha de Apps Script, haga clic en **Desplegar → Nueva implementación**.
2. Seleccione el tipo de implementación **Aplicación Web**.
3. Configure los siguientes parámetros:
   - **Descripción**: API Sucden Colombia v1.0.0
   - **Ejecutar como**: `Yo (tu correo electrónico)`
   - **Quién tiene acceso**: `Cualquier persona` (Anyone)
4. Haga clic en **Desplegar**.
5. Autorice los permisos requeridos (DriveApp y SpreadsheetApp).
6. Copie la **URL de la aplicación web** generada (ejemplo: `https://script.google.com/macros/s/AKfycb.../exec`).

---

## Paso 3: Inicializar la Base de Datos y Carpetas de Drive

Abra su navegador e ingrese a la siguiente URL sustituyendo el ID de su despliegue:

```text
https://script.google.com/macros/s/TU_DEPLOYMENT_ID/exec?action=init
```

Esto creará automáticamente:
- Las 22 Hojas con sus cabeceras en Google Sheets.
- El usuario inicial `admin@sucden.com.co` con contraseña `Admin2026!`.
- La estructura jerárquica de carpetas `SUCDEN_COLOMBIA_CAFE/` en Google Drive.

---

## Paso 4: Configuración y Despliegue en GitHub Pages

1. Suba el proyecto al repositorio en GitHub.
2. Abra la configuración del repositorio (**Settings → Pages**).
3. En **Build and deployment / Source**, seleccione `Deploy from a branch`.
4. Elija la rama `main` (o `master`) y la carpeta `/frontend` o `/` según su estructura.
5. Guarde los cambios. En unos momentos GitHub generará su enlace público (ejemplo: `https://usuario.github.io/exportadora-cafe/frontend/`).

---

## Paso 5: Conectar Frontend con el Backend

1. Ingrese a su aplicación web desplegada en GitHub Pages.
2. Inicie sesión con el usuario administrador por defecto (`admin@sucden.com.co` / `Admin2026!`).
3. En la barra superior, haga clic en el ícono de engranaje (⚙️).
4. Pegue la URL del Web App obtenida en el **Paso 2**.
5. Haga clic en **Guardar URL**. El sistema se recargará automáticamente y estará listo para operar.
