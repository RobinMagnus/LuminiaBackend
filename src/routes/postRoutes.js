const express = require('express');
const postController = require('../controllers/postController');
const comentarioController = require('../controllers/comentarioController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const {
  validarComentario,
  validarPost,
  validarQueryComentarios,
  validarQueryPosts
} = require('../middlewares/validationMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', validarQueryPosts, postController.listarPosts);
router.get('/:postId/comentarios', validarQueryComentarios, comentarioController.listarComentarios);
router.post('/:postId/comentarios', validarComentario, comentarioController.criarComentario);
router.get('/:id', postController.buscarPostPorId);
router.post('/', roleMiddleware('professor'), validarPost, postController.criarPost);
router.put('/:id', roleMiddleware('professor'), validarPost, postController.atualizarPost);
router.delete('/:id', roleMiddleware('professor'), postController.removerPost);

module.exports = router;
