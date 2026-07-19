const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.setTimeout(30000);
process.env.JWT_SECRET = 'academic_test_secret';

const app = require('../app');
const User = require('../models/User');
const Aluno = require('../models/Aluno');
const Professor = require('../models/Professor');
const Atividade = require('../models/Atividade');
const Entrega = require('../models/Entrega');
const Correcao = require('../models/Correcao');
const Presenca = require('../models/Presenca');
const EventoCronograma = require('../models/EventoCronograma');

let mongoServer;
let professor;
let outroProfessor;
let aluno;
let outroAluno;
let perfilAluno;
let tokens;

async function token(email) {
  return (await request(app).post('/auth/login').send({ email, senha: '123456' })).body.token;
}

function auth(valor) {
  return { Authorization: `Bearer ${valor}` };
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({ instance: { ip: '127.0.0.1', launchTimeout: 30000 } });
  await mongoose.connect(mongoServer.getUri());
});

beforeEach(async () => {
  await Promise.all([
    Correcao.deleteMany({}), Entrega.deleteMany({}), Atividade.deleteMany({}),
    Presenca.deleteMany({}), EventoCronograma.deleteMany({}), Aluno.deleteMany({}),
    Professor.deleteMany({}), User.deleteMany({})
  ]);
  [professor, outroProfessor, aluno, outroAluno] = await User.create([
    { nome: 'Professor Um', email: 'prof1@luminia.com', senha: '123456', role: 'professor' },
    { nome: 'Professor Dois', email: 'prof2@luminia.com', senha: '123456', role: 'professor' },
    { nome: 'Aluno Um', email: 'aluno1@luminia.com', senha: '123456', role: 'aluno' },
    { nome: 'Aluno Dois', email: 'aluno2@luminia.com', senha: '123456', role: 'aluno' }
  ]);
  await Professor.create([
    { userId: professor._id, nome: professor.nome, materias: ['Matemática'], turmas: ['1A'] },
    { userId: outroProfessor._id, nome: outroProfessor.nome, materias: ['Física'], turmas: ['2B'] }
  ]);
  [perfilAluno] = await Aluno.create([
    { userId: aluno._id, nome: aluno.nome, matricula: 'A-1', turma: '1A' },
    { userId: outroAluno._id, nome: outroAluno.nome, matricula: 'A-2', turma: '2B' }
  ]);
  tokens = {
    professor: await token('prof1@luminia.com'),
    outroProfessor: await token('prof2@luminia.com'),
    aluno: await token('aluno1@luminia.com'),
    outroAluno: await token('aluno2@luminia.com')
  };
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

async function criarAtividade() {
  return request(app).post('/atividades').set(auth(tokens.professor)).send({
    titulo: 'Equações do primeiro grau',
    enunciado: 'Resolva as equações propostas.',
    disciplina: 'Matemática',
    turma: '1A',
    prazo: '2027-12-10T12:00:00.000Z',
    status: 'publicada'
  });
}

describe('domínio acadêmico', () => {
  test('professor cria, lista, atualiza e consulta atividade própria', async () => {
    const criada = await criarAtividade();
    const id = criada.body.atividade._id;
    const lista = await request(app).get('/atividades?disciplina=Matemática&turma=1A').set(auth(tokens.professor));
    const detalhe = await request(app).get(`/atividades/${id}`).set(auth(tokens.professor));
    const atualizada = await request(app).put(`/atividades/${id}`).set(auth(tokens.professor)).send({ status: 'encerrada' });

    expect(criada.status).toBe(201);
    expect(lista.body.dados).toHaveLength(1);
    expect(lista.body.paginacao.total).toBe(1);
    expect(detalhe.body.titulo).toBe('Equações do primeiro grau');
    expect(atualizada.body.atividade.status).toBe('encerrada');
  });

  test('atividade respeita turma, publicação e autoria', async () => {
    const criada = await criarAtividade();
    const id = criada.body.atividade._id;
    const alunoLista = await request(app).get('/atividades').set(auth(tokens.aluno));
    const outroAlunoLista = await request(app).get('/atividades').set(auth(tokens.outroAluno));
    const outroProfessorAcessa = await request(app).get(`/atividades/${id}`).set(auth(tokens.outroProfessor));
    const outroProfessorEdita = await request(app).put(`/atividades/${id}`).set(auth(tokens.outroProfessor)).send({ titulo: 'Inválido' });

    expect(alunoLista.body.dados).toHaveLength(1);
    expect(outroAlunoLista.body.dados).toHaveLength(0);
    expect(outroProfessorAcessa.status).toBe(403);
    expect(outroProfessorEdita.status).toBe(403);
  });

  test('aluno da turma entrega uma vez e professor autor lista entregas', async () => {
    const atividade = (await criarAtividade()).body.atividade;
    const entrega = await request(app).post(`/atividades/${atividade._id}/entregas`).set(auth(tokens.aluno)).send({ resposta: 'x = 4' });
    const duplicada = await request(app).post(`/atividades/${atividade._id}/entregas`).set(auth(tokens.aluno)).send({ resposta: 'x = 5' });
    const foraDaTurma = await request(app).post(`/atividades/${atividade._id}/entregas`).set(auth(tokens.outroAluno)).send({ resposta: 'x = 3' });
    const listaProfessor = await request(app).get(`/atividades/${atividade._id}/entregas`).set(auth(tokens.professor));
    const minhas = await request(app).get('/entregas/me').set(auth(tokens.aluno));

    expect(entrega.status).toBe(201);
    expect(duplicada.status).toBe(409);
    expect(foraDaTurma.status).toBe(403);
    expect(listaProfessor.body.dados).toHaveLength(1);
    expect(minhas.body.dados[0].resposta).toBe('x = 4');
  });

  test('professor autor corrige entrega e aluno autor consulta correção', async () => {
    const atividade = (await criarAtividade()).body.atividade;
    const entrega = (await request(app).post(`/atividades/${atividade._id}/entregas`).set(auth(tokens.aluno)).send({ resposta: 'x = 4' })).body.entrega;
    const semCorrecao = await request(app).get(`/entregas/${entrega._id}/correcao`).set(auth(tokens.aluno));
    const proibida = await request(app).put(`/entregas/${entrega._id}/correcao`).set(auth(tokens.outroProfessor)).send({ nota: 8, feedback: 'Bom' });
    const corrigida = await request(app).put(`/entregas/${entrega._id}/correcao`).set(auth(tokens.professor)).send({ nota: 9, feedback: 'Muito bom' });
    const consulta = await request(app).get(`/entregas/${entrega._id}/correcao`).set(auth(tokens.aluno));
    const outroAlunoConsulta = await request(app).get(`/entregas/${entrega._id}/correcao`).set(auth(tokens.outroAluno));
    const outroProfessorConsulta = await request(app).get(`/entregas/${entrega._id}/correcao`).set(auth(tokens.outroProfessor));

    expect(semCorrecao.status).toBe(404);
    expect(proibida.status).toBe(403);
    expect(corrigida.body.correcao.nota).toBe(9);
    expect(consulta.body.feedback).toBe('Muito bom');
    expect(outroAlunoConsulta.status).toBe(403);
    expect(outroProfessorConsulta.status).toBe(403);
  });

  test('professor registra presença e aluno consulta apenas as próprias', async () => {
    const body = { alunoId: aluno._id, turma: '1A', disciplina: 'Matemática', data: '2027-05-10', presente: true };
    const criada = await request(app).post('/presencas').set(auth(tokens.professor)).send(body);
    const atualizada = await request(app).post('/presencas').set(auth(tokens.professor)).send({ ...body, presente: false, observacao: 'Justificada' });
    const listaAluno = await request(app).get('/presencas').set(auth(tokens.aluno));
    const listaOutro = await request(app).get('/presencas').set(auth(tokens.outroAluno));

    expect(criada.status).toBe(201);
    expect(atualizada.body.presenca.presente).toBe(false);
    expect(listaAluno.body.dados).toHaveLength(1);
    expect(listaOutro.body.dados).toHaveLength(0);
  });

  test('boletim permite lançamento por professor e consulta do aluno', async () => {
    const adicionada = await request(app).post(`/boletins/alunos/${perfilAluno._id}/notas`).set(auth(tokens.professor)).send({
      disciplina: 'Matemática', nota: 8.5, periodo: '1º bimestre', observacao: 'Bom desempenho'
    });
    const meuBoletim = await request(app).get('/boletins/me').set(auth(tokens.aluno));
    const professorConsulta = await request(app).get(`/boletins/alunos/${perfilAluno._id}`).set(auth(tokens.professor));

    expect(adicionada.status).toBe(201);
    expect(meuBoletim.body.notas[0].nota).toBe(8.5);
    expect(professorConsulta.body.aluno.matricula).toBe('A-1');
  });

  test('cronograma é gerenciado pelo professor e filtrado pela turma do aluno', async () => {
    const criado = await request(app).post('/cronograma').set(auth(tokens.professor)).send({
      titulo: 'Prova bimestral', turma: '1A', disciplina: 'Matemática', tipo: 'prova', inicio: '2027-06-10T10:00:00Z'
    });
    const id = criado.body.evento._id;
    const alunoLista = await request(app).get('/cronograma?ordenarPor=inicio').set(auth(tokens.aluno));
    const outroAlunoLista = await request(app).get('/cronograma').set(auth(tokens.outroAluno));
    const atualizado = await request(app).put(`/cronograma/${id}`).set(auth(tokens.professor)).send({ titulo: 'Prova atualizada' });
    const outroRemove = await request(app).delete(`/cronograma/${id}`).set(auth(tokens.outroProfessor));
    const removido = await request(app).delete(`/cronograma/${id}`).set(auth(tokens.professor));

    expect(criado.status).toBe(201);
    expect(alunoLista.body.dados).toHaveLength(1);
    expect(outroAlunoLista.body.dados).toHaveLength(0);
    expect(atualizado.body.evento.titulo).toBe('Prova atualizada');
    expect(outroRemove.status).toBe(403);
    expect(removido.status).toBe(200);
  });

  test('validação central rejeita payloads acadêmicos inválidos', async () => {
    const atividade = await request(app).post('/atividades').set(auth(tokens.professor)).send({ titulo: 'a', prazo: 'inválida' });
    const correcao = await request(app).put(`/entregas/${new mongoose.Types.ObjectId()}/correcao`).set(auth(tokens.professor)).send({ nota: 11, feedback: '' });
    const presenca = await request(app).post('/presencas').set(auth(tokens.professor)).send({ alunoId: 'x', presente: 'sim' });
    const evento = await request(app).post('/cronograma').set(auth(tokens.professor)).send({ titulo: 'x', tipo: 'outro', inicio: 'não' });

    expect([atividade, correcao, presenca, evento].every(item => item.status === 400)).toBe(true);
    expect(atividade.body.erros).toEqual(expect.any(Array));
  });

  test('remoção de atividade elimina entregas e correções relacionadas', async () => {
    const atividade = (await criarAtividade()).body.atividade;
    const entrega = (await request(app).post(`/atividades/${atividade._id}/entregas`).set(auth(tokens.aluno)).send({ resposta: 'Resposta' })).body.entrega;
    await request(app).put(`/entregas/${entrega._id}/correcao`).set(auth(tokens.professor)).send({ nota: 7, feedback: 'Ok' });
    const removida = await request(app).delete(`/atividades/${atividade._id}`).set(auth(tokens.professor));

    expect(removida.status).toBe(200);
    expect(await Entrega.countDocuments({ atividadeId: atividade._id })).toBe(0);
    expect(await Correcao.countDocuments({ entregaId: entrega._id })).toBe(0);
  });

  test('atividades retornam erros controlados para IDs, recursos e perfis inválidos', async () => {
    const inexistente = new mongoose.Types.ObjectId();
    const detalheInexistente = await request(app).get(`/atividades/${inexistente}`).set(auth(tokens.professor));
    const detalheInvalido = await request(app).get('/atividades/invalida').set(auth(tokens.professor));
    const atualizaInexistente = await request(app).put(`/atividades/${inexistente}`).set(auth(tokens.professor)).send({ status: 'encerrada' });
    const removeInvalida = await request(app).delete('/atividades/invalida').set(auth(tokens.professor));
    await Aluno.findOneAndDelete({ userId: aluno._id });
    const alunoSemPerfil = await request(app).get('/atividades').set(auth(tokens.aluno));

    expect(detalheInexistente.status).toBe(404);
    expect(detalheInvalido.status).toBe(400);
    expect(atualizaInexistente.status).toBe(404);
    expect(removeInvalida.status).toBe(400);
    expect(alunoSemPerfil.status).toBe(404);
  });

  test('entregas e correções tratam atividade encerrada e recursos inexistentes', async () => {
    const atividade = (await criarAtividade()).body.atividade;
    await Atividade.findByIdAndUpdate(atividade._id, { status: 'encerrada' });
    const encerrada = await request(app).post(`/atividades/${atividade._id}/entregas`).set(auth(tokens.aluno)).send({ resposta: 'Resposta' });
    const entregaInexistente = await request(app).put(`/entregas/${new mongoose.Types.ObjectId()}/correcao`).set(auth(tokens.professor)).send({ nota: 5, feedback: 'Ok' });
    const correcaoInvalida = await request(app).get('/entregas/invalida/correcao').set(auth(tokens.professor));
    const listaInexistente = await request(app).get(`/atividades/${new mongoose.Types.ObjectId()}/entregas`).set(auth(tokens.professor));
    const listaProibida = await request(app).get(`/atividades/${atividade._id}/entregas`).set(auth(tokens.outroProfessor));

    expect(encerrada.status).toBe(404);
    expect(entregaInexistente.status).toBe(404);
    expect(correcaoInvalida.status).toBe(400);
    expect(listaInexistente.status).toBe(404);
    expect(listaProibida.status).toBe(403);
  });

  test('presença e boletim tratam filtros, aluno inexistente e IDs inválidos', async () => {
    const presencaInexistente = await request(app).post('/presencas').set(auth(tokens.professor)).send({
      alunoId: new mongoose.Types.ObjectId(), turma: '1A', disciplina: 'Matemática', data: '2027-05-11', presente: true
    });
    await request(app).post('/presencas').set(auth(tokens.professor)).send({
      alunoId: aluno._id, turma: '1A', disciplina: 'Matemática', data: '2027-05-11', presente: true
    });
    const filtradas = await request(app).get('/presencas?turma=1A&disciplina=Matemática').set(auth(tokens.professor));
    const boletimInexistente = await request(app).get(`/boletins/alunos/${new mongoose.Types.ObjectId()}`).set(auth(tokens.professor));
    const boletimInvalido = await request(app).get('/boletins/alunos/invalido').set(auth(tokens.professor));
    const notaInexistente = await request(app).post(`/boletins/alunos/${new mongoose.Types.ObjectId()}/notas`).set(auth(tokens.professor)).send({
      disciplina: 'Matemática', nota: 5, periodo: '2º bimestre'
    });

    expect(presencaInexistente.status).toBe(404);
    expect(filtradas.body.dados).toHaveLength(1);
    expect(boletimInexistente.status).toBe(404);
    expect(boletimInvalido.status).toBe(400);
    expect(notaInexistente.status).toBe(404);
  });

  test('cronograma trata filtros, perfil ausente, evento inexistente e ID inválido', async () => {
    await request(app).post('/cronograma').set(auth(tokens.professor)).send({
      titulo: 'Aula especial', turma: '1A', disciplina: 'Matemática', tipo: 'aula', inicio: '2027-06-11'
    });
    const filtrado = await request(app).get('/cronograma?turma=1A&disciplina=Matemática').set(auth(tokens.professor));
    const atualizaInexistente = await request(app).put(`/cronograma/${new mongoose.Types.ObjectId()}`).set(auth(tokens.professor)).send({ titulo: 'Outro título' });
    const removeInvalido = await request(app).delete('/cronograma/invalido').set(auth(tokens.professor));
    await Aluno.findOneAndDelete({ userId: aluno._id });
    const semPerfil = await request(app).get('/cronograma').set(auth(tokens.aluno));

    expect(filtrado.body.dados).toHaveLength(1);
    expect(atualizaInexistente.status).toBe(404);
    expect(removeInvalido.status).toBe(400);
    expect(semPerfil.status).toBe(404);
  });
});
