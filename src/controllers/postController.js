const Post = require('../models/Post');

function filtroVisibilidade(role) {
  if (role === 'professor') {
    return { visivelPara: { $in: ['todos', 'professores'] } };
  }

  return { visivelPara: { $in: ['todos', 'alunos'] } };
}

async function listarPosts(req, res) {
  try {
    const posts = await Post.find(filtroVisibilidade(req.user.role))
      .populate('autor', 'nome email role')
      .sort({ createdAt: -1 });

    return res.json(posts);
  } catch (error) {
    return res.status(500).json({ mensagem: 'Erro ao listar posts.' });
  }
}

async function buscarPostPorId(req, res) {
  try {
    const post = await Post.findOne({
      _id: req.params.id,
      ...filtroVisibilidade(req.user.role)
    }).populate('autor', 'nome email role');

    if (!post) {
      return res.status(404).json({ mensagem: 'Post não encontrado.' });
    }

    return res.json(post);
  } catch (error) {
    return res.status(400).json({ mensagem: 'ID de post inválido.' });
  }
}

async function criarPost(req, res) {
  try {
    const post = await Post.create({
      ...req.body,
      autor: req.user._id
    });

    return res.status(201).json({
      mensagem: 'Post criado com sucesso.',
      post
    });
  } catch (error) {
    return res.status(400).json({ mensagem: 'Erro ao criar post.', erro: error.message });
  }
}

async function atualizarPost(req, res) {
  try {
    const post = await Post.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!post) {
      return res.status(404).json({ mensagem: 'Post não encontrado.' });
    }

    return res.json({
      mensagem: 'Post atualizado com sucesso.',
      post
    });
  } catch (error) {
    return res.status(400).json({ mensagem: 'Erro ao atualizar post.', erro: error.message });
  }
}

async function removerPost(req, res) {
  try {
    const post = await Post.findByIdAndDelete(req.params.id);

    if (!post) {
      return res.status(404).json({ mensagem: 'Post não encontrado.' });
    }

    return res.json({ mensagem: 'Post removido com sucesso.' });
  } catch (error) {
    return res.status(400).json({ mensagem: 'Erro ao remover post.', erro: error.message });
  }
}

module.exports = {
  listarPosts,
  buscarPostPorId,
  criarPost,
  atualizarPost,
  removerPost
};
