function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  return next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.session.user || req.session.user.role !== role) {
      return res.status(403).json({ message: "You do not have access to this resource" });
    }
    return next();
  };
}

module.exports = { requireAuth, requireRole };
