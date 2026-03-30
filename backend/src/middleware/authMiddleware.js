const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Unauthorized.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    
    // Ensure only admin/registrar roles can access the system
    if (!['admin', 'registrar'].includes(payload.role)) {
      return res.status(403).json({ message: 'Forbidden: invalid role for this system.' });
    }
    
    req.user = payload;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient role.' });
    }
    return next();
  };
}

module.exports = {
  authenticate,
  allowRoles,
};
