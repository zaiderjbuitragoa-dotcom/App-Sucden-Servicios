// ============================================================
// Auth.gs — Sucden Colombia · Trazabilidad Café
// Autenticación y gestión de sesiones
// ============================================================

/**
 * Autentica un usuario por email y contraseña.
 * Retorna token de sesión si las credenciales son válidas.
 */
function authLogin(email, password) {
  required(email, "email");
  required(password, "contraseña");

  var usuarios = repoGetAll(SHEETS.USUARIOS);
  var user = usuarios.find(function(u) {
    return String(u.EMAIL).toLowerCase() === String(email).toLowerCase();
  });

  if (!user) throw new Error("Credenciales incorrectas.");
  if (user.ESTADO !== "ACTIVO") throw new Error("Usuario inactivo o bloqueado.");

  var hash = hashPassword(password, "SucdenCafe2026");
  if (hash !== user.PASSWORD_HASH) throw new Error("Credenciales incorrectas.");

  // Actualizar último login
  repoUpdate(SHEETS.USUARIOS, user.ID_USUARIO, {
    ULTIMO_LOGIN: timestamp(),
    UPDATED_AT:  timestamp(),
  });

  var token = generateToken(user.ID_USUARIO, user.EMAIL, user.ROL);

  auditLog("LOGIN", "AUTH", user.ID_USUARIO, "OK", "Login exitoso", user.EMAIL, user.ROL);

  return {
    token: token,
    usuario: {
      id:     user.ID_USUARIO,
      nombre: user.NOMBRE,
      email:  user.EMAIL,
      rol:    user.ROL,
    }
  };
}

/**
 * Valida un token y retorna el payload del usuario
 */
function authValidate(token) {
  return verifyToken(token);
}

/**
 * Extrae y valida el usuario de la request
 * Lanza error si el token es inválido o el rol no tiene permiso
 */
function requireAuth(params, requiredPermission) {
  var token = params.token || params._token;
  if (!token) throw new Error("Autenticación requerida.");
  var payload = verifyToken(token);

  // Verificar permiso si se especificó
  if (requiredPermission) {
    var perms = PERMISOS[payload.rol] || [];
    if (perms.indexOf("*") === -1 && perms.indexOf(requiredPermission) === -1) {
      throw new Error("No tiene permiso para realizar esta acción.");
    }
  }
  return payload;
}

/**
 * Crea un nuevo usuario
 */
function createUser(params, createdBy) {
  required(params.nombre, "nombre");
  required(params.email, "email");
  required(params.password, "contraseña");
  required(params.rol, "rol");

  // Validar que el rol exista
  if (!Object.values(ROLES).includes(params.rol)) {
    throw new Error("Rol no válido: " + params.rol);
  }

  // Verificar email único
  var existing = repoSearch(SHEETS.USUARIOS, { EMAIL: params.email });
  if (existing.length > 0) throw new Error("Ya existe un usuario con ese email.");

  var id = repoNextId(SHEETS.USUARIOS, "USR");
  var now = timestamp();
  var user = {
    ID_USUARIO:    id,
    NOMBRE:        params.nombre,
    EMAIL:         params.email.toLowerCase(),
    ROL:           params.rol,
    ESTADO:        "ACTIVO",
    PASSWORD_HASH: hashPassword(params.password, "SucdenCafe2026"),
    ULTIMO_LOGIN:  "",
    CREATED_AT:    now,
    CREATED_BY:    createdBy || "SISTEMA",
  };
  repoCreate(SHEETS.USUARIOS, user);
  auditLog("CREATE_USUARIO", "USUARIOS", id, "OK", "Usuario creado: " + params.email, createdBy, "");
  return { id: id, email: params.email, rol: params.rol };
}

/**
 * Cambia contraseña de un usuario
 */
function changePassword(userId, oldPassword, newPassword, requestingUser) {
  var user = repoGetById(SHEETS.USUARIOS, userId, "ID_USUARIO");
  if (!user) throw new Error("Usuario no encontrado.");
  var oldHash = hashPassword(oldPassword, "SucdenCafe2026");
  if (oldHash !== user.PASSWORD_HASH) throw new Error("Contraseña actual incorrecta.");
  repoUpdate(SHEETS.USUARIOS, userId, {
    PASSWORD_HASH: hashPassword(newPassword, "SucdenCafe2026"),
    UPDATED_AT:    timestamp(),
    UPDATED_BY:    requestingUser,
  });
  auditLog("CAMBIO_PASSWORD", "USUARIOS", userId, "OK", "Contraseña actualizada", requestingUser, "");
  return true;
}

/**
 * Lista usuarios (sin exponer el hash de contraseña)
 */
function listUsers() {
  var all = repoGetAll(SHEETS.USUARIOS);
  return all.map(function(u) {
    return {
      ID_USUARIO:   u.ID_USUARIO,
      NOMBRE:       u.NOMBRE,
      EMAIL:        u.EMAIL,
      ROL:          u.ROL,
      ESTADO:       u.ESTADO,
      ULTIMO_LOGIN: u.ULTIMO_LOGIN,
      CREATED_AT:   u.CREATED_AT,
    };
  });
}

/**
 * Registro público de nuevos usuarios
 */
function registerUser(params) {
  required(params.nombre, "nombre");
  required(params.email, "email");
  required(params.password, "contraseña");

  var rol = params.rol || ROLES.CONSULTA;

  // Verificar email único
  var existing = repoSearch(SHEETS.USUARIOS, { EMAIL: params.email.toLowerCase() });
  if (existing.length > 0) throw new Error("Ya existe un usuario con el correo: " + params.email);

  var id = repoNextId(SHEETS.USUARIOS, "USR");
  var now = timestamp();
  var user = {
    ID_USUARIO:    id,
    NOMBRE:        params.nombre,
    EMAIL:         params.email.toLowerCase(),
    ROL:           rol,
    ESTADO:        "ACTIVO",
    PASSWORD_HASH: hashPassword(params.password, "SucdenCafe2026"),
    ULTIMO_LOGIN:  "",
    CREATED_AT:    now,
    CREATED_BY:    "AUTOREGISTRO",
  };
  repoCreate(SHEETS.USUARIOS, user);
  auditLog("REGISTER_USUARIO", "USUARIOS", id, "OK", "Usuario autoregistrado: " + params.email, "AUTOREGISTRO", rol);
  return { id: id, email: params.email, nombre: params.nombre, rol: rol };
}
