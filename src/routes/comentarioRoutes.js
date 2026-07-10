const express = require('express');
const comentarioController = require('../controllers/comentarioController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.put('/:id', comentarioController.atualizarComentario);
router.delete('/:id', comentarioController.removerComentario);

module.exports = router;
