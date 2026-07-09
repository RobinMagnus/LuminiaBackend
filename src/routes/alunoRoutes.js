const express = require('express');
const alunoController = require('../controllers/alunoController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', alunoController.listarAlunos);
router.get('/:id', alunoController.buscarAlunoPorId);
router.post('/', alunoController.criarAluno);
router.put('/:id', alunoController.atualizarAluno);
router.delete('/:id', alunoController.removerAluno);

module.exports = router;
