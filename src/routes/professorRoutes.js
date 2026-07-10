const express = require('express');
const professorController = require('../controllers/professorController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', professorController.listarProfessores);
router.get('/:id', professorController.buscarProfessorPorId);
router.post('/', roleMiddleware('professor'), professorController.criarProfessor);
router.put('/:id', roleMiddleware('professor'), professorController.atualizarProfessor);
router.delete('/:id', roleMiddleware('professor'), professorController.removerProfessor);

module.exports = router;
