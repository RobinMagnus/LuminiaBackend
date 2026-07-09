const mongoose = require('mongoose');

const professorSchema = new mongoose.Schema(
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
    materias: [
      {
        type: String,
        trim: true
      }
    ],
    turmas: [
      {
        type: String,
        trim: true
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Professor', professorSchema);
