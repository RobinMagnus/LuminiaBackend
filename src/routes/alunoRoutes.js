const express = require('express');
const alunoController = require('../controllers/alunoController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', roleMiddleware('professor'), alunoController.listarAlunos);
router.get('/:id', alunoController.buscarAlunoPorId);
router.post('/', roleMiddleware('professor'), alunoController.criarAluno);
router.put('/:id', alunoController.atualizarAluno);
router.delete('/:id', roleMiddleware('professor'), alunoController.removerAluno);

module.exports = router;
