const Turma = require('../models/Turma');
const Disciplina = require('../models/Disciplina');
const Aluno = require('../models/Aluno');
const { criarPaginacao, escaparRegex } = require('../utils/pagination');

function mesmoId(a, b) {
  return a.toString() === b.toString();
}

function erroDuplicidade(error) {
  return error?.code === 11000;
}

async function paginar(model, filtro, query, populate = []) {
  const { pagina, limite, ordenarPor, ordem } = query;
  let consulta = model.find(filtro)
    .sort({ [ordenarPor]: ordem === 'asc' ? 1 : -1 })
    .skip((pagina - 1) * limite)
    .limit(limite);
  for (const item of populate) consulta = consulta.populate(item.path, item.select);
  const [dados, total] = await Promise.all([consulta, model.countDocuments(filtro)]);
  return { dados, paginacao: criarPaginacao({ pagina, limite, total, quantidade: dados.length }) };
}

async function turmaDoAluno(userId) {
  const aluno = await Aluno.findOne({ userId });
  if (!aluno) return { erro: 'Perfil de aluno não encontrado.' };
  if (!aluno.turma) return { turma: null };
  const identificador = new RegExp(`^${escaparRegex(aluno.turma)}$`, 'i');
  return { turma: await Turma.findOne({ $or: [{ codigo: identificador }, { nome: identificador }] }) };
}

function aplicarFiltros(filtro, query) {
  if (query.busca) {
    const busca = new RegExp(escaparRegex(query.busca), 'i');
    filtro.$or = [{ nome: busca }, { codigo: busca }];
  }
  if (query.ativa !== undefined) filtro.ativa = query.ativa === 'true';
}

async function listarTurmas(req, res) {
  try {
    const filtro = {};
    if (req.user.role === 'aluno') {
      const resultado = await turmaDoAluno(req.user._id);
      if (resultado.erro) return res.status(404).json({ mensagem: resultado.erro });
      filtro._id = resultado.turma?._id || null;
    } else aplicarFiltros(filtro, req.validatedQuery);
    if (req.validatedQuery.turno) filtro.turno = req.validatedQuery.turno;
    if (req.validatedQuery.anoLetivo) filtro.anoLetivo = req.validatedQuery.anoLetivo;
    return res.json(await paginar(Turma, filtro, req.validatedQuery, [{ path: 'professorId', select: 'nome email' }]));
  } catch (error) {
    return res.status(500).json({ mensagem: 'Erro ao listar turmas.' });
  }
}

async function buscarTurma(req, res) {
  try {
    const turma = await Turma.findById(req.params.id).populate('professorId', 'nome email');
    if (!turma) return res.status(404).json({ mensagem: 'Turma não encontrada.' });
    if (req.user.role === 'aluno') {
      const resultado = await turmaDoAluno(req.user._id);
      if (resultado.erro || !resultado.turma || !mesmoId(resultado.turma._id, turma._id)) {
        return res.status(403).json({ mensagem: 'Acesso não permitido.' });
      }
    }
    return res.json(turma);
  } catch (error) {
    return res.status(400).json({ mensagem: 'ID de turma inválido.' });
  }
}

async function listarAlunosDaTurma(req, res) {
  try {
    const turma = await Turma.findById(req.params.id);
    if (!turma) return res.status(404).json({ mensagem: 'Turma não encontrada.' });
    if (!mesmoId(turma.professorId, req.user._id)) return res.status(403).json({ mensagem: 'Acesso não permitido.' });

    const { pagina, limite, ordenarPor, ordem, busca } = req.validatedQuery;
    const identificadores = [
      new RegExp(`^${escaparRegex(turma.codigo)}$`, 'i'),
      new RegExp(`^${escaparRegex(turma.nome)}$`, 'i')
    ];
    const filtro = { turma: { $in: identificadores } };
    if (busca) {
      const termo = new RegExp(escaparRegex(busca), 'i');
      filtro.$or = [{ nome: termo }, { matricula: termo }];
    }

    const consulta = Aluno.find(filtro)
      .populate('userId', 'nome email role ativo')
      .sort({ [ordenarPor]: ordem === 'asc' ? 1 : -1 })
      .skip((pagina - 1) * limite)
      .limit(limite);
    const [alunos, total] = await Promise.all([consulta, Aluno.countDocuments(filtro)]);
    return res.json({
      turma: { _id: turma._id, codigo: turma.codigo, nome: turma.nome },
      dados: alunos,
      paginacao: criarPaginacao({ pagina, limite, total, quantidade: alunos.length })
    });
  } catch (error) {
    return res.status(400).json({ mensagem: 'ID de turma inválido.' });
  }
}

async function criarTurma(req, res) {
  try {
    const turma = await Turma.create({ ...req.validatedBody, professorId: req.user._id });
    return res.status(201).json({ mensagem: 'Turma criada com sucesso.', turma });
  } catch (error) {
    if (erroDuplicidade(error)) return res.status(409).json({ mensagem: 'Já existe uma turma com este código.' });
    return res.status(400).json({ mensagem: 'Erro ao criar turma.' });
  }
}

async function alterarTurma(req, res, remover = false) {
  try {
    const turma = await Turma.findById(req.params.id);
    if (!turma) return res.status(404).json({ mensagem: 'Turma não encontrada.' });
    if (!mesmoId(turma.professorId, req.user._id)) return res.status(403).json({ mensagem: 'Acesso não permitido.' });
    if (remover) {
      const identificadores = [
        new RegExp(`^${escaparRegex(turma.codigo)}$`, 'i'),
        new RegExp(`^${escaparRegex(turma.nome)}$`, 'i')
      ];
      const [alunos, disciplinas] = await Promise.all([
        Aluno.countDocuments({ turma: { $in: identificadores } }),
        Disciplina.countDocuments({ turmaIds: turma._id })
      ]);
      if (alunos || disciplinas) return res.status(409).json({ mensagem: 'A turma possui alunos ou disciplinas vinculadas.' });
      await turma.deleteOne();
      return res.json({ mensagem: 'Turma removida com sucesso.' });
    }
    Object.assign(turma, req.validatedBody);
    await turma.save();
    return res.json({ mensagem: 'Turma atualizada com sucesso.', turma });
  } catch (error) {
    if (erroDuplicidade(error)) return res.status(409).json({ mensagem: 'Já existe uma turma com este código.' });
    return res.status(400).json({ mensagem: 'ID ou dados de turma inválidos.' });
  }
}

async function atualizarTurma(req, res) { return alterarTurma(req, res); }
async function removerTurma(req, res) { return alterarTurma(req, res, true); }

async function listarDisciplinas(req, res) {
  try {
    const filtro = {};
    if (req.user.role === 'aluno') {
      const resultado = await turmaDoAluno(req.user._id);
      if (resultado.erro) return res.status(404).json({ mensagem: resultado.erro });
      filtro.turmaIds = resultado.turma?._id || null;
      filtro.ativa = true;
    } else aplicarFiltros(filtro, req.validatedQuery);
    if (req.validatedQuery.turmaId && req.user.role === 'professor') filtro.turmaIds = req.validatedQuery.turmaId;
    return res.json(await paginar(Disciplina, filtro, req.validatedQuery, [
      { path: 'turmaIds', select: 'codigo nome anoLetivo turno ativa' },
      { path: 'professorId', select: 'nome email' }
    ]));
  } catch (error) {
    return res.status(500).json({ mensagem: 'Erro ao listar disciplinas.' });
  }
}

async function buscarDisciplina(req, res) {
  try {
    const disciplina = await Disciplina.findById(req.params.id)
      .populate('turmaIds', 'codigo nome anoLetivo turno ativa')
      .populate('professorId', 'nome email');
    if (!disciplina) return res.status(404).json({ mensagem: 'Disciplina não encontrada.' });
    if (req.user.role === 'aluno') {
      const resultado = await turmaDoAluno(req.user._id);
      const permitida = resultado.turma && disciplina.ativa
        && disciplina.turmaIds.some(turma => mesmoId(turma._id, resultado.turma._id));
      if (resultado.erro || !permitida) return res.status(403).json({ mensagem: 'Acesso não permitido.' });
    }
    return res.json(disciplina);
  } catch (error) {
    return res.status(400).json({ mensagem: 'ID de disciplina inválido.' });
  }
}

async function validarTurmas(turmaIds) {
  if (!turmaIds) return true;
  return await Turma.countDocuments({ _id: { $in: turmaIds } }) === turmaIds.length;
}

async function criarDisciplina(req, res) {
  try {
    if (!await validarTurmas(req.validatedBody.turmaIds)) return res.status(400).json({ mensagem: 'Uma ou mais turmas não existem.' });
    const disciplina = await Disciplina.create({ ...req.validatedBody, professorId: req.user._id });
    return res.status(201).json({ mensagem: 'Disciplina criada com sucesso.', disciplina });
  } catch (error) {
    if (erroDuplicidade(error)) return res.status(409).json({ mensagem: 'Já existe uma disciplina com este código.' });
    return res.status(400).json({ mensagem: 'Erro ao criar disciplina.' });
  }
}

async function alterarDisciplina(req, res, remover = false) {
  try {
    const disciplina = await Disciplina.findById(req.params.id);
    if (!disciplina) return res.status(404).json({ mensagem: 'Disciplina não encontrada.' });
    if (!mesmoId(disciplina.professorId, req.user._id)) return res.status(403).json({ mensagem: 'Acesso não permitido.' });
    if (remover) {
      await disciplina.deleteOne();
      return res.json({ mensagem: 'Disciplina removida com sucesso.' });
    }
    if (!await validarTurmas(req.validatedBody.turmaIds)) return res.status(400).json({ mensagem: 'Uma ou mais turmas não existem.' });
    Object.assign(disciplina, req.validatedBody);
    await disciplina.save();
    return res.json({ mensagem: 'Disciplina atualizada com sucesso.', disciplina });
  } catch (error) {
    if (erroDuplicidade(error)) return res.status(409).json({ mensagem: 'Já existe uma disciplina com este código.' });
    return res.status(400).json({ mensagem: 'ID ou dados de disciplina inválidos.' });
  }
}

async function atualizarDisciplina(req, res) { return alterarDisciplina(req, res); }
async function removerDisciplina(req, res) { return alterarDisciplina(req, res, true); }

module.exports = {
  listarTurmas, buscarTurma, listarAlunosDaTurma, criarTurma, atualizarTurma, removerTurma,
  listarDisciplinas, buscarDisciplina, criarDisciplina, atualizarDisciplina, removerDisciplina
};
