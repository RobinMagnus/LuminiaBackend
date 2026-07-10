# Contrato da API Luminia

Este documento descreve o contrato usado pelo backend e consumido pelo frontend. A API usa JSON e autenticação JWT nas rotas protegidas.

## Autenticação

Header obrigatório nas rotas protegidas:

```http
Authorization: Bearer TOKEN_JWT
```

Roles existentes:

- `aluno`
- `professor`

Não existe role `admin`.

## Formato de erro

Formato padrão:

```json
{
  "mensagem": "Descrição compreensível do erro."
}
```

Códigos usados:

- `400`: dados ou IDs inválidos;
- `401`: usuário não autenticado ou token inválido;
- `403`: usuário autenticado sem permissão;
- `404`: recurso não encontrado;
- `409`: conflito de dados;
- `500`: erro interno inesperado.

## Banco de dados e relacionamentos

Coleções principais:

- `USERS`
- `ALUNOS`
- `PROFESSORES`
- `POSTS`
- `COMENTARIOS`

Relacionamentos:

```text
USERS 1 ─── 0..1 ALUNOS
USERS 1 ─── 0..1 PROFESSORES
PROFESSORES/USERS 1 ─── N POSTS
USERS 1 ─── N COMENTARIOS
POSTS 1 ─── N COMENTARIOS
```

Observações:

- aluno e professor possuem um usuário associado;
- posts são criados por usuários com role `professor`;
- comentários podem ser criados por usuários com role `aluno` ou `professor`;
- autorização é controlada por JWT, role e propriedade do recurso.

## Comentário

Formato público retornado pela API:

```json
{
  "_id": "comentarioId",
  "postId": "postId",
  "conteudo": "Comentário do usuário",
  "autor": {
    "_id": "userId",
    "nome": "Nome do usuário",
    "role": "aluno"
  },
  "criadoEm": "2026-07-09T20:00:00.000Z",
  "atualizadoEm": "2026-07-09T20:00:00.000Z",
  "podeEditar": true,
  "podeExcluir": true
}
```

`podeEditar` e `podeExcluir` são calculados no backend.

## Listar comentários

```http
GET /posts/:postId/comentarios
```

Autenticação: JWT

Roles:

- `aluno`
- `professor`

Resposta `200`:

```json
{
  "dados": []
}
```

Erros principais:

- `400`: ID de post inválido;
- `401`: token ausente ou inválido;
- `404`: post não encontrado ou não visível para o perfil autenticado.

## Criar comentário

```http
POST /posts/:postId/comentarios
```

Autenticação: JWT

Roles:

- `aluno`
- `professor`

Body:

```json
{
  "conteudo": "Minha dúvida sobre o conteúdo."
}
```

Resposta `201`:

```json
{
  "mensagem": "Comentário criado com sucesso.",
  "dados": {}
}
```

Erros principais:

- `400`: ID inválido, conteúdo vazio ou conteúdo acima de 1000 caracteres;
- `401`: token ausente ou inválido;
- `404`: post não encontrado ou não visível para o perfil autenticado.

## Atualizar comentário

```http
PUT /comentarios/:id
```

Autenticação: JWT

Permissão:

- somente o autor original do comentário.

Body:

```json
{
  "conteudo": "Comentário atualizado."
}
```

Resposta `200`:

```json
{
  "mensagem": "Comentário atualizado com sucesso.",
  "dados": {}
}
```

Erros principais:

- `400`: ID inválido, conteúdo vazio ou conteúdo acima de 1000 caracteres;
- `401`: token ausente ou inválido;
- `403`: comentário pertence a outro usuário;
- `404`: comentário não encontrado.

## Excluir comentário

```http
DELETE /comentarios/:id
```

Autenticação: JWT

Permissão:

- autor do comentário; ou
- professor autor do post em que o comentário foi publicado.

Resposta `200`:

```json
{
  "mensagem": "Comentário excluído com sucesso."
}
```

Erros principais:

- `400`: ID inválido;
- `401`: token ausente ou inválido;
- `403`: usuário sem permissão para excluir;
- `404`: comentário ou post relacionado não encontrado.
