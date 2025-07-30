const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/authMiddleware');
const { canManageUsers } = require('../middleware/rbacMiddleware');

// Get all family members (admin only)
router.get('/family-members', auth, canManageUsers, userController.getFamilyMembers);

// Invite new family member (admin only)
router.post('/invite', auth, canManageUsers, userController.inviteFamilyMember);

// Update user role (admin only)
router.put('/:id/role', auth, canManageUsers, userController.updateUserRole);

// Remove user from family (admin only)
router.delete('/:id', auth, canManageUsers, userController.removeUserFromFamily);

module.exports = router; 