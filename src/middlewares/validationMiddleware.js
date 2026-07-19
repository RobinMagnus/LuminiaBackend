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
  validarQueryProfessores
};
