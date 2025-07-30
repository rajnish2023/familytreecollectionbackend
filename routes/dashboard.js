const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');

router.get('/', auth, (req, res) => {
  res.json({ msg: `Welcome to the dashboard, ${req.user.role}` });
});

module.exports = router;
