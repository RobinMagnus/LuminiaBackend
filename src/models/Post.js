const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    titulo: {
      type: String,
      required: true,
      trim: true
    },
    conteudo: {
      type: String,
      required: true
    },
    disciplina: {
      type: String,
      trim: true
    },
    autor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    tags: [
      {
        type: String,
        trim: true
      }
    ],
    visivelPara: {
      type: String,
      enum: ['todos', 'alunos', 'professores'],
      default: 'todos'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Post', postSchema);
