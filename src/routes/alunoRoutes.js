const express = require('express');
const alunoController = require('../controllers/alunoController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const { validarAluno, validarQueryAlunos } = require('../middlewares/validationMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', roleMiddleware('professor'), validarQueryAlunos, alunoController.listarAlunos);
router.get('/me', roleMiddleware('aluno'), alunoController.buscarMeuPerfil);
router.get('/:id', alunoController.buscarAlunoPorId);
router.post('/', roleMiddleware('professor'), validarAluno, alunoController.criarAluno);
router.put('/:id', validarAluno, alunoController.atualizarAluno);
router.delete('/:id', roleMiddleware('professor'), alunoController.removerAluno);

module.exports = router;
