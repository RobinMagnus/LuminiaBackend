const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Aluno = require('../models/Aluno');
const Professor = require('../models/Professor');

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
  let user;
  let perfil;
  try {
    const { nome, email, senha, role, ...dadosPerfil } = req.validatedBody;

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(409).json({ mensagem: 'Email já cadastrado.' });
    }

    user = await User.create({ nome, email, senha, role });
    perfil = role === 'aluno'
      ? await Aluno.create({
        userId: user._id,
        nome,
        matricula: dadosPerfil.matricula || `ALU-${user._id.toString().toUpperCase()}`,
        turma: dadosPerfil.turma,
        dataNascimento: dadosPerfil.dataNascimento
      })
      : await Professor.create({
        userId: user._id,
        nome,
        dataNascimento: dadosPerfil.dataNascimento,
        materias: dadosPerfil.materias || [],
        turmas: dadosPerfil.turmas || []
      });
    const token = gerarToken(user);

    return res.status(201).json({
      mensagem: 'Usuário e perfil cadastrados com sucesso.',
      token,
      user: dadosBasicos(user),
      perfil
    });
  } catch (error) {
    if (perfil?._id) await perfil.deleteOne();
    if (user?._id) await User.findByIdAndDelete(user._id);
    if (error?.code === 11000) return res.status(409).json({ mensagem: 'Dados de usuário ou perfil já cadastrados.' });
    return res.status(500).json({ mensagem: 'Erro ao cadastrar usuário.' });
  }
}

async function login(req, res) {
  try {
    const { email, senha } = req.validatedBody;

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
