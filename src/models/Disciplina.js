const mongoose = require('mongoose');

const disciplinaSchema = new mongoose.Schema({
  codigo: { type: String, required: true, unique: true, trim: true, uppercase: true },
  nome: { type: String, required: true, trim: true, index: true },
  descricao: { type: String, trim: true, default: '' },
  cargaHoraria: { type: Number, required: true, min: 1, max: 10000 },
  turmaIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Turma', required: true }],
  ativa: { type: Boolean, default: true, index: true },
  professorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }
}, { timestamps: true });

module.exports = mongoose.model('Disciplina', disciplinaSchema);
