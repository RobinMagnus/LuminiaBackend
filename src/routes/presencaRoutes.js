const router = require('express').Router();
const controller = require('../controllers/academicoController');
const auth = require('../middlewares/authMiddleware');
const role = require('../middlewares/roleMiddleware');
const { validarPresenca, validarQueryAcademica } = require('../middlewares/validationMiddleware');

router.use(auth);
router.get('/', validarQueryAcademica, controller.listarPresencas);
router.post('/', role('professor'), validarPresenca, controller.registrarPresenca);

module.exports = router;
