function criarPaginacao({ pagina, limite, total, quantidade }) {
  return {
    pagina,
    limite,
    total,
    itens: quantidade,
    totalPaginas: total === 0 ? 0 : Math.ceil(total / limite)
  };
}

function escaparRegex(valor) {
  return valor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { criarPaginacao, escaparRegex };
