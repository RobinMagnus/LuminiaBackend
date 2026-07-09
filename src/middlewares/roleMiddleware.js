function roleMiddleware(...rolesPermitidas) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ mensagem: 'Usuário não autenticado.' });
    }

    if (!rolesPermitidas.includes(req.user.role)) {
      return res.status(403).json({ mensagem: 'Acesso não permitido para este perfil.' });
    }

    return next();
  };
}

module.exports = roleMiddleware;
