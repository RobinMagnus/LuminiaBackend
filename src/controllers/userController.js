const User = require('../models/User');

async function listarUsers(req, res) {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    return res.json(users);
  } catch (error) {
    return res.status(500).json({ mensagem: 'Erro ao listar usuários.' });
  }
}

async function buscarUserPorId(req, res) {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ mensagem: 'Usuário não encontrado.' });
    }

    return res.json(user);
  } catch (error) {
    return res.status(400).json({ mensagem: 'ID de usuário inválido.' });
  }
}

module.exports = {
  listarUsers,
  buscarUserPorId
};
