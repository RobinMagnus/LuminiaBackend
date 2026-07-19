const mongoose = require('mongoose');

const correcaoSchema = new mongoose.Schema({
  entregaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Entrega', required: true, unique: true },
  professorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  nota: { type: Number, required: true, min: 0, max: 10 },
  feedback: { type: String, required: true, trim: true, maxlength: 5000 },
  corrigidoEm: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Correcao', correcaoSchema);
