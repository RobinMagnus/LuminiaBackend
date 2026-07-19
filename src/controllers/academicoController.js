const Atividade = require('../models/Atividade');
const Entrega = require('../models/Entrega');
const Correcao = require('../models/Correcao');
const Presenca = require('../models/Presenca');
const EventoCronograma = require('../models/EventoCronograma');
const Aluno = require('../models/Aluno');
const { criarPaginacao } = require('../utils/pagination');

function mesmoId(a, b) {
  return a.toString() === b.toString();
}

async function paginar(model, filtro, query, populate = []) {
  const { pagina, limite, ordenarPor, ordem } = query;
  let consulta = model.find(filtro).sort({ [ordenarPor]: ordem === 'asc' ? 1 : -1 })
    .skip((pagina - 1) * limite).limit(limite);
  for (const item of populate) consulta = consulta.populate(item.path, item.select);
  const [dados, total] = await Promise.all([consulta, model.countDocuments(filtro)]);
  return { dados, paginacao: criarPaginacao({ pagina, limite, total, quantidade: dados.length }) };
}

async function perfilAluno(userId) {
  return Aluno.findOne({ userId });
}

async function listarAtividades(req, res) {
  try {
    const { turma, disciplina, status } = req.validatedQuery;
    const filtro = {};
    if (req.user.role === 'professor') filtro.professorId = req.user._id;
    else {
      const aluno = await perfilAluno(req.user._id);
      if (!aluno) return res.status(404).json({ mensagem: 'Perfil de aluno não encontrado.' });
      filtro.turma = aluno.turma;
      filtro.status = 'publicada';
    }
    if (turma && req.user.role === 'professor') filtro.turma = turma;
    if (disciplina) filtro.disciplina = disciplina;
    if (status && req.user.role === 'professor') filtro.status = status;
    return res.json(await paginar(Atividade, filtro, req.validatedQuery, [{ path: 'professorId', select: 'nome email' }]));
  } catch (error) {
    return res.status(500).json({ mensagem: 'Erro ao listar atividades.' });
  }
}

async function buscarAtividade(req, res) {
  try {
    const atividade = await Atividade.findById(req.params.id).populate('professorId', 'nome email');
    if (!atividade) return res.status(404).json({ mensagem: 'Atividade não encontrada.' });
    if (req.user.role === 'professor' && !mesmoId(atividade.professorId._id, req.user._id)) return res.status(403).json({ mensagem: 'Acesso não permitido.' });
    if (req.user.role === 'aluno') {
      const aluno = await perfilAluno(req.user._id);
      if (!aluno || atividade.turma !== aluno.turma || atividade.status !== 'publicada') return res.status(403).json({ mensagem: 'Acesso não permitido.' });
    }
    return res.json(atividade);
  } catch (error) {
    return res.status(400).json({ mensagem: 'ID de atividade inválido.' });
  }
}

async function criarAtividade(req, res) {
  try {
    const atividade = await Atividade.create({ ...req.validatedBody, professorId: req.user._id });
    return res.status(201).json({ mensagem: 'Atividade criada com sucesso.', atividade });
  } catch (error) {
    return res.status(400).json({ mensagem: 'Erro ao criar atividade.' });
  }
}

async function alterarAtividade(req, res, remover = false) {
  try {
    const atividade = await Atividade.findById(req.params.id);
    if (!atividade) return res.status(404).json({ mensagem: 'Atividade não encontrada.' });
    if (!mesmoId(atividade.professorId, req.user._id)) return res.status(403).json({ mensagem: 'Acesso não permitido.' });
    if (remover) {
      const entregas = await Entrega.find({ atividadeId: atividade._id }).select('_id');
      await Correcao.deleteMany({ entregaId: { $in: entregas.map(item => item._id) } });
      await Entrega.deleteMany({ atividadeId: atividade._id });
      await atividade.deleteOne();
      return res.json({ mensagem: 'Atividade removida com sucesso.' });
    }
    Object.assign(atividade, req.validatedBody);
    await atividade.save();
    return res.json({ mensagem: 'Atividade atualizada com sucesso.', atividade });
  } catch (error) {
    return res.status(400).json({ mensagem: 'ID ou dados de atividade inválidos.' });
  }
}

async function atualizarAtividade(req, res) { return alterarAtividade(req, res); }
async function removerAtividade(req, res) { return alterarAtividade(req, res, true); }

async function criarEntrega(req, res) {
  try {
    const atividade = await Atividade.findById(req.params.atividadeId);
    if (!atividade || atividade.status !== 'publicada') return res.status(404).json({ mensagem: 'Atividade disponível não encontrada.' });
    const aluno = await perfilAluno(req.user._id);
    if (!aluno || aluno.turma !== atividade.turma) return res.status(403).json({ mensagem: 'Atividade não pertence à turma do aluno.' });
    const entrega = await Entrega.create({ atividadeId: atividade._id, alunoId: req.user._id, resposta: req.validatedBody.resposta });
    return res.status(201).json({ mensagem: 'Entrega enviada com sucesso.', entrega });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ mensagem: 'O aluno já enviou esta atividade.' });
    return res.status(400).json({ mensagem: 'Erro ao enviar entrega.' });
  }
}

async function listarEntregas(req, res) {
  try {
    const filtro = req.user.role === 'aluno' ? { alunoId: req.user._id } : {};
    if (req.params.atividadeId) {
      const atividade = await Atividade.findById(req.params.atividadeId);
      if (!atividade) return res.status(404).json({ mensagem: 'Atividade não encontrada.' });
      if (req.user.role === 'professor' && !mesmoId(atividade.professorId, req.user._id)) return res.status(403).json({ mensagem: 'Acesso não permitido.' });
      filtro.atividadeId = atividade._id;
    }
    return res.json(await paginar(Entrega, filtro, req.validatedQuery, [
      { path: 'atividadeId', select: 'titulo disciplina turma prazo' },
      { path: 'alunoId', select: 'nome email' }
    ]));
  } catch (error) {
    return res.status(400).json({ mensagem: 'Erro ao listar entregas.' });
  }
}

async function corrigirEntrega(req, res) {
  try {
    const entrega = await Entrega.findById(req.params.entregaId);
    if (!entrega) return res.status(404).json({ mensagem: 'Entrega não encontrada.' });
    const atividade = await Atividade.findById(entrega.atividadeId);
    if (!atividade || !mesmoId(atividade.professorId, req.user._id)) return res.status(403).json({ mensagem: 'Acesso não permitido.' });
    const correcao = await Correcao.findOneAndUpdate(
      { entregaId: entrega._id },
      { ...req.validatedBody, professorId: req.user._id, corrigidoEm: new Date() },
      { new: true, upsert: true, runValidators: true }
    );
    entrega.status = 'corrigida';
    await entrega.save();
    return res.json({ mensagem: 'Entrega corrigida com sucesso.', correcao });
  } catch (error) {
    return res.status(400).json({ mensagem: 'Erro ao corrigir entrega.' });
  }
}

async function buscarCorrecao(req, res) {
  try {
    const entrega = await Entrega.findById(req.params.entregaId);
    if (!entrega) return res.status(404).json({ mensagem: 'Entrega não encontrada.' });
    if (req.user.role === 'aluno' && !mesmoId(entrega.alunoId, req.user._id)) return res.status(403).json({ mensagem: 'Acesso não permitido.' });
    if (req.user.role === 'professor') {
      const atividade = await Atividade.findById(entrega.atividadeId);
      if (!atividade || !mesmoId(atividade.professorId, req.user._id)) return res.status(403).json({ mensagem: 'Acesso não permitido.' });
    }
    const correcao = await Correcao.findOne({ entregaId: entrega._id }).populate('professorId', 'nome');
    if (!correcao) return res.status(404).json({ mensagem: 'Correção não encontrada.' });
    return res.json(correcao);
  } catch (error) {
    return res.status(400).json({ mensagem: 'ID de entrega inválido.' });
  }
}

async function registrarPresenca(req, res) {
  try {
    const aluno = await Aluno.findOne({ userId: req.validatedBody.alunoId });
    if (!aluno) return res.status(404).json({ mensagem: 'Aluno não encontrado.' });
    const dados = { ...req.validatedBody, professorId: req.user._id };
    const presenca = await Presenca.findOneAndUpdate(
      { alunoId: dados.alunoId, disciplina: dados.disciplina, data: dados.data }, dados,
      { new: true, upsert: true, runValidators: true }
    );
    return res.status(201).json({ mensagem: 'Presença registrada com sucesso.', presenca });
  } catch (error) {
    return res.status(400).json({ mensagem: 'Erro ao registrar presença.' });
  }
}

async function listarPresencas(req, res) {
  try {
    const filtro = req.user.role === 'aluno' ? { alunoId: req.user._id } : {};
    if (req.validatedQuery.turma && req.user.role === 'professor') filtro.turma = req.validatedQuery.turma;
    if (req.validatedQuery.disciplina) filtro.disciplina = req.validatedQuery.disciplina;
    return res.json(await paginar(Presenca, filtro, req.validatedQuery, [{ path: 'alunoId', select: 'nome email' }]));
  } catch (error) {
    return res.status(500).json({ mensagem: 'Erro ao listar presenças.' });
  }
}

async function buscarBoletim(req, res) {
  try {
    const filtro = req.user.role === 'aluno' ? { userId: req.user._id } : { _id: req.params.alunoId };
    const aluno = await Aluno.findOne(filtro).populate('userId', 'nome email');
    if (!aluno) return res.status(404).json({ mensagem: 'Aluno não encontrado.' });
    return res.json({ aluno: { _id: aluno._id, nome: aluno.nome, matricula: aluno.matricula, turma: aluno.turma }, notas: aluno.boletim });
  } catch (error) {
    return res.status(400).json({ mensagem: 'ID de aluno inválido.' });
  }
}

async function adicionarNota(req, res) {
  try {
    const aluno = await Aluno.findByIdAndUpdate(req.params.alunoId, { $push: { boletim: req.validatedBody } }, { new: true, runValidators: true });
    if (!aluno) return res.status(404).json({ mensagem: 'Aluno não encontrado.' });
    return res.status(201).json({ mensagem: 'Nota adicionada com sucesso.', notas: aluno.boletim });
  } catch (error) {
    return res.status(400).json({ mensagem: 'Erro ao adicionar nota.' });
  }
}

async function listarCronograma(req, res) {
  try {
    const filtro = {};
    if (req.user.role === 'aluno') {
      const aluno = await perfilAluno(req.user._id);
      if (!aluno) return res.status(404).json({ mensagem: 'Perfil de aluno não encontrado.' });
      filtro.turma = aluno.turma;
    } else filtro.professorId = req.user._id;
    if (req.validatedQuery.turma) filtro.turma = req.validatedQuery.turma;
    if (req.validatedQuery.disciplina) filtro.disciplina = req.validatedQuery.disciplina;
    return res.json(await paginar(EventoCronograma, filtro, req.validatedQuery, [{ path: 'professorId', select: 'nome' }]));
  } catch (error) {
    return res.status(500).json({ mensagem: 'Erro ao listar cronograma.' });
  }
}

async function criarEvento(req, res) {
  try {
    const evento = await EventoCronograma.create({ ...req.validatedBody, professorId: req.user._id });
    return res.status(201).json({ mensagem: 'Evento criado com sucesso.', evento });
  } catch (error) {
    return res.status(400).json({ mensagem: 'Erro ao criar evento.' });
  }
}

async function alterarEvento(req, res, remover = false) {
  try {
    const evento = await EventoCronograma.findById(req.params.id);
    if (!evento) return res.status(404).json({ mensagem: 'Evento não encontrado.' });
    if (!mesmoId(evento.professorId, req.user._id)) return res.status(403).json({ mensagem: 'Acesso não permitido.' });
    if (remover) {
      await evento.deleteOne();
      return res.json({ mensagem: 'Evento removido com sucesso.' });
    }
    Object.assign(evento, req.validatedBody);
    await evento.save();
    return res.json({ mensagem: 'Evento atualizado com sucesso.', evento });
  } catch (error) {
    return res.status(400).json({ mensagem: 'ID ou dados de evento inválidos.' });
  }
}

async function atualizarEvento(req, res) { return alterarEvento(req, res); }
async function removerEvento(req, res) { return alterarEvento(req, res, true); }

module.exports = {
  listarAtividades, buscarAtividade, criarAtividade, atualizarAtividade, removerAtividade,
  criarEntrega, listarEntregas, corrigirEntrega, buscarCorrecao,
  registrarPresenca, listarPresencas, buscarBoletim, adicionarNota,
  listarCronograma, criarEvento, atualizarEvento, removerEvento
};
