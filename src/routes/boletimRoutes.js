const router = require('express').Router();
const controller = require('../controllers/academicoController');
const auth = require('../middlewares/authMiddleware');
const role = require('../middlewares/roleMiddleware');
const { validarBoletim } = require('../middlewares/validationMiddleware');

router.use(auth);
router.get('/me', role('aluno'), controller.buscarBoletim);
router.get('/alunos/:alunoId', role('professor'), controller.buscarBoletim);
router.post('/alunos/:alunoId/notas', role('professor'), validarBoletim, controller.adicionarNota);

module.exports = router;
