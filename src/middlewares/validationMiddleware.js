const mongoose = require('mongoose');

const ROLES = ['aluno', 'professor'];
const VISIBILIDADES = ['todos', 'alunos', 'professores'];

function erro(campo, mensagem) {
  return { campo, mensagem };
}

function texto(valor, campo, erros, options = {}) {
  const { obrigatorio = false, min = 1, max = 255 } = options;
  if (valor === undefined || valor === null || valor === '') {
    if (obrigatorio) erros.push(erro(campo, `${campo} é obrigatório.`));
    return undefined;
  }
  if (typeof valor !== 'string') {
    erros.push(erro(campo, `${campo} deve ser texto.`));
    return undefined;
  }
  const normalizado = valor.trim();
  if (normalizado.length < min || normalizado.length > max) {
    erros.push(erro(campo, `${campo} deve ter entre ${min} e ${max} caracteres.`));
  }
  return normalizado;
}

function enumeracao(valor, campo, permitidos, erros, obrigatorio = false) {
  if (valor === undefined || valor === null || valor === '') {
    if (obrigatorio) erros.push(erro(campo, `${campo} é obrigatório.`));
    return undefined;
  }
  if (!permitidos.includes(valor)) erros.push(erro(campo, `${campo} possui valor inválido.`));
  return valor;
}

function objectId(valor, campo, erros, obrigatorio = false) {
  if (!valor) {
    if (obrigatorio) erros.push(erro(campo, `${campo} é obrigatório.`));
    return undefined;
  }
  if (!mongoose.isValidObjectId(valor)) erros.push(erro(campo, `${campo} deve ser um ID válido.`));
  return valor;
}

function listaTextos(valor, campo, erros) {
  if (valor === undefined) return undefined;
  if (!Array.isArray(valor) || valor.some(item => typeof item !== 'string')) {
    erros.push(erro(campo, `${campo} deve ser uma lista de textos.`));
    return undefined;
  }
  return valor.map(item => item.trim()).filter(Boolean);
}

function listaIds(valor, campo, erros, obrigatorio = false) {
  if (valor === undefined) {
    if (obrigatorio) erros.push(erro(campo, `${campo} é obrigatório.`));
    return undefined;
  }
  if (!Array.isArray(valor) || valor.length === 0 || valor.some(item => !mongoose.isValidObjectId(item))) {
    erros.push(erro(campo, `${campo} deve ser uma lista de IDs válidos.`));
    return undefined;
  }
  return [...new Set(valor.map(String))];
}

function numeroInteiro(valor, campo, erros, padrao, min, max) {
  if (valor === undefined || valor === '') return padrao;
  if (!/^\d+$/.test(String(valor))) {
    erros.push(erro(campo, `${campo} deve ser um número inteiro.`));
    return padrao;
  }
  const numero = Number(valor);
  if (numero < min || numero > max) erros.push(erro(campo, `${campo} deve estar entre ${min} e ${max}.`));
  return numero;
}

function data(valor, campo, erros, obrigatorio = false) {
  if (!valor) {
    if (obrigatorio) erros.push(erro(campo, `${campo} é obrigatório.`));
    return undefined;
  }
  const normalizada = new Date(valor);
  if (Number.isNaN(normalizada.getTime())) erros.push(erro(campo, `${campo} deve ser uma data válida.`));
  return normalizada;
}

function numero(valor, campo, erros, min, max, obrigatorio = false) {
  if (valor === undefined || valor === null || valor === '') {
    if (obrigatorio) erros.push(erro(campo, `${campo} é obrigatório.`));
    return undefined;
  }
  const normalizado = Number(valor);
  if (!Number.isFinite(normalizado) || normalizado < min || normalizado > max) {
    erros.push(erro(campo, `${campo} deve estar entre ${min} e ${max}.`));
  }
  return normalizado;
}

function inteiro(valor, campo, erros, min, max, obrigatorio = false) {
  const normalizado = numero(valor, campo, erros, min, max, obrigatorio);
  if (normalizado !== undefined && !Number.isInteger(normalizado)) {
    erros.push(erro(campo, `${campo} deve ser um número inteiro.`));
  }
  return normalizado;
}

function booleano(valor, campo, erros) {
  if (valor === undefined) return undefined;
  if (typeof valor !== 'boolean') {
    erros.push(erro(campo, `${campo} deve ser booleano.`));
    return undefined;
  }
  return valor;
}

function responder(erros, res, dados, destino) {
  if (erros.length) return res.status(400).json({ mensagem: 'Dados inválidos.', erros });
  return dados(destino);
}

function validarBody(construtor) {
  return (req, res, next) => {
    const erros = [];
    const dados = Object.fromEntries(
      Object.entries(construtor(req.body || {}, erros, req)).filter(([, valor]) => valor !== undefined)
    );
    return responder(erros, res, valor => {
      req.validatedBody = valor;
      next();
    }, dados);
  };
}

function validarQuery(construtor) {
  return (req, res, next) => {
    const erros = [];
    const dados = construtor(req.query || {}, erros);
    return responder(erros, res, valor => {
      req.validatedQuery = valor;
      next();
    }, dados);
  };
}

function paginacao(query, erros, ordenarPermitidos, ordenarPadrao = 'createdAt') {
  return {
    pagina: numeroInteiro(query.pagina, 'pagina', erros, 1, 1, 100000),
    limite: numeroInteiro(query.limite, 'limite', erros, 20, 1, 100),
    ordenarPor: enumeracao(query.ordenarPor, 'ordenarPor', ordenarPermitidos, erros) || ordenarPadrao,
    ordem: enumeracao(query.ordem, 'ordem', ['asc', 'desc'], erros) || 'desc'
  };
}

const validarRegistro = validarBody((body, erros) => ({
  nome: texto(body.nome, 'nome', erros, { obrigatorio: true, min: 2, max: 120 }),
  email: texto(body.email, 'email', erros, { obrigatorio: true, min: 5, max: 254 })?.toLowerCase(),
  senha: texto(body.senha, 'senha', erros, { obrigatorio: true, min: 6, max: 128 }),
  role: enumeracao(body.role, 'role', ROLES, erros, true)
}));

const validarLogin = validarBody((body, erros) => ({
  email: texto(body.email, 'email', erros, { obrigatorio: true, min: 5, max: 254 })?.toLowerCase(),
  senha: texto(body.senha, 'senha', erros, { obrigatorio: true, min: 6, max: 128 })
}));

function construirPost(body, erros, req) {
  const edicao = req.method === 'PUT';
  return {
    titulo: texto(body.titulo, 'titulo', erros, { obrigatorio: !edicao, min: 3, max: 180 }),
    conteudo: texto(body.conteudo, 'conteudo', erros, { obrigatorio: !edicao, min: 1, max: 20000 }),
    disciplina: texto(body.disciplina, 'disciplina', erros, { max: 100 }),
    tags: listaTextos(body.tags, 'tags', erros),
    visivelPara: enumeracao(body.visivelPara, 'visivelPara', VISIBILIDADES, erros)
  };
}

const validarPost = validarBody(construirPost);
const validarComentario = validarBody((body, erros) => ({
  conteudo: texto(body.conteudo, 'conteudo', erros, { obrigatorio: true, min: 1, max: 1000 })
}));

const validarAluno = validarBody((body, erros, req) => ({
  userId: objectId(body.userId, 'userId', erros, req.method === 'POST'),
  nome: texto(body.nome, 'nome', erros, { obrigatorio: req.method === 'POST', min: 2, max: 120 }),
  dataNascimento: body.dataNascimento,
  turma: texto(body.turma, 'turma', erros, { max: 80 }),
  matricula: texto(body.matricula, 'matricula', erros, { obrigatorio: req.method === 'POST', max: 80 })
}));

const validarProfessor = validarBody((body, erros, req) => ({
  userId: objectId(body.userId, 'userId', erros, req.method === 'POST'),
  nome: texto(body.nome, 'nome', erros, { obrigatorio: req.method === 'POST', min: 2, max: 120 }),
  dataNascimento: body.dataNascimento,
  materias: listaTextos(body.materias, 'materias', erros),
  turmas: listaTextos(body.turmas, 'turmas', erros)
}));

const validarQueryPosts = validarQuery((query, erros) => ({
  ...paginacao(query, erros, ['createdAt', 'titulo', 'disciplina']),
  busca: texto(query.busca, 'busca', erros, { max: 100 }),
  disciplina: texto(query.disciplina, 'disciplina', erros, { max: 100 }),
  tag: texto(query.tag, 'tag', erros, { max: 80 }),
  autor: objectId(query.autor, 'autor', erros),
  visivelPara: enumeracao(query.visivelPara, 'visivelPara', VISIBILIDADES, erros)
}));

const validarQueryComentarios = validarQuery((query, erros) => ({
  ...paginacao(query, erros, ['criadoEm'], 'criadoEm'),
  ordem: enumeracao(query.ordem, 'ordem', ['asc', 'desc'], erros) || 'asc'
}));

const validarQueryUsers = validarQuery((query, erros) => ({
  ...paginacao(query, erros, ['createdAt', 'nome', 'email']),
  busca: texto(query.busca, 'busca', erros, { max: 100 }),
  role: enumeracao(query.role, 'role', ROLES, erros),
  ativo: enumeracao(query.ativo, 'ativo', ['true', 'false'], erros)
}));

const validarQueryAlunos = validarQuery((query, erros) => ({
  ...paginacao(query, erros, ['createdAt', 'nome', 'matricula']),
  busca: texto(query.busca, 'busca', erros, { max: 100 }),
  turma: texto(query.turma, 'turma', erros, { max: 80 })
}));

const validarQueryProfessores = validarQuery((query, erros) => ({
  ...paginacao(query, erros, ['createdAt', 'nome']),
  busca: texto(query.busca, 'busca', erros, { max: 100 }),
  materia: texto(query.materia, 'materia', erros, { max: 100 }),
  turma: texto(query.turma, 'turma', erros, { max: 80 })
}));

const validarAtividade = validarBody((body, erros, req) => ({
  titulo: texto(body.titulo, 'titulo', erros, { obrigatorio: req.method === 'POST', min: 3, max: 180 }),
  enunciado: texto(body.enunciado, 'enunciado', erros, { obrigatorio: req.method === 'POST', max: 20000 }),
  disciplina: texto(body.disciplina, 'disciplina', erros, { obrigatorio: req.method === 'POST', max: 100 }),
  turma: texto(body.turma, 'turma', erros, { obrigatorio: req.method === 'POST', max: 80 }),
  prazo: data(body.prazo, 'prazo', erros, req.method === 'POST'),
  status: enumeracao(body.status, 'status', ['rascunho', 'publicada', 'encerrada'], erros)
}));

const validarEntrega = validarBody((body, erros) => ({
  resposta: texto(body.resposta, 'resposta', erros, { obrigatorio: true, max: 20000 })
}));

const validarCorrecao = validarBody((body, erros) => ({
  nota: numero(body.nota, 'nota', erros, 0, 10, true),
  feedback: texto(body.feedback, 'feedback', erros, { obrigatorio: true, max: 5000 })
}));

const validarPresenca = validarBody((body, erros) => ({
  alunoId: objectId(body.alunoId, 'alunoId', erros, true),
  turma: texto(body.turma, 'turma', erros, { obrigatorio: true, max: 80 }),
  disciplina: texto(body.disciplina, 'disciplina', erros, { obrigatorio: true, max: 100 }),
  data: data(body.data, 'data', erros, true),
  presente: typeof body.presente === 'boolean'
    ? body.presente
    : (erros.push(erro('presente', 'presente deve ser booleano.')), undefined),
  observacao: texto(body.observacao, 'observacao', erros, { max: 500 })
}));

const validarBoletim = validarBody((body, erros) => ({
  disciplina: texto(body.disciplina, 'disciplina', erros, { obrigatorio: true, max: 100 }),
  nota: numero(body.nota, 'nota', erros, 0, 10, true),
  periodo: texto(body.periodo, 'periodo', erros, { obrigatorio: true, max: 80 }),
  observacao: texto(body.observacao, 'observacao', erros, { max: 500 })
}));

const validarEvento = validarBody((body, erros, req) => ({
  titulo: texto(body.titulo, 'titulo', erros, { obrigatorio: req.method === 'POST', min: 3, max: 180 }),
  descricao: texto(body.descricao, 'descricao', erros, { max: 2000 }),
  turma: texto(body.turma, 'turma', erros, { obrigatorio: req.method === 'POST', max: 80 }),
  disciplina: texto(body.disciplina, 'disciplina', erros, { max: 100 }),
  tipo: enumeracao(body.tipo, 'tipo', ['aula', 'atividade', 'prova', 'evento'], erros, req.method === 'POST'),
  inicio: data(body.inicio, 'inicio', erros, req.method === 'POST'),
  fim: data(body.fim, 'fim', erros)
}));

const validarQueryAcademica = validarQuery((query, erros) => ({
  ...paginacao(query, erros, ['createdAt', 'prazo', 'inicio', 'data']),
  turma: texto(query.turma, 'turma', erros, { max: 80 }),
  disciplina: texto(query.disciplina, 'disciplina', erros, { max: 100 }),
  status: texto(query.status, 'status', erros, { max: 30 })
}));

const validarTurma = validarBody((body, erros, req) => ({
  codigo: texto(body.codigo, 'codigo', erros, { obrigatorio: req.method === 'POST', min: 2, max: 30 })?.toUpperCase(),
  nome: texto(body.nome, 'nome', erros, { obrigatorio: req.method === 'POST', min: 2, max: 120 }),
  anoLetivo: inteiro(body.anoLetivo, 'anoLetivo', erros, 2000, 2100, req.method === 'POST'),
  turno: enumeracao(body.turno, 'turno', ['manha', 'tarde', 'noite', 'integral'], erros, req.method === 'POST'),
  descricao: texto(body.descricao, 'descricao', erros, { max: 1000 }),
  ativa: booleano(body.ativa, 'ativa', erros)
}));

const validarDisciplina = validarBody((body, erros, req) => ({
  codigo: texto(body.codigo, 'codigo', erros, { obrigatorio: req.method === 'POST', min: 2, max: 30 })?.toUpperCase(),
  nome: texto(body.nome, 'nome', erros, { obrigatorio: req.method === 'POST', min: 2, max: 120 }),
  descricao: texto(body.descricao, 'descricao', erros, { max: 2000 }),
  cargaHoraria: inteiro(body.cargaHoraria, 'cargaHoraria', erros, 1, 10000, req.method === 'POST'),
  turmaIds: listaIds(body.turmaIds, 'turmaIds', erros, req.method === 'POST'),
  ativa: booleano(body.ativa, 'ativa', erros)
}));

const validarQueryTurmas = validarQuery((query, erros) => ({
  ...paginacao(query, erros, ['createdAt', 'codigo', 'nome', 'anoLetivo']),
  busca: texto(query.busca, 'busca', erros, { max: 100 }),
  turno: enumeracao(query.turno, 'turno', ['manha', 'tarde', 'noite', 'integral'], erros),
  anoLetivo: query.anoLetivo === undefined
    ? undefined
    : inteiro(query.anoLetivo, 'anoLetivo', erros, 2000, 2100),
  ativa: enumeracao(query.ativa, 'ativa', ['true', 'false'], erros)
}));

const validarQueryDisciplinas = validarQuery((query, erros) => ({
  ...paginacao(query, erros, ['createdAt', 'codigo', 'nome', 'cargaHoraria']),
  busca: texto(query.busca, 'busca', erros, { max: 100 }),
  turmaId: objectId(query.turmaId, 'turmaId', erros),
  ativa: enumeracao(query.ativa, 'ativa', ['true', 'false'], erros)
}));

module.exports = {
  validarRegistro,
  validarLogin,
  validarPost,
  validarComentario,
  validarAluno,
  validarProfessor,
  validarQueryPosts,
  validarQueryComentarios,
  validarQueryUsers,
  validarQueryAlunos,
  validarQueryProfessores,
  validarAtividade,
  validarEntrega,
  validarCorrecao,
  validarPresenca,
  validarBoletim,
  validarEvento,
  validarQueryAcademica,
  validarTurma,
  validarDisciplina,
  validarQueryTurmas,
  validarQueryDisciplinas
};
