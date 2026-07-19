const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.setTimeout(30000);

process.env.JWT_SECRET = 'test_secret';
process.env.JWT_EXPIRES_IN = '1d';

const app = require('../app');
const Comentario = require('../models/Comentario');
const Post = require('../models/Post');
const User = require('../models/User');

let mongoServer;
let professorUser;
let professorOutroUser;
let alunoUser;
let post;
let postOutroProfessor;
let professorToken;
let professorOutroToken;
let alunoToken;

async function login(email) {
  const response = await request(app)
    .post('/auth/login')
    .send({ email, senha: '123456' });

  return response.body.token;
}

async function prepararDados() {
  await Promise.all([
    Comentario.deleteMany({}),
    Post.deleteMany({}),
    User.deleteMany({})
  ]);

  professorUser = await User.create({
    nome: 'Professor Teste',
    email: 'professor@luminia.com',
    senha: '123456',
    role: 'professor'
  });

  professorOutroUser = await User.create({
    nome: 'Professor Outro',
    email: 'professor2@luminia.com',
    senha: '123456',
    role: 'professor'
  });

  alunoUser = await User.create({
    nome: 'Aluno Teste',
    email: 'aluno@luminia.com',
    senha: '123456',
    role: 'aluno'
  });

  post = await Post.create({
    titulo: 'Post do professor',
    conteudo: 'Conteúdo do post.',
    disciplina: 'Tecnologia',
    autor: professorUser._id,
    visivelPara: 'todos'
  });

  postOutroProfessor = await Post.create({
    titulo: 'Post de outro professor',
    conteudo: 'Outro conteúdo.',
    disciplina: 'Matemática',
    autor: professorOutroUser._id,
    visivelPara: 'todos'
  });

  professorToken = await login('professor@luminia.com');
  professorOutroToken = await login('professor2@luminia.com');
  alunoToken = await login('aluno@luminia.com');
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

describe('comentários', () => {
  test('usuário sem token não lista comentários', async () => {
    const response = await request(app).get(`/posts/${post._id}/comentarios`);

    expect(response.status).toBe(401);
  });

  test('aluno e professor listam comentários', async () => {
    await Comentario.create({
      postId: post._id,
      autorId: alunoUser._id,
      conteudo: 'Comentário do aluno'
    });

    const alunoResponse = await request(app)
      .get(`/posts/${post._id}/comentarios`)
      .set('Authorization', `Bearer ${alunoToken}`);

    const professorResponse = await request(app)
      .get(`/posts/${post._id}/comentarios`)
      .set('Authorization', `Bearer ${professorToken}`);

    expect(alunoResponse.status).toBe(200);
    expect(professorResponse.status).toBe(200);
    expect(alunoResponse.body.dados).toHaveLength(1);
    expect(alunoResponse.body.dados[0].autor).toMatchObject({
      nome: 'Aluno Teste',
      role: 'aluno'
    });
  });

  test('listagem mantém ordem cronológica e calcula permissões no servidor', async () => {
    const primeiro = await Comentario.create({
      postId: post._id,
      autorId: alunoUser._id,
      conteudo: 'Primeiro comentário',
      criadoEm: new Date('2026-01-01T10:00:00.000Z')
    });
    const segundo = await Comentario.create({
      postId: post._id,
      autorId: professorOutroUser._id,
      conteudo: 'Segundo comentário',
      criadoEm: new Date('2026-01-01T11:00:00.000Z')
    });

    const alunoResponse = await request(app)
      .get(`/posts/${post._id}/comentarios`)
      .set('Authorization', `Bearer ${alunoToken}`);
    const autorPostResponse = await request(app)
      .get(`/posts/${post._id}/comentarios`)
      .set('Authorization', `Bearer ${professorToken}`);

    expect(alunoResponse.body.dados.map(item => item._id)).toEqual([
      primeiro._id.toString(),
      segundo._id.toString()
    ]);
    expect(alunoResponse.body.dados[0]).toMatchObject({ podeEditar: true, podeExcluir: true });
    expect(alunoResponse.body.dados[1]).toMatchObject({ podeEditar: false, podeExcluir: false });
    expect(autorPostResponse.body.dados).toEqual(expect.arrayContaining([
      expect.objectContaining({ podeEditar: false, podeExcluir: true })
    ]));
  });

  test('não lista comentários com ID inválido ou post invisível para a role', async () => {
    const postSomenteProfessores = await Post.create({
      titulo: 'Restrito',
      conteudo: 'Conteúdo restrito.',
      autor: professorUser._id,
      visivelPara: 'professores'
    });

    const idInvalido = await request(app)
      .get('/posts/id-invalido/comentarios')
      .set('Authorization', `Bearer ${alunoToken}`);
    const invisivel = await request(app)
      .get(`/posts/${postSomenteProfessores._id}/comentarios`)
      .set('Authorization', `Bearer ${alunoToken}`);

    expect(idInvalido.status).toBe(400);
    expect(invisivel.status).toBe(404);
  });

  test('aluno e professor criam comentário válido', async () => {
    const alunoResponse = await request(app)
      .post(`/posts/${post._id}/comentarios`)
      .set('Authorization', `Bearer ${alunoToken}`)
      .send({ conteudo: 'Minha dúvida.' });

    const professorResponse = await request(app)
      .post(`/posts/${post._id}/comentarios`)
      .set('Authorization', `Bearer ${professorToken}`)
      .send({ conteudo: 'Resposta do professor.' });

    expect(alunoResponse.status).toBe(201);
    expect(professorResponse.status).toBe(201);
    expect(alunoResponse.body.dados.podeEditar).toBe(true);
    expect(professorResponse.body.dados.autor.role).toBe('professor');
  });

  test('comentário vazio, acima do limite e post inexistente retornam erros esperados', async () => {
    const vazio = await request(app)
      .post(`/posts/${post._id}/comentarios`)
      .set('Authorization', `Bearer ${alunoToken}`)
      .send({ conteudo: '   ' });

    const longo = await request(app)
      .post(`/posts/${post._id}/comentarios`)
      .set('Authorization', `Bearer ${alunoToken}`)
      .send({ conteudo: 'a'.repeat(1001) });

    const inexistente = await request(app)
      .post(`/posts/${new mongoose.Types.ObjectId()}/comentarios`)
      .set('Authorization', `Bearer ${alunoToken}`)
      .send({ conteudo: 'Comentário' });

    expect(vazio.status).toBe(400);
    expect(longo.status).toBe(400);
    expect(inexistente.status).toBe(404);
  });

  test('criação normaliza espaços, aceita exatamente 1000 caracteres e rejeita tipo inválido', async () => {
    const normalizado = await request(app)
      .post(`/posts/${post._id}/comentarios`)
      .set('Authorization', `Bearer ${alunoToken}`)
      .send({ conteudo: '  Comentário sem espaços externos.  ' });
    const limite = await request(app)
      .post(`/posts/${post._id}/comentarios`)
      .set('Authorization', `Bearer ${alunoToken}`)
      .send({ conteudo: 'a'.repeat(1000) });
    const tipoInvalido = await request(app)
      .post(`/posts/${post._id}/comentarios`)
      .set('Authorization', `Bearer ${alunoToken}`)
      .send({ conteudo: 123 });

    expect(normalizado.status).toBe(201);
    expect(normalizado.body.dados.conteudo).toBe('Comentário sem espaços externos.');
    expect(limite.status).toBe(201);
    expect(limite.body.dados.conteudo).toHaveLength(1000);
    expect(tipoInvalido.status).toBe(400);
  });

  test('usuário edita somente o próprio comentário', async () => {
    const comentarioAluno = await Comentario.create({
      postId: post._id,
      autorId: alunoUser._id,
      conteudo: 'Original'
    });

    const permitido = await request(app)
      .put(`/comentarios/${comentarioAluno._id}`)
      .set('Authorization', `Bearer ${alunoToken}`)
      .send({ conteudo: 'Atualizado' });

    const proibido = await request(app)
      .put(`/comentarios/${comentarioAluno._id}`)
      .set('Authorization', `Bearer ${professorToken}`)
      .send({ conteudo: 'Tentativa do professor' });

    expect(permitido.status).toBe(200);
    expect(permitido.body.dados.conteudo).toBe('Atualizado');
    expect(proibido.status).toBe(403);
  });

  test('edição rejeita ID inválido, comentário inexistente, conteúdo vazio e conteúdo longo', async () => {
    const comentarioAluno = await Comentario.create({
      postId: post._id,
      autorId: alunoUser._id,
      conteudo: 'Original'
    });

    const idInvalido = await request(app)
      .put('/comentarios/id-invalido')
      .set('Authorization', `Bearer ${alunoToken}`)
      .send({ conteudo: 'Atualizado' });
    const inexistente = await request(app)
      .put(`/comentarios/${new mongoose.Types.ObjectId()}`)
      .set('Authorization', `Bearer ${alunoToken}`)
      .send({ conteudo: 'Atualizado' });
    const vazio = await request(app)
      .put(`/comentarios/${comentarioAluno._id}`)
      .set('Authorization', `Bearer ${alunoToken}`)
      .send({ conteudo: [] });
    const longo = await request(app)
      .put(`/comentarios/${comentarioAluno._id}`)
      .set('Authorization', `Bearer ${alunoToken}`)
      .send({ conteudo: 'a'.repeat(1001) });

    expect(idInvalido.status).toBe(400);
    expect(inexistente.status).toBe(404);
    expect(vazio.status).toBe(400);
    expect(longo.status).toBe(400);
    expect((await Comentario.findById(comentarioAluno._id)).conteudo).toBe('Original');
  });

  test('usuário exclui próprio comentário e não exclui comentário alheio', async () => {
    const comentarioAluno = await Comentario.create({
      postId: postOutroProfessor._id,
      autorId: alunoUser._id,
      conteudo: 'Comentário do aluno'
    });

    const proibido = await request(app)
      .delete(`/comentarios/${comentarioAluno._id}`)
      .set('Authorization', `Bearer ${professorToken}`);

    const permitido = await request(app)
      .delete(`/comentarios/${comentarioAluno._id}`)
      .set('Authorization', `Bearer ${alunoToken}`);

    expect(proibido.status).toBe(403);
    expect(permitido.status).toBe(200);
  });

  test('professor autor do post exclui comentário de aluno', async () => {
    const comentarioAluno = await Comentario.create({
      postId: post._id,
      autorId: alunoUser._id,
      conteudo: 'Comentário do aluno'
    });

    const response = await request(app)
      .delete(`/comentarios/${comentarioAluno._id}`)
      .set('Authorization', `Bearer ${professorToken}`);

    expect(response.status).toBe(200);
  });

  test('exclusão rejeita ID inválido, comentário inexistente e comentário com post removido', async () => {
    const comentarioOrfao = await Comentario.create({
      postId: post._id,
      autorId: alunoUser._id,
      conteudo: 'Comentário órfão'
    });
    await Post.findByIdAndDelete(post._id);

    const idInvalido = await request(app)
      .delete('/comentarios/id-invalido')
      .set('Authorization', `Bearer ${alunoToken}`);
    const inexistente = await request(app)
      .delete(`/comentarios/${new mongoose.Types.ObjectId()}`)
      .set('Authorization', `Bearer ${alunoToken}`);
    const postInexistente = await request(app)
      .delete(`/comentarios/${comentarioOrfao._id}`)
      .set('Authorization', `Bearer ${alunoToken}`);

    expect(idInvalido.status).toBe(400);
    expect(inexistente.status).toBe(404);
    expect(postInexistente.status).toBe(404);
    expect(await Comentario.findById(comentarioOrfao._id)).not.toBeNull();
  });

  test('exclusão de post remove comentários relacionados', async () => {
    await Comentario.create({
      postId: post._id,
      autorId: alunoUser._id,
      conteudo: 'Comentário do aluno'
    });

    const response = await request(app)
      .delete(`/posts/${post._id}`)
      .set('Authorization', `Bearer ${professorToken}`);

    const comentariosRestantes = await Comentario.find({ postId: post._id });

    expect(response.status).toBe(200);
    expect(comentariosRestantes).toHaveLength(0);
  });
});
