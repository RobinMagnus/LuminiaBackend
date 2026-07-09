const jwt = require('jsonwebtoken');
const User = require('../models/User');

function gerarToken(user) {
  return jwt.sign(
    {
      id: user._id,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
}

function dadosBasicos(user) {
  return {
    id: user._id,
    nome: user.nome,
    email: user.email,
    role: user.role,
    ativo: user.ativo
  };
}

async function register(req, res) {
  try {
    const { nome, email, senha, role } = req.body;

    if (!nome || !email || !senha || !role) {
      return res.status(400).json({ mensagem: 'Nome, email, senha e role são obrigatórios.' });
    }

    if (!['aluno', 'professor'].includes(role)) {
      return res.status(400).json({ mensagem: 'Role deve ser aluno ou professor.' });
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(409).json({ mensagem: 'Email já cadastrado.' });
    }

    const user = await User.create({ nome, email, senha, role });
    const token = gerarToken(user);

    return res.status(201).json({
      mensagem: 'Usuário cadastrado com sucesso.',
      token,
      user: dadosBasicos(user)
    });
  } catch (error) {
    return res.status(500).json({ mensagem: 'Erro ao cadastrar usuário.' });
  }
}

async function login(req, res) {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ mensagem: 'Email e senha são obrigatórios.' });
    }

    const user = await User.findOne({ email }).select('+senha');

    if (!user || !user.ativo) {
      return res.status(401).json({ mensagem: 'Credenciais inválidas.' });
    }

    const senhaValida = await user.compararSenha(senha);

    if (!senhaValida) {
      return res.status(401).json({ mensagem: 'Credenciais inválidas.' });
    }

    const token = gerarToken(user);

    return res.json({
      mensagem: 'Login realizado com sucesso.',
      token,
      user: dadosBasicos(user)
    });
  } catch (error) {
    return res.status(500).json({ mensagem: 'Erro ao realizar login.' });
  }
}

async function me(req, res) {
  return res.json({
    user: dadosBasicos(req.user)
  });
}

module.exports = {
  register,
  login,
  me
};
