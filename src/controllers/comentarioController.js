const mongoose = require('mongoose');
const Comentario = require('../models/Comentario');
const Post = require('../models/Post');
const { criarPaginacao } = require('../utils/pagination');

function validarObjectId(id) {
  return mongoose.isValidObjectId(id);
}

function isMesmoUsuario(idA, idB) {
  return idA.toString() === idB.toString();
}

function isProfessorAutorDoPost(usuario, post) {
  return Boolean(post) && usuario.role === 'professor' && isMesmoUsuario(post.autor, usuario._id);
}

function filtroVisibilidadePost(role) {
  if (role === 'professor') {
    return { visivelPara: { $in: ['todos', 'professores'] } };
  }

  return { visivelPara: { $in: ['todos', 'alunos'] } };
}

function formatarComentario(comentario, usuarioAutenticado, post) {
  const autorId = comentario.autorId?._id || comentario.autorId;
  const podeEditar = isMesmoUsuario(autorId, usuarioAutenticado._id);
  const podeExcluir = podeEditar || isProfessorAutorDoPost(usuarioAutenticado, post);

  return {
    _id: comentario._id,
    postId: comentario.postId,
    conteudo: comentario.conteudo,
    autor: {
      _id: autorId,
      nome: comentario.autorId?.nome,
      role: comentario.autorId?.role
    },
    criadoEm: comentario.criadoEm,
    atualizadoEm: comentario.atualizadoEm,
    podeEditar,
    podeExcluir
  };
}

async function buscarPostValido(postId, usuario, res) {
  if (!validarObjectId(postId)) {
    res.status(400).json({ mensagem: 'ID de post inválido.' });
    return null;
  }

  const post = await Post.findOne({
    _id: postId,
    ...filtroVisibilidadePost(usuario.role)
  });

  if (!post) {
    res.status(404).json({ mensagem: 'Post não encontrado.' });
    return null;
  }

  return post;
}

async function listarComentarios(req, res) {
  try {
    const post = await buscarPostValido(req.params.postId, req.user, res);

    if (!post) {
      return null;
    }

    const { pagina, limite, ordem } = req.validatedQuery;
    const filtro = { postId: post._id };
    const [comentarios, total] = await Promise.all([
      Comentario.find(filtro)
        .populate('autorId', 'nome role')
        .sort({ criadoEm: ordem === 'asc' ? 1 : -1 })
        .skip((pagina - 1) * limite)
        .limit(limite),
      Comentario.countDocuments(filtro)
    ]);

    return res.json({
      dados: comentarios.map(comentario => formatarComentario(comentario, req.user, post)),
      paginacao: criarPaginacao({ pagina, limite, total, quantidade: comentarios.length })
    });
  } catch (error) {
    return res.status(500).json({ mensagem: 'Erro ao listar comentários.' });
  }
}

async function criarComentario(req, res) {
  try {
    const post = await buscarPostValido(req.params.postId, req.user, res);

    if (!post) {
      return null;
    }

    const { conteudo } = req.validatedBody;

    const comentario = await Comentario.create({
      postId: post._id,
      autorId: req.user._id,
      conteudo
    });

    await comentario.populate('autorId', 'nome role');

    return res.status(201).json({
      mensagem: 'Comentário criado com sucesso.',
      dados: formatarComentario(comentario, req.user, post)
    });
  } catch (error) {
    return res.status(500).json({ mensagem: 'Erro ao criar comentário.' });
  }
}

async function atualizarComentario(req, res) {
  try {
    if (!validarObjectId(req.params.id)) {
      return res.status(400).json({ mensagem: 'ID de comentário inválido.' });
    }

    const comentario = await Comentario.findById(req.params.id);

    if (!comentario) {
      return res.status(404).json({ mensagem: 'Comentário não encontrado.' });
    }

    if (!isMesmoUsuario(comentario.autorId, req.user._id)) {
      return res.status(403).json({ mensagem: 'Você não possui permissão para editar este comentário.' });
    }

    const { conteudo } = req.validatedBody;

    comentario.conteudo = conteudo;
    await comentario.save();
    await comentario.populate('autorId', 'nome role');

    const post = await Post.findById(comentario.postId);

    return res.json({
      mensagem: 'Comentário atualizado com sucesso.',
      dados: formatarComentario(comentario, req.user, post)
    });
  } catch (error) {
    return res.status(500).json({ mensagem: 'Erro ao atualizar comentário.' });
  }
}

async function removerComentario(req, res) {
  try {
    if (!validarObjectId(req.params.id)) {
      return res.status(400).json({ mensagem: 'ID de comentário inválido.' });
    }

    const comentario = await Comentario.findById(req.params.id);

    if (!comentario) {
      return res.status(404).json({ mensagem: 'Comentário não encontrado.' });
    }

    const post = await Post.findById(comentario.postId);

    if (!post) {
      return res.status(404).json({ mensagem: 'Post não encontrado.' });
    }

    const podeExcluir = isMesmoUsuario(comentario.autorId, req.user._id) || isProfessorAutorDoPost(req.user, post);

    if (!podeExcluir) {
      return res.status(403).json({ mensagem: 'Você não possui permissão para excluir este comentário.' });
    }

    await Comentario.findByIdAndDelete(comentario._id);

    return res.json({ mensagem: 'Comentário excluído com sucesso.' });
  } catch (error) {
    return res.status(500).json({ mensagem: 'Erro ao excluir comentário.' });
  }
}

module.exports = {
  listarComentarios,
  criarComentario,
  atualizarComentario,
  removerComentario,
  formatarComentario
};
