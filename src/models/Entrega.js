const mongoose = require('mongoose');

const entregaSchema = new mongoose.Schema({
  atividadeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Atividade', required: true, index: true },
  alunoId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  resposta: { type: String, required: true, trim: true, maxlength: 20000 },
  status: { type: String, enum: ['entregue', 'corrigida'], default: 'entregue' },
  entregueEm: { type: Date, default: Date.now }
}, { timestamps: true });

entregaSchema.index({ atividadeId: 1, alunoId: 1 }, { unique: true });

module.exports = mongoose.model('Entrega', entregaSchema);
