const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.JWT_SECRET = 'test_secret';
process.env.JWT_EXPIRES_IN = '1d';

const app = require('../app');
const Aluno = require('../models/Aluno');
const Comentario = require('../models/Comentario');
const Post = require('../models/Post');
const Professor = require('../models/Professor');
const User = require('../models/User');

let mongoServer;
let alunoUser;
let professorUser;
let outroProfessorUser;
let alunoToken;
let professorToken;
let outroProfessorToken;

async function login(email, senha = '123456') {
  return request(app)
    .post('/auth/login')
    .send({ email, senha });
}

async function prepararDados() {
  await Promise.all([
    Comentario.deleteMany({}),
    Post.deleteMany({}),
    Aluno.deleteMany({}),
    Professor.deleteMany({}),
    User.deleteMany({})
  ]);

  alunoUser = await User.create({
    nome: 'Aluno Teste',
    email: 'aluno@luminia.com',
    senha: '123456',
    role: 'aluno'
  });

  professorUser = await User.create({
    nome: 'Professor Teste',
    email: 'professor@luminia.com',
    senha: '123456',
    role: 'professor'
  });

  outroProfessorUser = await User.create({
    nome: 'Outro Professor',
    email: 'professor2@luminia.com',
    senha: '123456',
    role: 'professor'
  });

  await Aluno.create({
    userId: alunoUser._id,
    nome: 'Aluno Teste',
    matricula: 'ALU-TESTE',
    turma: '1A'
  });

  await Professor.create({
    userId: professorUser._id,
    nome: 'Professor Teste',
    materias: ['Tecnologia'],
    turmas: ['1A']
  });

  await Professor.create({
    userId: outroProfessorUser._id,
    nome: 'Outro Professor',
    materias: ['Matemática'],
    turmas: ['2A']
  });

  alunoToken = (await login('aluno@luminia.com')).body.token;
  professorToken = (await login('professor@luminia.com')).body.token;
  outroProfessorToken = (await login('professor2@luminia.com')).body.token;
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({
    instance: {
      ip: '127.0.0.1'
    }
  });
  await mongoose.connect(mongoServer.getUri());
});

beforeEach(async () => {
  await prepararDados();
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('integração de autenticação, perfis e posts', () => {
  test('login válido retorna token, usuário e não retorna senha', async () => {
    const response = await login('professor@luminia.com');

    expect(response.status).toBe(200);
    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.user).toMatchObject({
      email: 'professor@luminia.com',
      role: 'professor'
    });
    expect(response.body.user.senha).toBeUndefined();
  });

  test('login inválido retorna 401', async () => {
    const response = await login('professor@luminia.com', 'senha-errada');

    expect(response.status).toBe(401);
  });

  test('/auth/me valida token e sem token retorna 401', async () => {
    const valido = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${alunoToken}`);

    const semToken = await request(app).get('/auth/me');

    expect(valido.status).toBe(200);
    expect(valido.body.user.role).toBe('aluno');
    expect(valido.body.user.senha).toBeUndefined();
    expect(semToken.status).toBe(401);
  });

  test('perfis /me retornam dados reais do usuário autenticado', async () => {
    const aluno = await request(app)
      .get('/alunos/me')
      .set('Authorization', `Bearer ${alunoToken}`);

    const professor = await request(app)
      .get('/professores/me')
      .set('Authorization', `Bearer ${professorToken}`);

    expect(aluno.status).toBe(200);
    expect(aluno.body.matricula).toBe('ALU-TESTE');
    expect(professor.status).toBe(200);
    expect(professor.body.materias).toContain('Tecnologia');
  });

  test('aluno não cria post e professor cria post', async () => {
    const payload = {
      titulo: 'Post integrado',
      conteudo: 'Conteúdo real.',
      disciplina: 'Tecnologia',
      visivelPara: 'todos'
    };

    const aluno = await request(app)
      .post('/posts')
      .set('Authorization', `Bearer ${alunoToken}`)
      .send(payload);

    const professor = await request(app)
      .post('/posts')
      .set('Authorization', `Bearer ${professorToken}`)
      .send(payload);

    expect(aluno.status).toBe(403);
    expect(professor.status).toBe(201);
    expect(professor.body.post.autor.email).toBe('professor@luminia.com');
  });

  test('professor edita e exclui somente post próprio', async () => {
    const post = await Post.create({
      titulo: 'Post original',
      conteudo: 'Conteúdo original.',
      autor: professorUser._id,
      visivelPara: 'todos'
    });

    const outroEdita = await request(app)
      .put(`/posts/${post._id}`)
      .set('Authorization', `Bearer ${outroProfessorToken}`)
      .send({ titulo: 'Tentativa indevida' });

    const autorEdita = await request(app)
      .put(`/posts/${post._id}`)
      .set('Authorization', `Bearer ${professorToken}`)
      .send({ titulo: 'Post editado' });

    const outroExclui = await request(app)
      .delete(`/posts/${post._id}`)
      .set('Authorization', `Bearer ${outroProfessorToken}`);

    const autorExclui = await request(app)
      .delete(`/posts/${post._id}`)
      .set('Authorization', `Bearer ${professorToken}`);

    expect(outroEdita.status).toBe(403);
    expect(autorEdita.status).toBe(200);
    expect(autorEdita.body.post.titulo).toBe('Post editado');
    expect(outroExclui.status).toBe(403);
    expect(autorExclui.status).toBe(200);
  });
});
