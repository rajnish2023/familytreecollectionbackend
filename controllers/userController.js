const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// @desc    Get all family members
// @route   GET /api/users/family-members
// @access  Admin only
exports.getFamilyMembers = async (req, res) => {
  try {
    const familyMembers = await User.find({ familyId: req.user.familyId })
      .select('name email role createdAt')
      .sort({ createdAt: 1 });

    res.json({
      success: true,
      data: familyMembers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching family members'
    });
  }
};

// @desc    Invite new family member
// @route   POST /api/users/invite
// @access  Admin only
exports.inviteFamilyMember = async (req, res) => {
  try {
    const { name, email, role = 'viewer' } = req.body;

    // Validate role
    if (!['admin', 'sub-admin', 'viewer'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be admin, sub-admin, or viewer'
      });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Create new user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      familyId: req.user.familyId,
      role
    });

    res.status(201).json({
      success: true,
      message: 'Family member invited successfully',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        tempPassword: tempPassword // Only for admin to share with invitee
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error inviting family member'
    });
  }
};

// @desc    Update user role
// @route   PUT /api/users/:id/role
// @access  Admin only
exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const userId = req.params.id;

    // Validate role
    if (!['admin', 'sub-admin', 'viewer'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be admin, sub-admin, or viewer'
      });
    }

    // Find user in same family
    const user = await User.findOne({
      _id: userId,
      familyId: req.user.familyId
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent admin from changing their own role
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change your own role'
      });
    }

    // Check if this would demote the last admin
    if (user.role === 'admin' && role !== 'admin') {
      const adminCount = await User.countDocuments({
        familyId: req.user.familyId,
        role: 'admin'
      });
      
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot demote the last admin. Please promote another user to admin first.'
        });
      }
    }

    // Update role
    user.role = role;
    await user.save();

    res.json({
      success: true,
      message: 'User role updated successfully',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating user role'
    });
  }
};

// @desc    Remove user from family
// @route   DELETE /api/users/:id
// @access  Admin only
exports.removeUserFromFamily = async (req, res) => {
  try {
    const userId = req.params.id;

    // Find user in same family
    const user = await User.findOne({
      _id: userId,
      familyId: req.user.familyId
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent admin from removing themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove yourself from family'
      });
    }

    // Check if this would remove the last admin
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({
        familyId: req.user.familyId,
        role: 'admin'
      });
      
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot remove the last admin. Please promote another user to admin first.'
        });
      }
    }

    // Actually delete the user from the database
    await User.deleteOne({ _id: userId, familyId: req.user.familyId });

    res.json({
      success: true,
      message: 'User removed from family successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error removing user from family'
    });
  }
}; 