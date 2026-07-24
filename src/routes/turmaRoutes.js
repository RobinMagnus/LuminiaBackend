const router = require('express').Router();
const controller = require('../controllers/catalogoAcademicoController');
const auth = require('../middlewares/authMiddleware');
const role = require('../middlewares/roleMiddleware');
const { validarTurma, validarQueryTurmas, validarQueryAlunos } = require('../middlewares/validationMiddleware');

router.use(auth);
router.get('/', validarQueryTurmas, controller.listarTurmas);
router.get('/:id/alunos', role('professor'), validarQueryAlunos, controller.listarAlunosDaTurma);
router.get('/:id', controller.buscarTurma);
router.post('/', role('professor'), validarTurma, controller.criarTurma);
router.put('/:id', role('professor'), validarTurma, controller.atualizarTurma);
router.delete('/:id', role('professor'), controller.removerTurma);

module.exports = router;
