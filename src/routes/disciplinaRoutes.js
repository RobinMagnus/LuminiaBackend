const router = require('express').Router();
const controller = require('../controllers/catalogoAcademicoController');
const auth = require('../middlewares/authMiddleware');
const role = require('../middlewares/roleMiddleware');
const { validarDisciplina, validarQueryDisciplinas } = require('../middlewares/validationMiddleware');

router.use(auth);
router.get('/', validarQueryDisciplinas, controller.listarDisciplinas);
router.get('/:id', controller.buscarDisciplina);
router.post('/', role('professor'), validarDisciplina, controller.criarDisciplina);
router.put('/:id', role('professor'), validarDisciplina, controller.atualizarDisciplina);
router.delete('/:id', role('professor'), controller.removerDisciplina);

module.exports = router;
