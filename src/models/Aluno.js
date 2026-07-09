const mongoose = require('mongoose');

const alunoSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    nome: {
      type: String,
      required: true,
      trim: true
    },
    dataNascimento: {
      type: Date
    },
    turma: {
      type: String,
      trim: true
    },
    matricula: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    boletim: [
      {
        disciplina: String,
        nota: Number,
        periodo: String,
        observacao: String
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Aluno', alunoSchema);
