const mongoose = require('mongoose');

const presencaSchema = new mongoose.Schema({
  alunoId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  professorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  turma: { type: String, required: true, trim: true, index: true },
  disciplina: { type: String, required: true, trim: true },
  data: { type: Date, required: true, index: true },
  presente: { type: Boolean, required: true },
  observacao: { type: String, trim: true, maxlength: 500 }
}, { timestamps: true });

presencaSchema.index({ alunoId: 1, disciplina: 1, data: 1 }, { unique: true });

module.exports = mongoose.model('Presenca', presencaSchema);
