const express = require('express');
const comentarioController = require('../controllers/comentarioController');
const authMiddleware = require('../middlewares/authMiddleware');
const { validarComentario } = require('../middlewares/validationMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.put('/:id', validarComentario, comentarioController.atualizarComentario);
router.delete('/:id', comentarioController.removerComentario);

module.exports = router;
