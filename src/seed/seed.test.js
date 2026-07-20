const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { executarSeed } = require('./seed');
const User = require('../models/User');
const Aluno = require('../models/Aluno');
const Professor = require('../models/Professor');
const Post = require('../models/Post');
const Comentario = require('../models/Comentario');
const Atividade = require('../models/Atividade');
const Entrega = require('../models/Entrega');
const Correcao = require('../models/Correcao');
const Presenca = require('../models/Presenca');
const EventoCronograma = require('../models/EventoCronograma');
const Turma = require('../models/Turma');
const Disciplina = require('../models/Disciplina');

jest.setTimeout(30000);

const modelos = [
  Correcao, Entrega, Atividade, Disciplina, Turma, Presenca,
  EventoCronograma, Comentario, Post, Aluno, Professor, User
];
let mongoServer;
let consoleLog;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({ instance: { ip: '127.0.0.1', launchTimeout: 30000 } });
  await mongoose.connect(mongoServer.getUri());
  consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
});

beforeEach(async () => {
  await Promise.all(modelos.map(model => model.deleteMany({})));
});

afterAll(async () => {
  consoleLog.mockRestore();
  await mongoose.disconnect();
  await mongoServer.stop();
});

test('seed incremental preserva dados existentes e não duplica fixtures', async () => {
  await User.create({
    nome: 'Usuário preservado', email: 'preservado@luminia.com',
    senha: '123456', role: 'aluno'
  });

  await executarSeed({ conectar: false, reset: false });
  await executarSeed({ conectar: false, reset: false });

  expect(await User.exists({ email: 'preservado@luminia.com' })).toBeTruthy();
  expect(await User.countDocuments({})).toBe(3);
  expect(await Turma.countDocuments({ codigo: '1A' })).toBe(1);
  expect(await Disciplina.countDocuments({ codigo: { $in: ['MAT', 'TEC'] } })).toBe(2);
  expect(await Post.countDocuments({ autor: { $exists: true } })).toBe(2);
  expect(await Comentario.countDocuments({})).toBe(2);
  expect(await Atividade.countDocuments({})).toBe(1);
});

test('reset explícito remove dados anteriores antes de recriar as fixtures', async () => {
  await User.create({
    nome: 'Usuário removível', email: 'remover@luminia.com',
    senha: '123456', role: 'professor'
  });

  await executarSeed({ conectar: false, reset: true });

  expect(await User.exists({ email: 'remover@luminia.com' })).toBeNull();
  expect(await User.countDocuments({})).toBe(2);
  expect(await Aluno.countDocuments({})).toBe(1);
  expect(await Professor.countDocuments({})).toBe(1);
  expect(await Entrega.countDocuments({})).toBe(1);
  expect(await Correcao.countDocuments({})).toBe(1);
  expect(await Presenca.countDocuments({})).toBe(1);
  expect(await EventoCronograma.countDocuments({})).toBe(1);
});
