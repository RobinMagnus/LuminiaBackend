const Professor = require('../models/Professor');

async function listarProfessores(req, res) {
  try {
    const professores = await Professor.find().populate('userId', 'nome email role ativo').sort({ createdAt: -1 });
    return res.json(professores);
  } catch (error) {
    return res.status(500).json({ mensagem: 'Erro ao listar professores.' });
  }
}

async function buscarProfessorPorId(req, res) {
  try {
    const professor = await Professor.findById(req.params.id).populate('userId', 'nome email role ativo');

    if (!professor) {
      return res.status(404).json({ mensagem: 'Professor não encontrado.' });
    }

    return res.json(professor);
  } catch (error) {
    return res.status(400).json({ mensagem: 'ID de professor inválido.' });
  }
}

async function criarProfessor(req, res) {
  try {
    const professor = await Professor.create(req.body);
    return res.status(201).json({
      mensagem: 'Professor cadastrado com sucesso.',
      professor
    });
  } catch (error) {
    return res.status(400).json({ mensagem: 'Erro ao cadastrar professor.', erro: error.message });
  }
}

async function atualizarProfessor(req, res) {
  try {
    const professor = await Professor.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!professor) {
      return res.status(404).json({ mensagem: 'Professor não encontrado.' });
    }

    return res.json({
      mensagem: 'Professor atualizado com sucesso.',
      professor
    });
  } catch (error) {
    return res.status(400).json({ mensagem: 'Erro ao atualizar professor.', erro: error.message });
  }
}

async function removerProfessor(req, res) {
  try {
    const professor = await Professor.findByIdAndDelete(req.params.id);

    if (!professor) {
      return res.status(404).json({ mensagem: 'Professor não encontrado.' });
    }

    return res.json({ mensagem: 'Professor removido com sucesso.' });
  } catch (error) {
    return res.status(400).json({ mensagem: 'Erro ao remover professor.', erro: error.message });
  }
}

module.exports = {
  listarProfessores,
  buscarProfessorPorId,
  criarProfessor,
  atualizarProfessor,
  removerProfessor
};
