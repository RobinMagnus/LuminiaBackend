const mongoose = require('mongoose');

const comentarioSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      index: true
    },
    autorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    conteudo: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 1000
    }
  },
  {
    timestamps: {
      createdAt: 'criadoEm',
      updatedAt: 'atualizadoEm'
    }
  }
);

comentarioSchema.index({ postId: 1, criadoEm: 1 });

module.exports = mongoose.model('Comentario', comentarioSchema);
