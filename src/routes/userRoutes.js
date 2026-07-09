const express = require('express');
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', userController.listarUsers);
router.get('/:id', userController.buscarUserPorId);

module.exports = router;
