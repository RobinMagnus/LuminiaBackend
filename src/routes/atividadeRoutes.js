const router = require('express').Router();
const controller = require('../controllers/academicoController');
const auth = require('../middlewares/authMiddleware');
const role = require('../middlewares/roleMiddleware');
const { validarAtividade, validarEntrega, validarQueryAcademica } = require('../middlewares/validationMiddleware');

router.use(auth);
router.get('/', validarQueryAcademica, controller.listarAtividades);
router.get('/:atividadeId/entregas', role('professor'), validarQueryAcademica, controller.listarEntregas);
router.post('/:atividadeId/entregas', role('aluno'), validarEntrega, controller.criarEntrega);
router.get('/:id', controller.buscarAtividade);
router.post('/', role('professor'), validarAtividade, controller.criarAtividade);
router.put('/:id', role('professor'), validarAtividade, controller.atualizarAtividade);
router.delete('/:id', role('professor'), controller.removerAtividade);

module.exports = router;
