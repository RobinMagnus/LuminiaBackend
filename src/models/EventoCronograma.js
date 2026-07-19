const mongoose = require('mongoose');

const eventoCronogramaSchema = new mongoose.Schema({
  titulo: { type: String, required: true, trim: true },
  descricao: { type: String, trim: true, maxlength: 2000 },
  turma: { type: String, required: true, trim: true, index: true },
  disciplina: { type: String, trim: true },
  tipo: { type: String, enum: ['aula', 'atividade', 'prova', 'evento'], required: true },
  inicio: { type: Date, required: true, index: true },
  fim: { type: Date },
  professorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('EventoCronograma', eventoCronogramaSchema);
