const User = require('../models/User');

// Check if user has required role
const hasRole = (requiredRoles) => {
  return async (req, res, next) => {
    try {
      // Ensure user object exists (from auth middleware)
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // Check if user has required role
      if (!requiredRoles.includes(req.user.role)) {
        return res.status(403).json({ 
          message: `Access denied. Required roles: ${requiredRoles.join(', ')}` 
        });
      }

      next();
    } catch (error) {
      res.status(500).json({ message: 'Role verification failed' });
    }
  };
};

// Role-specific middleware functions
const requireAdmin = hasRole(['admin']);
const requireSubAdmin = hasRole(['admin', 'sub-admin']);
const requireViewer = hasRole(['admin', 'sub-admin', 'viewer']);

// Check if user can edit (admin or sub-admin)
const canEdit = hasRole(['admin', 'sub-admin']);

// Check if user can manage users (admin only)
const canManageUsers = hasRole(['admin']);

module.exports = {
  hasRole,
  requireAdmin,
  requireSubAdmin,
  requireViewer,
  canEdit,
  canManageUsers
}; 