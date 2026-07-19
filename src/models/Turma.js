const mongoose = require('mongoose');

const turmaSchema = new mongoose.Schema({
  codigo: { type: String, required: true, unique: true, trim: true, uppercase: true },
  nome: { type: String, required: true, trim: true },
  anoLetivo: { type: Number, required: true, min: 2000, max: 2100 },
  turno: { type: String, required: true, enum: ['manha', 'tarde', 'noite', 'integral'] },
  descricao: { type: String, trim: true, default: '' },
  ativa: { type: Boolean, default: true, index: true },
  professorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }
}, { timestamps: true });

module.exports = mongoose.model('Turma', turmaSchema);
