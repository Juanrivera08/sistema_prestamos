import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token de acceso requerido' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Token inválido o expirado' });
    }
    req.user = user;
    next();
  });
};

export const requireAdmin = (req, res, next) => {
  if (req.user.rol !== 'administrador') {
    return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de administrador' });
  }
  next();
};

export const requireAdminOrTrabajador = (req, res, next) => {
  if (req.user.rol !== 'administrador' && req.user.rol !== 'trabajador') {
    return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de administrador o trabajador' });
  }
  next();
};

