const Aluno = require('../models/Aluno');
const User = require('../models/User');

function isPerfilDoUsuario(perfil, user) {
  const userId = perfil.userId?._id || perfil.userId;
  return userId.toString() === user._id.toString();
}

function filtrarDadosPermitidosParaAluno(body) {
  const dadosPermitidos = {};

  if (Object.prototype.hasOwnProperty.call(body, 'nome')) {
    dadosPermitidos.nome = body.nome;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'dataNascimento')) {
    dadosPermitidos.dataNascimento = body.dataNascimento;
  }

  return dadosPermitidos;
}

async function listarAlunos(req, res) {
  try {
    const alunos = await Aluno.find().populate('userId', 'nome email role ativo').sort({ createdAt: -1 });
    return res.json(alunos);
  } catch (error) {
    return res.status(500).json({ mensagem: 'Erro ao listar alunos.' });
  }
}

async function buscarMeuPerfil(req, res) {
  try {
    const aluno = await Aluno.findOne({ userId: req.user._id }).populate('userId', 'nome email role ativo');

    if (!aluno) {
      return res.status(404).json({ mensagem: 'Perfil de aluno não encontrado.' });
    }

    return res.json(aluno);
  } catch (error) {
    return res.status(500).json({ mensagem: 'Erro ao buscar perfil de aluno.' });
  }
}

async function buscarAlunoPorId(req, res) {
  try {
    const aluno = await Aluno.findById(req.params.id).populate('userId', 'nome email role ativo');

    if (!aluno) {
      return res.status(404).json({ mensagem: 'Aluno não encontrado.' });
    }

    if (req.user.role === 'aluno' && !isPerfilDoUsuario(aluno, req.user)) {
      return res.status(403).json({ mensagem: 'Você não possui permissão para acessar este perfil.' });
    }

    return res.json(aluno);
  } catch (error) {
    return res.status(400).json({ mensagem: 'ID de aluno inválido.' });
  }
}

async function criarAluno(req, res) {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ mensagem: 'userId é obrigatório.' });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ mensagem: 'Usuário relacionado não encontrado.' });
    }

    if (user.role !== 'aluno') {
      return res.status(400).json({ mensagem: 'O usuário relacionado deve possuir role aluno.' });
    }

    const alunoExistente = await Aluno.findOne({ userId });

    if (alunoExistente) {
      return res.status(409).json({ mensagem: 'Este usuário já possui perfil de aluno.' });
    }

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
    const alunoAtual = await Aluno.findById(req.params.id);

    if (!alunoAtual) {
      return res.status(404).json({ mensagem: 'Aluno não encontrado.' });
    }

    const dadosAtualizacao = req.user.role === 'aluno'
      ? filtrarDadosPermitidosParaAluno(req.body)
      : req.body;

    if (req.user.role === 'aluno' && !isPerfilDoUsuario(alunoAtual, req.user)) {
      return res.status(403).json({ mensagem: 'Você não possui permissão para acessar este perfil.' });
    }

    const aluno = await Aluno.findByIdAndUpdate(req.params.id, dadosAtualizacao, {
      new: true,
      runValidators: true
    });

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
  buscarMeuPerfil,
  buscarAlunoPorId,
  criarAluno,
  atualizarAluno,
  removerAluno
};
