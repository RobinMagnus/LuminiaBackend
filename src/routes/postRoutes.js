const express = require('express');
const postController = require('../controllers/postController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', postController.listarPosts);
router.get('/:id', postController.buscarPostPorId);
router.post('/', roleMiddleware('professor'), postController.criarPost);
router.put('/:id', roleMiddleware('professor'), postController.atualizarPost);
router.delete('/:id', roleMiddleware('professor'), postController.removerPost);

module.exports = router;
