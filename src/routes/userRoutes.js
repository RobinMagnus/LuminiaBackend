const express = require('express');
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');
const { validarQueryUsers } = require('../middlewares/validationMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', validarQueryUsers, userController.listarUsers);
router.get('/:id', userController.buscarUserPorId);

module.exports = router;
