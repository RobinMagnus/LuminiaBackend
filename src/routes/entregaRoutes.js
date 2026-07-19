const router = require('express').Router();
const controller = require('../controllers/academicoController');
const auth = require('../middlewares/authMiddleware');
const role = require('../middlewares/roleMiddleware');
const { validarCorrecao, validarQueryAcademica } = require('../middlewares/validationMiddleware');

router.use(auth);
router.get('/me', role('aluno'), validarQueryAcademica, controller.listarEntregas);
router.get('/:entregaId/correcao', controller.buscarCorrecao);
router.put('/:entregaId/correcao', role('professor'), validarCorrecao, controller.corrigirEntrega);

module.exports = router;
