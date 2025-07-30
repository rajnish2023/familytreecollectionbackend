const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  // console.log('Authorization Header:', authHeader);
  if (!authHeader) return res.status(401).json({ msg: 'No token, auth denied' });

  // Assume the Authorization header is the raw token (no Bearer prefix)
  const token = authHeader;
  // console.log('Extracted Token:', token);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // console.log('Decoded Token:', decoded);
    
    // Fetch complete user object including family ID
    const user = await User.findById(decoded.id).select('-password');
    // console.log('User:', user);
    if (!user) {
      return res.status(401).json({ msg: 'User not found' });
    }
    
    req.user = user;
    next();
  } catch (err) {
    console.error('Token Verification Error:', err.message);
    res.status(400).json({ msg: 'Token not valid' });
  }
};

module.exports = auth;