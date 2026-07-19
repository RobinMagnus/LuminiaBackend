require('dotenv').config();

const mongoose = require('mongoose');
const connectDatabase = require('../config/database');
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

async function seed() {
  try {
    await connectDatabase();

    await Promise.all([
      Correcao.deleteMany({}),
      Entrega.deleteMany({}),
      Atividade.deleteMany({}),
      Presenca.deleteMany({}),
      EventoCronograma.deleteMany({}),
      Comentario.deleteMany({}),
      Post.deleteMany({}),
      Aluno.deleteMany({}),
      Professor.deleteMany({}),
      User.deleteMany({})
    ]);

    const professorUser = await User.create({
      nome: 'Professor Teste',
      email: 'professor@luminia.com',
      senha: '123456',
      role: 'professor'
    });

    const alunoUser = await User.create({
      nome: 'Aluno Teste',
      email: 'aluno@luminia.com',
      senha: '123456',
      role: 'aluno'
    });

    await Professor.create({
      userId: professorUser._id,
      nome: 'Professor Teste',
      dataNascimento: new Date('1985-04-12'),
      materias: ['Matemática', 'Tecnologia'],
      turmas: ['1A', '2B']
    });

    const aluno = await Aluno.create({
      userId: alunoUser._id,
      nome: 'Aluno Teste',
      dataNascimento: new Date('2010-08-20'),
      turma: '1A',
      matricula: 'ALU-0001',
      boletim: [
        {
          disciplina: 'Matemática',
          nota: 8.5,
          periodo: '1o bimestre',
          observacao: 'Bom desempenho inicial.'
        }
      ]
    });

    const posts = await Post.create([
      {
        titulo: 'Boas-vindas ao Luminia',
        conteudo: 'Este espaço reúne conteúdos de apoio para alunos e professores.',
        disciplina: 'Tecnologia',
        autor: professorUser._id,
        tags: ['boas-vindas', 'plataforma'],
        visivelPara: 'todos'
      },
      {
        titulo: 'Atividade introdutória de Matemática',
        conteudo: 'Revise operações básicas e registre suas dúvidas para a próxima aula.',
        disciplina: 'Matemática',
        autor: professorUser._id,
        tags: ['matematica', 'atividade'],
        visivelPara: 'alunos'
      }
    ]);

    await Comentario.create([
      {
        postId: posts[0]._id,
        autorId: alunoUser._id,
        conteudo: 'Gostei do espaço de apoio. Vou acompanhar os conteúdos por aqui.'
      },
      {
        postId: posts[0]._id,
        autorId: professorUser._id,
        conteudo: 'Bem-vindos! Usem os comentários para registrar dúvidas sobre os materiais.'
      }
    ]);

    const atividade = await Atividade.create({
      titulo: 'Lista de exercícios de Matemática',
      enunciado: 'Resolva as equações e explique o raciocínio.',
      disciplina: 'Matemática',
      turma: '1A',
      professorId: professorUser._id,
      prazo: new Date('2027-12-10T23:59:00Z'),
      status: 'publicada'
    });

    const entrega = await Entrega.create({
      atividadeId: atividade._id,
      alunoId: alunoUser._id,
      resposta: 'Resolvi as equações aplicando as operações inversas.',
      status: 'corrigida'
    });

    await Correcao.create({
      entregaId: entrega._id,
      professorId: professorUser._id,
      nota: 8.5,
      feedback: 'Bom desenvolvimento. Revise apenas a apresentação dos cálculos.'
    });

    await Presenca.create({
      alunoId: alunoUser._id,
      professorId: professorUser._id,
      turma: aluno.turma,
      disciplina: 'Matemática',
      data: new Date('2027-05-10T00:00:00Z'),
      presente: true
    });

    await EventoCronograma.create({
      titulo: 'Revisão de Matemática',
      descricao: 'Revisão para a avaliação bimestral.',
      turma: aluno.turma,
      disciplina: 'Matemática',
      tipo: 'aula',
      inicio: new Date('2027-05-15T10:00:00Z'),
      professorId: professorUser._id
    });

    console.log('Seed executado com sucesso.');
    console.log('Professor: professor@luminia.com / 123456');
    console.log('Aluno: aluno@luminia.com / 123456');
  } catch (error) {
    console.error('Erro ao executar seed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

seed();
