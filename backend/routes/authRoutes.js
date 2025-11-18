import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { isValidEmail, isValidPassword } from '../utils/validators.js';

const router = express.Router();

// Registro
router.post('/register', async (req, res) => {
  try {
    const { codigo, nombre_completo, email, password, rol } = req.body;

    if (!codigo || !nombre_completo || !email || !password) {
      return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }

    // Validar formato de email
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'El formato del email no es válido' });
    }

    // Validar contraseña
    if (!isValidPassword(password)) {
      return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
    }

    // Verificar si el email ya existe
    const [existingUser] = await pool.query(
      'SELECT id FROM usuarios WHERE email = ? OR codigo = ?',
      [email, codigo]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({ message: 'El email o código ya está registrado' });
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insertar usuario (solo admin puede crear otros admins)
    const userRol = rol === 'administrador' ? 'usuario' : (rol || 'usuario');

    const [result] = await pool.query(
      `INSERT INTO usuarios (codigo, nombre_completo, email, password, rol) 
       VALUES (?, ?, ?, ?, ?)`,
      [codigo, nombre_completo, email, hashedPassword, userRol]
    );

    const token = jwt.sign(
      { id: result.insertId, email, rol: userRol },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      token,
      user: {
        id: result.insertId,
        codigo,
        nombre_completo,
        email,
        rol: userRol
      }
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ message: 'Error al registrar usuario' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email y contraseña son requeridos' });
    }

    // Validar formato de email
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'El formato del email no es válido' });
    }

    const [users] = await pool.query(
      'SELECT * FROM usuarios WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const user = users[0];
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, rol: user.rol },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login exitoso',
      token,
      user: {
        id: user.id,
        codigo: user.codigo,
        nombre_completo: user.nombre_completo,
        email: user.email,
        rol: user.rol
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ message: 'Error al iniciar sesión' });
  }
});

// Obtener usuario actual
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, codigo, nombre_completo, email, rol FROM usuarios WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json({ user: users[0] });
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({ message: 'Error al obtener información del usuario' });
  }
});

export default router;

