const mongoose = require('mongoose');

const atividadeSchema = new mongoose.Schema({
  titulo: { type: String, required: true, trim: true },
  enunciado: { type: String, required: true, trim: true },
  disciplina: { type: String, required: true, trim: true, index: true },
  turma: { type: String, required: true, trim: true, index: true },
  professorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  prazo: { type: Date, required: true },
  status: { type: String, enum: ['rascunho', 'publicada', 'encerrada'], default: 'publicada' }
}, { timestamps: true });

module.exports = mongoose.model('Atividade', atividadeSchema);
