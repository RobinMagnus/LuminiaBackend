const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.setTimeout(30000);

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
      ip: '127.0.0.1',
      launchTimeout: 30000
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
  test('health check, rota inexistente e política CORS retornam respostas controladas', async () => {
    const health = await request(app).get('/');
    const rotaInexistente = await request(app).get('/rota-inexistente');
    const origemPermitida = await request(app)
      .get('/')
      .set('Origin', 'http://localhost:5173');
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const origemBloqueada = await request(app)
      .get('/')
      .set('Origin', 'https://origem-nao-permitida.example');
    consoleError.mockRestore();

    expect(health.status).toBe(200);
    expect(health.body.versao).toBe('1.0.0');
    expect(rotaInexistente.status).toBe(404);
    expect(origemPermitida.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(origemBloqueada.status).toBe(500);
    expect(origemBloqueada.body.mensagem).toBe('Origem não permitida pelo CORS.');
  });

  test('cadastro valida campos obrigatórios, role e email duplicado', async () => {
    const semCampos = await request(app)
      .post('/auth/register')
      .send({ nome: 'Novo usuário' });

    const roleInvalida = await request(app)
      .post('/auth/register')
      .send({ nome: 'Novo usuário', email: 'novo@luminia.com', senha: '123456', role: 'admin' });

    const emailDuplicado = await request(app)
      .post('/auth/register')
      .send({ nome: 'Outro aluno', email: 'aluno@luminia.com', senha: '123456', role: 'aluno' });

    expect(semCampos.status).toBe(400);
    expect(roleInvalida.status).toBe(400);
    expect(emailDuplicado.status).toBe(409);
  });

  test('cadastro válido cria usuário, retorna token e não expõe senha', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({
        nome: 'Nova Aluna',
        email: 'NOVA@LUMINIA.COM',
        senha: '123456',
        role: 'aluno'
      });

    const userCriado = await User.findOne({ email: 'nova@luminia.com' }).select('+senha');

    expect(response.status).toBe(201);
    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.user).toMatchObject({
      nome: 'Nova Aluna',
      email: 'nova@luminia.com',
      role: 'aluno',
      ativo: true
    });
    expect(response.body.user.senha).toBeUndefined();
    expect(userCriado.senha).not.toBe('123456');
  });

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

  test('login exige credenciais e recusa usuário inativo', async () => {
    const semSenha = await request(app)
      .post('/auth/login')
      .send({ email: 'aluno@luminia.com' });

    alunoUser.ativo = false;
    await alunoUser.save();
    const inativo = await login('aluno@luminia.com');

    expect(semSenha.status).toBe(400);
    expect(inativo.status).toBe(401);
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

  test('/auth/me recusa token inválido e token de usuário desativado', async () => {
    const tokenInvalido = await request(app)
      .get('/auth/me')
      .set('Authorization', 'Bearer token-invalido');

    alunoUser.ativo = false;
    await alunoUser.save();
    const usuarioInativo = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${alunoToken}`);

    expect(tokenInvalido.status).toBe(401);
    expect(usuarioInativo.status).toBe(401);
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

  test('perfis /me exigem a role correspondente', async () => {
    const professorComoAluno = await request(app)
      .get('/alunos/me')
      .set('Authorization', `Bearer ${professorToken}`);

    const alunoComoProfessor = await request(app)
      .get('/professores/me')
      .set('Authorization', `Bearer ${alunoToken}`);

    expect(professorComoAluno.status).toBe(403);
    expect(alunoComoProfessor.status).toBe(403);
  });

  test('aluno acessa e altera somente o próprio perfil e apenas campos permitidos', async () => {
    const outroAlunoUser = await User.create({
      nome: 'Outro Aluno',
      email: 'aluno2@luminia.com',
      senha: '123456',
      role: 'aluno'
    });
    const outroAluno = await Aluno.create({
      userId: outroAlunoUser._id,
      nome: 'Outro Aluno',
      matricula: 'ALU-2',
      turma: '2A'
    });
    const perfilAluno = await Aluno.findOne({ userId: alunoUser._id });

    const acessoAlheio = await request(app)
      .get(`/alunos/${outroAluno._id}`)
      .set('Authorization', `Bearer ${alunoToken}`);

    const atualizacao = await request(app)
      .put(`/alunos/${perfilAluno._id}`)
      .set('Authorization', `Bearer ${alunoToken}`)
      .send({ nome: 'Aluno Atualizado', turma: 'Turma indevida', matricula: 'ALTERADA' });

    expect(acessoAlheio.status).toBe(403);
    expect(atualizacao.status).toBe(200);
    expect(atualizacao.body.aluno.nome).toBe('Aluno Atualizado');
    expect(atualizacao.body.aluno.turma).toBe('1A');
    expect(atualizacao.body.aluno.matricula).toBe('ALU-TESTE');
  });

  test('professor altera e remove somente o próprio perfil', async () => {
    const perfilProfessor = await Professor.findOne({ userId: professorUser._id });
    const perfilOutroProfessor = await Professor.findOne({ userId: outroProfessorUser._id });

    const alteraAlheio = await request(app)
      .put(`/professores/${perfilOutroProfessor._id}`)
      .set('Authorization', `Bearer ${professorToken}`)
      .send({ nome: 'Alteração indevida' });

    const removeAlheio = await request(app)
      .delete(`/professores/${perfilOutroProfessor._id}`)
      .set('Authorization', `Bearer ${professorToken}`);

    const alteraProprio = await request(app)
      .put(`/professores/${perfilProfessor._id}`)
      .set('Authorization', `Bearer ${professorToken}`)
      .send({ nome: 'Professor Atualizado', userId: outroProfessorUser._id });

    expect(alteraAlheio.status).toBe(403);
    expect(removeAlheio.status).toBe(403);
    expect(alteraProprio.status).toBe(200);
    expect(alteraProprio.body.professor.nome).toBe('Professor Atualizado');
    expect(alteraProprio.body.professor.userId.toString()).toBe(professorUser._id.toString());
  });

  test('somente professor lista alunos e cria perfil para usuário aluno sem perfil', async () => {
    const novoAlunoUser = await User.create({
      nome: 'Aluno sem perfil',
      email: 'semperfil@luminia.com',
      senha: '123456',
      role: 'aluno'
    });

    const listaComoAluno = await request(app)
      .get('/alunos')
      .set('Authorization', `Bearer ${alunoToken}`);

    const criacao = await request(app)
      .post('/alunos')
      .set('Authorization', `Bearer ${professorToken}`)
      .send({ userId: novoAlunoUser._id, nome: 'Aluno sem perfil', matricula: 'ALU-3' });

    const duplicado = await request(app)
      .post('/alunos')
      .set('Authorization', `Bearer ${professorToken}`)
      .send({ userId: novoAlunoUser._id, nome: 'Aluno sem perfil', matricula: 'ALU-4' });

    expect(listaComoAluno.status).toBe(403);
    expect(criacao.status).toBe(201);
    expect(duplicado.status).toBe(409);
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

  test('listagem e detalhe de posts respeitam a visibilidade por role', async () => {
    const posts = await Post.create([
      { titulo: 'Todos', conteudo: 'Público autenticado', autor: professorUser._id, visivelPara: 'todos' },
      { titulo: 'Alunos', conteudo: 'Só alunos', autor: professorUser._id, visivelPara: 'alunos' },
      { titulo: 'Professores', conteudo: 'Só professores', autor: professorUser._id, visivelPara: 'professores' }
    ]);

    const listaAluno = await request(app)
      .get('/posts')
      .set('Authorization', `Bearer ${alunoToken}`);
    const listaProfessor = await request(app)
      .get('/posts')
      .set('Authorization', `Bearer ${professorToken}`);
    const detalheRestrito = await request(app)
      .get(`/posts/${posts[2]._id}`)
      .set('Authorization', `Bearer ${alunoToken}`);

    expect(listaAluno.body.map(post => post.titulo)).toEqual(expect.arrayContaining(['Todos', 'Alunos']));
    expect(listaAluno.body.map(post => post.titulo)).not.toContain('Professores');
    expect(listaProfessor.body.map(post => post.titulo)).toEqual(expect.arrayContaining(['Todos', 'Professores']));
    expect(listaProfessor.body.map(post => post.titulo)).not.toContain('Alunos');
    expect(detalheRestrito.status).toBe(404);
  });

  test('criação de post valida payload e ignora autor enviado pelo cliente', async () => {
    const invalido = await request(app)
      .post('/posts')
      .set('Authorization', `Bearer ${professorToken}`)
      .send({ titulo: 'Sem conteúdo' });

    const valido = await request(app)
      .post('/posts')
      .set('Authorization', `Bearer ${professorToken}`)
      .send({
        titulo: 'Autoria segura',
        conteudo: 'Conteúdo',
        autor: outroProfessorUser._id,
        visivelPara: 'todos'
      });

    expect(invalido.status).toBe(400);
    expect(valido.status).toBe(201);
    expect(valido.body.post.autor._id.toString()).toBe(professorUser._id.toString());
  });

  test('posts exigem autenticação e IDs inválidos retornam erro controlado', async () => {
    const semToken = await request(app).get('/posts');
    const idInvalido = await request(app)
      .get('/posts/id-invalido')
      .set('Authorization', `Bearer ${alunoToken}`);

    expect(semToken.status).toBe(401);
    expect(idInvalido.status).toBe(400);
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

  test('usuários autenticados listam e consultam usuários sem exposição de senha', async () => {
    const lista = await request(app)
      .get('/users')
      .set('Authorization', `Bearer ${alunoToken}`);
    const detalhe = await request(app)
      .get(`/users/${professorUser._id}`)
      .set('Authorization', `Bearer ${alunoToken}`);
    const inexistente = await request(app)
      .get(`/users/${new mongoose.Types.ObjectId()}`)
      .set('Authorization', `Bearer ${alunoToken}`);
    const idInvalido = await request(app)
      .get('/users/id-invalido')
      .set('Authorization', `Bearer ${alunoToken}`);

    expect(lista.status).toBe(200);
    expect(lista.body).toHaveLength(3);
    expect(lista.body.every(user => user.senha === undefined)).toBe(true);
    expect(detalhe.status).toBe(200);
    expect(detalhe.body.email).toBe('professor@luminia.com');
    expect(inexistente.status).toBe(404);
    expect(idInvalido.status).toBe(400);
  });

  test('professores autenticados podem listar e consultar perfis', async () => {
    const perfilProfessor = await Professor.findOne({ userId: professorUser._id });
    const lista = await request(app)
      .get('/professores')
      .set('Authorization', `Bearer ${alunoToken}`);
    const detalhe = await request(app)
      .get(`/professores/${perfilProfessor._id}`)
      .set('Authorization', `Bearer ${alunoToken}`);
    const inexistente = await request(app)
      .get(`/professores/${new mongoose.Types.ObjectId()}`)
      .set('Authorization', `Bearer ${alunoToken}`);
    const idInvalido = await request(app)
      .get('/professores/id-invalido')
      .set('Authorization', `Bearer ${alunoToken}`);

    expect(lista.status).toBe(200);
    expect(lista.body).toHaveLength(2);
    expect(detalhe.status).toBe(200);
    expect(detalhe.body.userId.email).toBe('professor@luminia.com');
    expect(inexistente.status).toBe(404);
    expect(idInvalido.status).toBe(400);
  });

  test('criação de professor valida vínculo, role, existência e duplicidade', async () => {
    const novoProfessorUser = await User.create({
      nome: 'Professor sem perfil',
      email: 'semperfilprof@luminia.com',
      senha: '123456',
      role: 'professor'
    });

    const semVinculo = await request(app)
      .post('/professores')
      .set('Authorization', `Bearer ${professorToken}`)
      .send({ nome: 'Sem vínculo' });
    const usuarioInexistente = await request(app)
      .post('/professores')
      .set('Authorization', `Bearer ${professorToken}`)
      .send({ userId: new mongoose.Types.ObjectId(), nome: 'Inexistente' });
    const roleIncorreta = await request(app)
      .post('/professores')
      .set('Authorization', `Bearer ${professorToken}`)
      .send({ userId: alunoUser._id, nome: 'Aluno' });
    const criado = await request(app)
      .post('/professores')
      .set('Authorization', `Bearer ${professorToken}`)
      .send({ userId: novoProfessorUser._id, nome: 'Professor sem perfil' });
    const duplicado = await request(app)
      .post('/professores')
      .set('Authorization', `Bearer ${professorToken}`)
      .send({ userId: novoProfessorUser._id, nome: 'Duplicado' });

    expect(semVinculo.status).toBe(400);
    expect(usuarioInexistente.status).toBe(404);
    expect(roleIncorreta.status).toBe(400);
    expect(criado.status).toBe(201);
    expect(duplicado.status).toBe(409);
  });

  test('professor remove o próprio perfil e recebe 404 para perfil inexistente', async () => {
    const perfilProfessor = await Professor.findOne({ userId: professorUser._id });
    const removido = await request(app)
      .delete(`/professores/${perfilProfessor._id}`)
      .set('Authorization', `Bearer ${professorToken}`);
    const novamente = await request(app)
      .delete(`/professores/${perfilProfessor._id}`)
      .set('Authorization', `Bearer ${professorToken}`);

    expect(removido.status).toBe(200);
    expect(novamente.status).toBe(404);
  });

  test('criação de aluno valida vínculo, existência e role', async () => {
    const semVinculo = await request(app)
      .post('/alunos')
      .set('Authorization', `Bearer ${professorToken}`)
      .send({ nome: 'Sem vínculo', matricula: 'SEM-VINCULO' });
    const usuarioInexistente = await request(app)
      .post('/alunos')
      .set('Authorization', `Bearer ${professorToken}`)
      .send({ userId: new mongoose.Types.ObjectId(), nome: 'Inexistente', matricula: 'INEXISTENTE' });
    const roleIncorreta = await request(app)
      .post('/alunos')
      .set('Authorization', `Bearer ${professorToken}`)
      .send({ userId: professorUser._id, nome: 'Professor', matricula: 'ROLE-ERRADA' });

    expect(semVinculo.status).toBe(400);
    expect(usuarioInexistente.status).toBe(404);
    expect(roleIncorreta.status).toBe(400);
  });

  test('professor lista, atualiza e remove alunos, incluindo recursos inexistentes', async () => {
    const perfilAluno = await Aluno.findOne({ userId: alunoUser._id });
    const lista = await request(app)
      .get('/alunos')
      .set('Authorization', `Bearer ${professorToken}`);
    const detalhe = await request(app)
      .get(`/alunos/${perfilAluno._id}`)
      .set('Authorization', `Bearer ${professorToken}`);
    const atualizado = await request(app)
      .put(`/alunos/${perfilAluno._id}`)
      .set('Authorization', `Bearer ${professorToken}`)
      .send({ turma: '3B' });
    const removido = await request(app)
      .delete(`/alunos/${perfilAluno._id}`)
      .set('Authorization', `Bearer ${professorToken}`);
    const atualizarInexistente = await request(app)
      .put(`/alunos/${perfilAluno._id}`)
      .set('Authorization', `Bearer ${professorToken}`)
      .send({ turma: '4A' });
    const removerInexistente = await request(app)
      .delete(`/alunos/${perfilAluno._id}`)
      .set('Authorization', `Bearer ${professorToken}`);
    const idInvalido = await request(app)
      .get('/alunos/id-invalido')
      .set('Authorization', `Bearer ${professorToken}`);

    expect(lista.status).toBe(200);
    expect(detalhe.status).toBe(200);
    expect(atualizado.body.aluno.turma).toBe('3B');
    expect(removido.status).toBe(200);
    expect(atualizarInexistente.status).toBe(404);
    expect(removerInexistente.status).toBe(404);
    expect(idInvalido.status).toBe(400);
  });

  test('posts inexistentes retornam 404 em consulta, edição e exclusão', async () => {
    const postId = new mongoose.Types.ObjectId();
    const detalhe = await request(app)
      .get(`/posts/${postId}`)
      .set('Authorization', `Bearer ${professorToken}`);
    const edicao = await request(app)
      .put(`/posts/${postId}`)
      .set('Authorization', `Bearer ${professorToken}`)
      .send({ titulo: 'Inexistente' });
    const exclusao = await request(app)
      .delete(`/posts/${postId}`)
      .set('Authorization', `Bearer ${professorToken}`);
    const edicaoIdInvalido = await request(app)
      .put('/posts/id-invalido')
      .set('Authorization', `Bearer ${professorToken}`)
      .send({ titulo: 'Inválido' });
    const exclusaoIdInvalido = await request(app)
      .delete('/posts/id-invalido')
      .set('Authorization', `Bearer ${professorToken}`);

    expect(detalhe.status).toBe(404);
    expect(edicao.status).toBe(404);
    expect(exclusao.status).toBe(404);
    expect(edicaoIdInvalido.status).toBe(400);
    expect(exclusaoIdInvalido.status).toBe(400);
  });
});
