/**
 * Controlador de Autenticación
 * Separación de lógica de negocio de las rutas
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';
import { successResponse, errorResponse, validationError } from '../utils/responseHandler.js';
import { isValidEmail, isValidPassword } from '../utils/validators.js';

// Store para refresh tokens (en producción usar Redis)
const refreshTokenStore = new Map();

/**
 * Generar tokens de acceso y refresco
 */
export const generateTokens = (userId, email, rol) => {
  const accessToken = jwt.sign(
    { id: userId, email, rol },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const refreshToken = jwt.sign(
    { id: userId, email, rol, type: 'refresh' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  // Guardar refresh token
  if (!refreshTokenStore.has(userId)) {
    refreshTokenStore.set(userId, []);
  }
  refreshTokenStore.get(userId).push({
    token: refreshToken,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
  });

  return { accessToken, refreshToken };
};

/**
 * Registrar nuevo usuario
 */
export const register = async (req, res) => {
  try {
    const { codigo, nombre_completo, email, password, rol } = req.body;

    // Validación
    const errors = {};
    if (!codigo) errors.codigo = 'Código requerido';
    if (!nombre_completo) errors.nombre_completo = 'Nombre completo requerido';
    if (!email) errors.email = 'Email requerido';
    if (!password) errors.password = 'Contraseña requerida';

    if (Object.keys(errors).length > 0) {
      return validationError(res, errors);
    }

    if (!isValidEmail(email)) {
      return validationError(res, { email: 'El formato del email no es válido' });
    }

    if (!isValidPassword(password)) {
      return validationError(res, { password: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const [existingUser] = await pool.query(
      'SELECT id FROM usuarios WHERE email = ? OR codigo = ?',
      [email, codigo]
    );

    if (existingUser.length > 0) {
      return validationError(res, {
        email: 'El email ya está registrado',
        codigo: 'El código ya está registrado'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userRol = rol === 'administrador' ? 'usuario' : (rol || 'usuario');

    const [result] = await pool.query(
      `INSERT INTO usuarios (codigo, nombre_completo, email, password, rol) VALUES (?, ?, ?, ?, ?)`,
      [codigo, nombre_completo, email, hashedPassword, userRol]
    );

    const { accessToken, refreshToken } = generateTokens(result.insertId, email, userRol);

    return successResponse(res, {
      accessToken,
      refreshToken,
      user: {
        id: result.insertId,
        codigo,
        nombre_completo,
        email,
        rol: userRol
      }
    }, 'Usuario registrado exitosamente', 201);
  } catch (error) {
    console.error('Error en registro:', error);
    return errorResponse(res, error, 'Error al registrar usuario', 500);
  }
};

/**
 * Iniciar sesión
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const errors = {};
    if (!email) errors.email = 'Email requerido';
    if (!password) errors.password = 'Contraseña requerida';

    if (Object.keys(errors).length > 0) {
      return validationError(res, errors);
    }

    if (!isValidEmail(email)) {
      return validationError(res, { email: 'El formato del email no es válido' });
    }

    const [users] = await pool.query('SELECT * FROM usuarios WHERE email = ?', [email]);

    if (users.length === 0) {
      return errorResponse(res, null, 'Credenciales inválidas', 401);
    }

    const user = users[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return errorResponse(res, null, 'Credenciales inválidas', 401);
    }

    const { accessToken, refreshToken } = generateTokens(user.id, user.email, user.rol);

    return successResponse(res, {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        codigo: user.codigo,
        nombre_completo: user.nombre_completo,
        email: user.email,
        rol: user.rol
      }
    }, 'Login exitoso', 200);
  } catch (error) {
    console.error('Error en login:', error);
    return errorResponse(res, error, 'Error al iniciar sesión', 500);
  }
};

/**
 * Obtener usuario actual
 */
export const getCurrentUser = async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, codigo, nombre_completo, email, rol FROM usuarios WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return errorResponse(res, null, 'Usuario no encontrado', 404);
    }

    return successResponse(res, { user: users[0] }, 'Usuario obtenido', 200);
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    return errorResponse(res, error, 'Error al obtener información del usuario', 500);
  }
};

/**
 * Refrescar token
 */
export const refreshAccessToken = (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return errorResponse(res, null, 'Refresh token requerido', 400);
    }

    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

      if (decoded.type !== 'refresh') {
        return errorResponse(res, null, 'Token inválido', 401);
      }

      const userTokens = refreshTokenStore.get(decoded.id) || [];
      const tokenExists = userTokens.some(t => t.token === refreshToken && t.expiresAt > Date.now());

      if (!tokenExists) {
        return errorResponse(res, null, 'Token expirado o no encontrado', 401);
      }

      const newAccessToken = jwt.sign(
        { id: decoded.id, email: decoded.email, rol: decoded.rol },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      return successResponse(res, {
        accessToken: newAccessToken,
        refreshToken
      }, 'Token refrescado', 200);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return errorResponse(res, error, 'Refresh token expirado', 401);
      }
      return errorResponse(res, error, 'Token inválido', 401);
    }
  } catch (error) {
    return errorResponse(res, error, 'Error al refrescar token', 500);
  }
};

/**
 * Logout
 */
export const logout = async (req, res) => {
  try {
    if (refreshTokenStore.has(req.user.id)) {
      refreshTokenStore.delete(req.user.id);
    }
    return successResponse(res, {}, 'Logout exitoso', 200);
  } catch (error) {
    return errorResponse(res, error, 'Error al cerrar sesión', 500);
  }
};
