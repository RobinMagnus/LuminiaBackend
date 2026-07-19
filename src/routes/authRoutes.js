const express = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');
const { validarLogin, validarRegistro } = require('../middlewares/validationMiddleware');

const router = express.Router();

router.post('/register', validarRegistro, authController.register);
router.post('/login', validarLogin, authController.login);
router.get('/me', authMiddleware, authController.me);

module.exports = router;
