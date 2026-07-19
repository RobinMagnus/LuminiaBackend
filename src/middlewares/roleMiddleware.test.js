const roleMiddleware = require('./roleMiddleware');

function criarResponse() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('roleMiddleware', () => {
  test('rejeita requisição sem usuário autenticado', () => {
    const req = {};
    const res = criarResponse();
    const next = jest.fn();

    roleMiddleware('professor')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ mensagem: 'Usuário não autenticado.' });
    expect(next).not.toHaveBeenCalled();
  });

  test('rejeita role não permitida e libera role permitida', () => {
    const resNegado = criarResponse();
    const nextNegado = jest.fn();
    roleMiddleware('professor')({ user: { role: 'aluno' } }, resNegado, nextNegado);

    const resPermitido = criarResponse();
    const nextPermitido = jest.fn();
    roleMiddleware('professor')({ user: { role: 'professor' } }, resPermitido, nextPermitido);

    expect(resNegado.status).toHaveBeenCalledWith(403);
    expect(nextNegado).not.toHaveBeenCalled();
    expect(nextPermitido).toHaveBeenCalledTimes(1);
    expect(resPermitido.status).not.toHaveBeenCalled();
  });
});
