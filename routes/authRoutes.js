const express = require('express');
const router = express.Router();
const { signup, login, joinFamily, getFamilyInfo, changePassword, changeEmail } = require('../controllers/authController');
const auth = require('../middleware/authMiddleware');

router.post('/signup', signup);
router.post('/login', login);
router.post('/join-family', joinFamily);
router.get('/family-info', auth, getFamilyInfo);
router.put('/change-password', auth, changePassword);
router.put('/change-email', auth, changeEmail);

module.exports = router;
