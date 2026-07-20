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
const Turma = require('../models/Turma');
const Disciplina = require('../models/Disciplina');

const colecoes = [
  Correcao, Entrega, Atividade, Disciplina, Turma, Presenca,
  EventoCronograma, Comentario, Post, Aluno, Professor, User
];

async function limparBanco() {
  await Promise.all(colecoes.map(model => model.deleteMany({})));
}

async function sincronizarUsuario(dados) {
  let user = await User.findOne({ email: dados.email }).select('+senha');
  if (!user) return User.create(dados);
  user.nome = dados.nome;
  user.role = dados.role;
  user.ativo = true;
  user.senha = dados.senha;
  return user.save();
}

function sincronizar(model, filtro, dados) {
  return model.findOneAndUpdate(
    filtro,
    { $set: dados },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
}

async function executarSeed({
  conectar = true,
  reset = process.env.SEED_RESET === 'true' || process.argv.includes('--reset')
} = {}) {
  try {
    if (conectar) await connectDatabase();
    if (reset) await limparBanco();

    const professorUser = await sincronizarUsuario({
      nome: 'Professor Teste',
      email: 'professor@luminia.com',
      senha: '123456',
      role: 'professor'
    });
    const alunoUser = await sincronizarUsuario({
      nome: 'Aluno Teste',
      email: 'aluno@luminia.com',
      senha: '123456',
      role: 'aluno'
    });

    const turma = await sincronizar(Turma, { codigo: '1A' }, {
      codigo: '1A', nome: 'Turma 1A', anoLetivo: 2027, turno: 'manha',
      descricao: 'Turma inicial do ensino fundamental.', ativa: true,
      professorId: professorUser._id
    });

    await Promise.all([
      sincronizar(Disciplina, { codigo: 'MAT' }, {
        codigo: 'MAT', nome: 'Matemática',
        descricao: 'Fundamentos de matemática e resolução de problemas.',
        cargaHoraria: 80, turmaIds: [turma._id], ativa: true, professorId: professorUser._id
      }),
      sincronizar(Disciplina, { codigo: 'TEC' }, {
        codigo: 'TEC', nome: 'Tecnologia',
        descricao: 'Introdução ao uso responsável de tecnologia.',
        cargaHoraria: 40, turmaIds: [turma._id], ativa: true, professorId: professorUser._id
      }),
      sincronizar(Professor, { userId: professorUser._id }, {
        userId: professorUser._id, nome: 'Professor Teste',
        dataNascimento: new Date('1985-04-12'),
        materias: ['Matemática', 'Tecnologia'], turmas: ['1A', '2B']
      })
    ]);

    const aluno = await sincronizar(Aluno, { userId: alunoUser._id }, {
      userId: alunoUser._id, nome: 'Aluno Teste',
      dataNascimento: new Date('2010-08-20'), turma: '1A', matricula: 'ALU-0001',
      boletim: [{
        disciplina: 'Matemática', nota: 8.5, periodo: '1o bimestre',
        observacao: 'Bom desempenho inicial.'
      }]
    });

    const boasVindas = await sincronizar(Post, {
      titulo: 'Boas-vindas ao Luminia', autor: professorUser._id
    }, {
      titulo: 'Boas-vindas ao Luminia',
      conteudo: 'Este espaço reúne conteúdos de apoio para alunos e professores.',
      disciplina: 'Tecnologia', autor: professorUser._id,
      tags: ['boas-vindas', 'plataforma'], visivelPara: 'todos'
    });
    await sincronizar(Post, {
      titulo: 'Atividade introdutória de Matemática', autor: professorUser._id
    }, {
      titulo: 'Atividade introdutória de Matemática',
      conteudo: 'Revise operações básicas e registre suas dúvidas para a próxima aula.',
      disciplina: 'Matemática', autor: professorUser._id,
      tags: ['matematica', 'atividade'], visivelPara: 'alunos'
    });

    await Promise.all([
      sincronizar(Comentario, { postId: boasVindas._id, autorId: alunoUser._id }, {
        postId: boasVindas._id, autorId: alunoUser._id,
        conteudo: 'Gostei do espaço de apoio. Vou acompanhar os conteúdos por aqui.'
      }),
      sincronizar(Comentario, { postId: boasVindas._id, autorId: professorUser._id }, {
        postId: boasVindas._id, autorId: professorUser._id,
        conteudo: 'Bem-vindos! Usem os comentários para registrar dúvidas sobre os materiais.'
      })
    ]);

    const atividade = await sincronizar(Atividade, {
      titulo: 'Lista de exercícios de Matemática', professorId: professorUser._id
    }, {
      titulo: 'Lista de exercícios de Matemática',
      enunciado: 'Resolva as equações e explique o raciocínio.',
      disciplina: 'Matemática', turma: '1A', professorId: professorUser._id,
      prazo: new Date('2027-12-10T23:59:00Z'), status: 'publicada'
    });
    const entrega = await sincronizar(Entrega, {
      atividadeId: atividade._id, alunoId: alunoUser._id
    }, {
      atividadeId: atividade._id, alunoId: alunoUser._id,
      resposta: 'Resolvi as equações aplicando as operações inversas.', status: 'corrigida'
    });

    await Promise.all([
      sincronizar(Correcao, { entregaId: entrega._id }, {
        entregaId: entrega._id, professorId: professorUser._id, nota: 8.5,
        feedback: 'Bom desenvolvimento. Revise apenas a apresentação dos cálculos.'
      }),
      sincronizar(Presenca, {
        alunoId: alunoUser._id, disciplina: 'Matemática', data: new Date('2027-05-10T00:00:00Z')
      }, {
        alunoId: alunoUser._id, professorId: professorUser._id,
        turma: aluno.turma, disciplina: 'Matemática',
        data: new Date('2027-05-10T00:00:00Z'), presente: true
      }),
      sincronizar(EventoCronograma, {
        titulo: 'Revisão de Matemática', professorId: professorUser._id
      }, {
        titulo: 'Revisão de Matemática', descricao: 'Revisão para a avaliação bimestral.',
        turma: aluno.turma, disciplina: 'Matemática', tipo: 'aula',
        inicio: new Date('2027-05-15T10:00:00Z'), professorId: professorUser._id
      })
    ]);

    console.log(`Seed ${reset ? 'com limpeza explícita' : 'incremental'} executado com sucesso.`);
    console.log('Professor: professor@luminia.com / 123456');
    console.log('Aluno: aluno@luminia.com / 123456');
  } finally {
    if (conectar) await mongoose.connection.close();
  }
}

if (require.main === module) {
  executarSeed().catch(error => {
    console.error('Erro ao executar seed:', error.message);
    process.exitCode = 1;
  });
}

module.exports = { executarSeed };
