const express = require('express');
const professorController = require('../controllers/professorController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', professorController.listarProfessores);
router.get('/:id', professorController.buscarProfessorPorId);
router.post('/', professorController.criarProfessor);
router.put('/:id', professorController.atualizarProfessor);
router.delete('/:id', professorController.removerProfessor);

module.exports = router;
