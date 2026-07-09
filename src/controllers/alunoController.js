const Aluno = require('../models/Aluno');

async function listarAlunos(req, res) {
  try {
    const alunos = await Aluno.find().populate('userId', 'nome email role ativo').sort({ createdAt: -1 });
    return res.json(alunos);
  } catch (error) {
    return res.status(500).json({ mensagem: 'Erro ao listar alunos.' });
  }
}

async function buscarAlunoPorId(req, res) {
  try {
    const aluno = await Aluno.findById(req.params.id).populate('userId', 'nome email role ativo');

    if (!aluno) {
      return res.status(404).json({ mensagem: 'Aluno não encontrado.' });
    }

    return res.json(aluno);
  } catch (error) {
    return res.status(400).json({ mensagem: 'ID de aluno inválido.' });
  }
}

async function criarAluno(req, res) {
  try {
    const aluno = await Aluno.create(req.body);
    return res.status(201).json({
      mensagem: 'Aluno cadastrado com sucesso.',
      aluno
    });
  } catch (error) {
    return res.status(400).json({ mensagem: 'Erro ao cadastrar aluno.', erro: error.message });
  }
}

async function atualizarAluno(req, res) {
  try {
    const aluno = await Aluno.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!aluno) {
      return res.status(404).json({ mensagem: 'Aluno não encontrado.' });
    }

    return res.json({
      mensagem: 'Aluno atualizado com sucesso.',
      aluno
    });
  } catch (error) {
    return res.status(400).json({ mensagem: 'Erro ao atualizar aluno.', erro: error.message });
  }
}

async function removerAluno(req, res) {
  try {
    const aluno = await Aluno.findByIdAndDelete(req.params.id);

    if (!aluno) {
      return res.status(404).json({ mensagem: 'Aluno não encontrado.' });
    }

    return res.json({ mensagem: 'Aluno removido com sucesso.' });
  } catch (error) {
    return res.status(400).json({ mensagem: 'Erro ao remover aluno.', erro: error.message });
  }
}

module.exports = {
  listarAlunos,
  buscarAlunoPorId,
  criarAluno,
  atualizarAluno,
  removerAluno
};
