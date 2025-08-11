const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Generate unique family ID
const generateFamilyId = () => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `FAM${timestamp}${randomStr}`.toUpperCase();
};

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// @desc    Register a new user
// @route   POST /api/auth/signup
// @access  Public
exports.signup = async (req, res) => {
  try {
    const { name, email, password, role, familyId } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    let assignedRole = 'admin';
    let assignedFamilyId = familyId;

    if (familyId) {
      // If familyId is provided, user is being invited to an existing family
      // Only allow sub-admin or viewer roles
      if (role === 'admin') {
        return res.status(400).json({ message: 'Cannot invite another admin to an existing family.' });
      }
      assignedRole = ['sub-admin', 'viewer'].includes(role) ? role : 'viewer';
      // Validate family exists
      const familyExists = await User.findOne({ familyId });
      if (!familyExists) {
        return res.status(400).json({ message: 'Invalid family ID' });
      }
    } else {
      // If no familyId, this is a new family, user is admin
      assignedFamilyId = generateFamilyId();
      assignedRole = 'admin';
    }

    // Create new user
    const user = await User.create({
      name,
      email,
      password,
      familyId: assignedFamilyId,
      role: assignedRole
    });

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      familyId: user.familyId,
      role: user.role,
      token
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      familyId: user.familyId,
      role: user.role,
      token
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Join existing family
// @route   POST /api/auth/join-family
// @access  Public
exports.joinFamily = async (req, res) => {
  try {
    const { name, email, password, familyId, role } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Check if family exists
    const familyExists = await User.findOne({ familyId });
    if (!familyExists) {
      return res.status(400).json({ message: 'Invalid family ID' });
    }

    // Only allow sub-admin or viewer roles
    const assignedRole = ['sub-admin', 'viewer'].includes(role) ? role : 'viewer';

    // Create new user with existing family ID and role
    const user = await User.create({
      name,
      email,
      password,
      familyId,
      role: assignedRole
    });

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      familyId: user.familyId,
      role: user.role,
      token
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get family info
// @route   GET /api/auth/family-info
// @access  Private
exports.getFamilyInfo = async (req, res) => {
  try {
    const familyMembers = await User.find({ familyId: req.user.familyId })
      .select('name email createdAt')
      .sort({ createdAt: 1 });

    res.json({
      familyId: req.user.familyId,
      members: familyMembers
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user._id;
    const { previousPassword, newPassword, confirmPassword } = req.body;
    if (!previousPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'All password fields are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters.' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'New password and confirm password do not match.' });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const isMatch = await user.comparePassword(previousPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Previous password is incorrect.' });
    }
    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Error updating password' });
  }
};

// @desc    Change email
// @route   PUT /api/auth/change-email
// @access  Private
exports.changeEmail = async (req, res) => {
  try {
    const Person = require('../models/person');

    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const userId = req.user._id;
    const oldEmail = req.user.email?.trim().toLowerCase();
    const email = req.body.email?.trim().toLowerCase();

    // Validate email
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ message: 'Invalid email address.' });
    }

    // Check if email already exists for another user
    const existing = await User.findOne({ email });
    if (existing && existing._id.toString() !== userId.toString()) {
      return res.status(400).json({ message: 'Email already in use.' });
    }

    // Update in User collection
    const user = await User.findOne({ _id: userId, familyId: req.user.familyId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    user.email = email;
    await user.save();

    // Update in Person collection
    const person = await Person.findOne({ email: oldEmail, familyId: req.user.familyId });
    if (person) {
      person.email = email;
      await person.save();
    }

    res.json({ message: 'Email updated successfully' });

  } catch (error) {
    console.error('Error updating email:', error);
    res.status(500).json({ message: error.message || 'Error updating email' });
  }
};

