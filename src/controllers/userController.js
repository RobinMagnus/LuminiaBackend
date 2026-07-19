const User = require('../models/User');
const { criarPaginacao, escaparRegex } = require('../utils/pagination');

async function listarUsers(req, res) {
  try {
    const { pagina, limite, ordenarPor, ordem, busca, role, ativo } = req.validatedQuery;
    const filtro = {};
    if (busca) {
      const regex = new RegExp(escaparRegex(busca), 'i');
      filtro.$or = [{ nome: regex }, { email: regex }];
    }
    if (role) filtro.role = role;
    if (ativo !== undefined) filtro.ativo = ativo === 'true';

    const [users, total] = await Promise.all([
      User.find(filtro)
        .sort({ [ordenarPor]: ordem === 'asc' ? 1 : -1 })
        .skip((pagina - 1) * limite)
        .limit(limite),
      User.countDocuments(filtro)
    ]);
    return res.json({
      dados: users,
      paginacao: criarPaginacao({ pagina, limite, total, quantidade: users.length })
    });
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
