const Professor = require('../models/Professor');
const User = require('../models/User');
const { criarPaginacao, escaparRegex } = require('../utils/pagination');

function isPerfilDoUsuario(perfil, user) {
  const userId = perfil.userId?._id || perfil.userId;
  return userId.toString() === user._id.toString();
}

async function listarProfessores(req, res) {
  try {
    const { pagina, limite, ordenarPor, ordem, busca, materia, turma } = req.validatedQuery;
    const filtro = {};
    if (busca) filtro.nome = new RegExp(escaparRegex(busca), 'i');
    if (materia) filtro.materias = new RegExp(`^${escaparRegex(materia)}$`, 'i');
    if (turma) filtro.turmas = new RegExp(`^${escaparRegex(turma)}$`, 'i');
    const [professores, total] = await Promise.all([
      Professor.find(filtro)
        .populate('userId', 'nome email role ativo')
        .sort({ [ordenarPor]: ordem === 'asc' ? 1 : -1 })
        .skip((pagina - 1) * limite)
        .limit(limite),
      Professor.countDocuments(filtro)
    ]);
    return res.json({
      dados: professores,
      paginacao: criarPaginacao({ pagina, limite, total, quantidade: professores.length })
    });
  } catch (error) {
    return res.status(500).json({ mensagem: 'Erro ao listar professores.' });
  }
}

async function buscarMeuPerfil(req, res) {
  try {
    const professor = await Professor.findOne({ userId: req.user._id }).populate('userId', 'nome email role ativo');

    if (!professor) {
      return res.status(404).json({ mensagem: 'Perfil de professor não encontrado.' });
    }

    return res.json(professor);
  } catch (error) {
    return res.status(500).json({ mensagem: 'Erro ao buscar perfil de professor.' });
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
    const { userId } = req.validatedBody;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ mensagem: 'Usuário relacionado não encontrado.' });
    }

    if (user.role !== 'professor') {
      return res.status(400).json({ mensagem: 'O usuário relacionado deve possuir role professor.' });
    }

    const professorExistente = await Professor.findOne({ userId });

    if (professorExistente) {
      return res.status(409).json({ mensagem: 'Este usuário já possui perfil de professor.' });
    }

    const professor = await Professor.create(req.validatedBody);
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
    const professorAtual = await Professor.findById(req.params.id);

    if (!professorAtual) {
      return res.status(404).json({ mensagem: 'Professor não encontrado.' });
    }

    if (!isPerfilDoUsuario(professorAtual, req.user)) {
      return res.status(403).json({ mensagem: 'Você não possui permissão para acessar este perfil.' });
    }

    const { userId, ...dadosAtualizacao } = req.validatedBody;
    const professor = await Professor.findByIdAndUpdate(req.params.id, dadosAtualizacao, {
      new: true,
      runValidators: true
    });

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
    const professorAtual = await Professor.findById(req.params.id);

    if (!professorAtual) {
      return res.status(404).json({ mensagem: 'Professor não encontrado.' });
    }

    if (!isPerfilDoUsuario(professorAtual, req.user)) {
      return res.status(403).json({ mensagem: 'Você não possui permissão para acessar este perfil.' });
    }

    await Professor.findByIdAndDelete(req.params.id);

    return res.json({ mensagem: 'Professor removido com sucesso.' });
  } catch (error) {
    return res.status(400).json({ mensagem: 'Erro ao remover professor.', erro: error.message });
  }
}

module.exports = {
  listarProfessores,
  buscarMeuPerfil,
  buscarProfessorPorId,
  criarProfessor,
  atualizarProfessor,
  removerProfessor
};
