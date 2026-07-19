const router = require('express').Router();
const controller = require('../controllers/academicoController');
const auth = require('../middlewares/authMiddleware');
const role = require('../middlewares/roleMiddleware');
const { validarEvento, validarQueryAcademica } = require('../middlewares/validationMiddleware');

router.use(auth);
router.get('/', validarQueryAcademica, controller.listarCronograma);
router.post('/', role('professor'), validarEvento, controller.criarEvento);
router.put('/:id', role('professor'), validarEvento, controller.atualizarEvento);
router.delete('/:id', role('professor'), controller.removerEvento);

module.exports = router;
