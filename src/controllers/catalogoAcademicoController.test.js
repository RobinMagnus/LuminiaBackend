const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.setTimeout(30000);
process.env.JWT_SECRET = 'catalogo_test_secret';

const app = require('../app');
const User = require('../models/User');
const Aluno = require('../models/Aluno');
const Professor = require('../models/Professor');
const Turma = require('../models/Turma');
const Disciplina = require('../models/Disciplina');

let mongoServer;
let professor;
let outroProfessor;
let aluno;
let outroAluno;
let turma1A;
let turma2B;
let disciplina;
let tokens;

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

async function obterToken(email) {
  return (await request(app).post('/auth/login').send({ email, senha: '123456' })).body.token;
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({ instance: { ip: '127.0.0.1', launchTimeout: 30000 } });
  await mongoose.connect(mongoServer.getUri());
});

beforeEach(async () => {
  await Promise.all([
    Disciplina.deleteMany({}), Turma.deleteMany({}), Aluno.deleteMany({}),
    Professor.deleteMany({}), User.deleteMany({})
  ]);
  [professor, outroProfessor, aluno, outroAluno] = await User.create([
    { nome: 'Professor Catálogo', email: 'catalogo1@luminia.com', senha: '123456', role: 'professor' },
    { nome: 'Outro Professor', email: 'catalogo2@luminia.com', senha: '123456', role: 'professor' },
    { nome: 'Aluno 1A', email: 'catalogo.aluno1@luminia.com', senha: '123456', role: 'aluno' },
    { nome: 'Aluno 2B', email: 'catalogo.aluno2@luminia.com', senha: '123456', role: 'aluno' }
  ]);
  await Professor.create([
    { userId: professor._id, nome: professor.nome },
    { userId: outroProfessor._id, nome: outroProfessor.nome }
  ]);
  await Aluno.create([
    { userId: aluno._id, nome: aluno.nome, matricula: 'CAT-1', turma: '1A' },
    { userId: outroAluno._id, nome: outroAluno.nome, matricula: 'CAT-2', turma: 'Turma 2B' }
  ]);
  [turma1A, turma2B] = await Turma.create([
    { codigo: '1A', nome: 'Turma 1A', anoLetivo: 2027, turno: 'manha', professorId: professor._id },
    { codigo: '2B', nome: 'Turma 2B', anoLetivo: 2027, turno: 'tarde', professorId: outroProfessor._id }
  ]);
  disciplina = await Disciplina.create({
    codigo: 'MAT', nome: 'Matemática', cargaHoraria: 80,
    turmaIds: [turma1A._id], professorId: professor._id
  });
  tokens = {
    professor: await obterToken('catalogo1@luminia.com'),
    outroProfessor: await obterToken('catalogo2@luminia.com'),
    aluno: await obterToken('catalogo.aluno1@luminia.com'),
    outroAluno: await obterToken('catalogo.aluno2@luminia.com')
  };
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('turmas e disciplinas', () => {
  test('professor lista e filtra o catálogo paginado de turmas', async () => {
    const resposta = await request(app)
      .get('/turmas?busca=turma&turno=manha&anoLetivo=2027&ativa=true&ordem=asc&ordenarPor=nome')
      .set(auth(tokens.professor));
    const detalhe = await request(app).get(`/turmas/${turma1A._id}`).set(auth(tokens.professor));

    expect(resposta.status).toBe(200);
    expect(resposta.body.dados).toHaveLength(1);
    expect(resposta.body.paginacao.total).toBe(1);
    expect(detalhe.body.codigo).toBe('1A');
    expect(detalhe.body.professorId.email).toBe('catalogo1@luminia.com');
  });

  test('aluno visualiza somente a própria turma por código ou nome', async () => {
    const minha = await request(app).get('/turmas?busca=2B').set(auth(tokens.aluno));
    const detalhe = await request(app).get(`/turmas/${turma1A._id}`).set(auth(tokens.aluno));
    const proibida = await request(app).get(`/turmas/${turma2B._id}`).set(auth(tokens.aluno));
    const outroAlunoLista = await request(app).get('/turmas').set(auth(tokens.outroAluno));

    expect(minha.body.dados.map(item => item.codigo)).toEqual(['1A']);
    expect(detalhe.status).toBe(200);
    expect(proibida.status).toBe(403);
    expect(outroAlunoLista.body.dados.map(item => item.codigo)).toEqual(['2B']);
  });

  test('turma é criada, normalizada e atualizada apenas pelo responsável', async () => {
    const criada = await request(app).post('/turmas').set(auth(tokens.professor)).send({
      codigo: ' 3c ', nome: 'Turma 3C', anoLetivo: 2028, turno: 'integral', descricao: 'Nova turma'
    });
    const id = criada.body.turma._id;
    const proibida = await request(app).put(`/turmas/${id}`).set(auth(tokens.outroProfessor)).send({ nome: 'Inválida' });
    const atualizada = await request(app).put(`/turmas/${id}`).set(auth(tokens.professor)).send({
      nome: 'Terceiro C', turno: 'noite', ativa: false
    });

    expect(criada.status).toBe(201);
    expect(criada.body.turma.codigo).toBe('3C');
    expect(proibida.status).toBe(403);
    expect(atualizada.body.turma).toMatchObject({ nome: 'Terceiro C', turno: 'noite', ativa: false });
  });

  test('código duplicado e payloads inválidos de turma são rejeitados', async () => {
    const duplicada = await request(app).post('/turmas').set(auth(tokens.professor)).send({
      codigo: '1a', nome: 'Duplicada', anoLetivo: 2027, turno: 'manha'
    });
    const invalida = await request(app).post('/turmas').set(auth(tokens.professor)).send({
      codigo: 'x', nome: '', anoLetivo: 1999.5, turno: 'madrugada', ativa: 'sim'
    });
    const queryInvalida = await request(app)
      .get('/turmas?anoLetivo=abc&turno=madrugada&ativa=sim&pagina=0')
      .set(auth(tokens.professor));

    expect(duplicada.status).toBe(409);
    expect(invalida.status).toBe(400);
    expect(invalida.body.erros).toEqual(expect.any(Array));
    expect(queryInvalida.status).toBe(400);
  });

  test('exclusão de turma protege vínculos e remove turma vazia', async () => {
    const comAlunoEDisciplina = await request(app).delete(`/turmas/${turma1A._id}`).set(auth(tokens.professor));
    const vazia = await Turma.create({
      codigo: '4D', nome: 'Turma 4D', anoLetivo: 2027, turno: 'noite', professorId: professor._id
    });
    const removida = await request(app).delete(`/turmas/${vazia._id}`).set(auth(tokens.professor));

    expect(comAlunoEDisciplina.status).toBe(409);
    expect(removida.status).toBe(200);
    expect(await Turma.findById(vazia._id)).toBeNull();
  });

  test('turmas tratam perfil ausente, recurso inexistente e ID inválido', async () => {
    await Aluno.findOneAndDelete({ userId: aluno._id });
    const semPerfil = await request(app).get('/turmas').set(auth(tokens.aluno));
    const detalheSemPerfil = await request(app).get(`/turmas/${turma1A._id}`).set(auth(tokens.aluno));
    const inexistente = await request(app).put(`/turmas/${new mongoose.Types.ObjectId()}`).set(auth(tokens.professor)).send({ nome: 'Outra' });
    const invalida = await request(app).delete('/turmas/invalida').set(auth(tokens.professor));

    expect(semPerfil.status).toBe(404);
    expect(detalheSemPerfil.status).toBe(403);
    expect(inexistente.status).toBe(404);
    expect(invalida.status).toBe(400);
  });

  test('aluno sem turma cadastrada recebe catálogo vazio', async () => {
    await Aluno.findOneAndUpdate({ userId: aluno._id }, { turma: '' });
    const turmas = await request(app).get('/turmas').set(auth(tokens.aluno));
    const disciplinas = await request(app).get('/disciplinas').set(auth(tokens.aluno));

    expect(turmas.body.dados).toHaveLength(0);
    expect(disciplinas.body.dados).toHaveLength(0);
  });

  test('professor lista disciplinas com busca, estado e turma', async () => {
    const resposta = await request(app)
      .get(`/disciplinas?busca=mat&turmaId=${turma1A._id}&ativa=true&ordem=asc&ordenarPor=cargaHoraria`)
      .set(auth(tokens.professor));
    const detalhe = await request(app).get(`/disciplinas/${disciplina._id}`).set(auth(tokens.professor));

    expect(resposta.body.dados).toHaveLength(1);
    expect(resposta.body.dados[0].turmaIds[0].codigo).toBe('1A');
    expect(detalhe.body.nome).toBe('Matemática');
  });

  test('aluno acessa apenas disciplinas ativas vinculadas à própria turma', async () => {
    const inativa = await Disciplina.create({
      codigo: 'HIS', nome: 'História', cargaHoraria: 40, ativa: false,
      turmaIds: [turma1A._id], professorId: professor._id
    });
    const outra = await Disciplina.create({
      codigo: 'FIS', nome: 'Física', cargaHoraria: 60,
      turmaIds: [turma2B._id], professorId: outroProfessor._id
    });
    const lista = await request(app)
      .get(`/disciplinas?turmaId=${turma2B._id}&ativa=false`)
      .set(auth(tokens.aluno));
    const permitida = await request(app).get(`/disciplinas/${disciplina._id}`).set(auth(tokens.aluno));
    const detalheInativo = await request(app).get(`/disciplinas/${inativa._id}`).set(auth(tokens.aluno));
    const detalheOutra = await request(app).get(`/disciplinas/${outra._id}`).set(auth(tokens.aluno));

    expect(lista.body.dados.map(item => item.codigo)).toEqual(['MAT']);
    expect(permitida.status).toBe(200);
    expect(detalheInativo.status).toBe(403);
    expect(detalheOutra.status).toBe(403);
  });

  test('professor cria, atualiza e remove disciplina própria', async () => {
    const criada = await request(app).post('/disciplinas').set(auth(tokens.professor)).send({
      codigo: 'geo', nome: 'Geografia', descricao: 'Espaço geográfico',
      cargaHoraria: 50, turmaIds: [turma1A._id, turma1A._id]
    });
    const id = criada.body.disciplina._id;
    const proibida = await request(app).put(`/disciplinas/${id}`).set(auth(tokens.outroProfessor)).send({ cargaHoraria: 60 });
    const atualizada = await request(app).put(`/disciplinas/${id}`).set(auth(tokens.professor)).send({
      nome: 'Geografia Geral', cargaHoraria: 60, ativa: false
    });
    const removida = await request(app).delete(`/disciplinas/${id}`).set(auth(tokens.professor));

    expect(criada.status).toBe(201);
    expect(criada.body.disciplina.codigo).toBe('GEO');
    expect(criada.body.disciplina.turmaIds).toHaveLength(1);
    expect(proibida.status).toBe(403);
    expect(atualizada.body.disciplina).toMatchObject({ nome: 'Geografia Geral', cargaHoraria: 60, ativa: false });
    expect(removida.status).toBe(200);
  });

  test('disciplina rejeita código duplicado, turma inexistente e payload inválido', async () => {
    const duplicada = await request(app).post('/disciplinas').set(auth(tokens.professor)).send({
      codigo: 'mat', nome: 'Outra Matemática', cargaHoraria: 20, turmaIds: [turma1A._id]
    });
    const turmaInexistente = await request(app).post('/disciplinas').set(auth(tokens.professor)).send({
      codigo: 'QUI', nome: 'Química', cargaHoraria: 40, turmaIds: [new mongoose.Types.ObjectId()]
    });
    const invalida = await request(app).post('/disciplinas').set(auth(tokens.professor)).send({
      codigo: 'x', nome: '', cargaHoraria: 0.5, turmaIds: ['invalida'], ativa: 'sim'
    });

    expect(duplicada.status).toBe(409);
    expect(turmaInexistente.status).toBe(400);
    expect(invalida.status).toBe(400);
    expect(invalida.body.erros.length).toBeGreaterThan(3);
  });

  test('atualização de disciplina valida turmas e duplicidade', async () => {
    const outra = await Disciplina.create({
      codigo: 'ART', nome: 'Artes', cargaHoraria: 20,
      turmaIds: [turma1A._id], professorId: professor._id
    });
    const turmaInexistente = await request(app).put(`/disciplinas/${disciplina._id}`).set(auth(tokens.professor)).send({
      turmaIds: [new mongoose.Types.ObjectId()]
    });
    const duplicada = await request(app).put(`/disciplinas/${outra._id}`).set(auth(tokens.professor)).send({ codigo: 'MAT' });

    expect(turmaInexistente.status).toBe(400);
    expect(duplicada.status).toBe(409);
  });

  test('disciplinas tratam perfil, queries, recursos e IDs inválidos', async () => {
    const queryInvalida = await request(app)
      .get('/disciplinas?turmaId=invalida&ativa=sim&ordenarPor=outro')
      .set(auth(tokens.professor));
    const inexistente = await request(app).get(`/disciplinas/${new mongoose.Types.ObjectId()}`).set(auth(tokens.professor));
    const atualizaInexistente = await request(app).put(`/disciplinas/${new mongoose.Types.ObjectId()}`).set(auth(tokens.professor)).send({ nome: 'Outra' });
    const removeInvalida = await request(app).delete('/disciplinas/invalida').set(auth(tokens.professor));
    await Aluno.findOneAndDelete({ userId: aluno._id });
    const semPerfil = await request(app).get('/disciplinas').set(auth(tokens.aluno));
    const detalheSemPerfil = await request(app).get(`/disciplinas/${disciplina._id}`).set(auth(tokens.aluno));

    expect(queryInvalida.status).toBe(400);
    expect(inexistente.status).toBe(404);
    expect(atualizaInexistente.status).toBe(404);
    expect(removeInvalida.status).toBe(400);
    expect(semPerfil.status).toBe(404);
    expect(detalheSemPerfil.status).toBe(403);
  });

  test('aluno não pode criar turmas ou disciplinas', async () => {
    const turma = await request(app).post('/turmas').set(auth(tokens.aluno)).send({
      codigo: '5E', nome: 'Turma 5E', anoLetivo: 2027, turno: 'manha'
    });
    const materia = await request(app).post('/disciplinas').set(auth(tokens.aluno)).send({
      codigo: 'BIO', nome: 'Biologia', cargaHoraria: 40, turmaIds: [turma1A._id]
    });

    expect(turma.status).toBe(403);
    expect(materia.status).toBe(403);
  });
});
