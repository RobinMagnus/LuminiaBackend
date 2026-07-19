const express = require('express');
const professorController = require('../controllers/professorController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const { validarProfessor, validarQueryProfessores } = require('../middlewares/validationMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', validarQueryProfessores, professorController.listarProfessores);
router.get('/me', roleMiddleware('professor'), professorController.buscarMeuPerfil);
router.get('/:id', professorController.buscarProfessorPorId);
router.post('/', roleMiddleware('professor'), validarProfessor, professorController.criarProfessor);
router.put('/:id', roleMiddleware('professor'), validarProfessor, professorController.atualizarProfessor);
router.delete('/:id', roleMiddleware('professor'), professorController.removerProfessor);

module.exports = router;
