const express = require('express');
const postController = require('../controllers/postController');
const comentarioController = require('../controllers/comentarioController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', postController.listarPosts);
router.get('/:postId/comentarios', comentarioController.listarComentarios);
router.post('/:postId/comentarios', comentarioController.criarComentario);
router.get('/:id', postController.buscarPostPorId);
router.post('/', roleMiddleware('professor'), postController.criarPost);
router.put('/:id', roleMiddleware('professor'), postController.atualizarPost);
router.delete('/:id', roleMiddleware('professor'), postController.removerPost);

module.exports = router;
