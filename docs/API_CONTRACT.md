# Contrato da API Luminia

Este documento descreve o contrato usado pelo backend e consumido pelo frontend. A API usa JSON e autenticação JWT nas rotas protegidas.

## SUMÁRIO

1. [Autenticação](#1-autenticação)
2. [Formato de erro](#2-formato-de-erro)
3. [Paginação e ordenação](#3-paginação-e-ordenação)
4. [Banco de dados e relacionamentos](#4-banco-de-dados-e-relacionamentos)
5. [Comentário](#5-comentário)
6. [Perfis autenticados](#6-perfis-autenticados)
7. [Publicações](#7-publicações)
8. [Listagem de comentários](#8-listagem-de-comentários)
9. [Criação de comentário](#9-criação-de-comentário)
10. [Atualização de comentário](#10-atualização-de-comentário)
11. [Exclusão de comentário](#11-exclusão-de-comentário)
12. [Domínio acadêmico](#12-domínio-acadêmico)

## 1 AUTENTICAÇÃO

Header obrigatório nas rotas protegidas:

```http
Authorization: Bearer TOKEN_JWT
```

Roles existentes:

- `aluno`
- `professor`

Não existe role `admin`.

### 1.1 Cadastro integrado

```http
POST /auth/register
```

O cadastro cria o usuário e o perfil correspondente à role. Se a criação do perfil falhar, o usuário recém-criado é removido para evitar um cadastro incompleto.

Campos comuns obrigatórios:

```json
{
  "nome": "Nome do usuário",
  "email": "usuario@luminia.com",
  "senha": "123456",
  "role": "aluno"
}
```

Para `aluno`, são aceitos opcionalmente `matricula`, `turma` e `dataNascimento`. Quando `matricula` não é enviada, a API gera um identificador único com base no ID do usuário.

Para `professor`, são aceitos opcionalmente `materias`, `turmas` e `dataNascimento`.

Resposta `201`:

```json
{
  "mensagem": "Usuário e perfil cadastrados com sucesso.",
  "token": "TOKEN_JWT",
  "user": {},
  "perfil": {}
}
```

Erros principais:

- `400`: campos inválidos;
- `409`: email, matrícula ou outro dado único já cadastrado;
- `500`: falha inesperada durante o cadastro.

### 1.2 Login e sessão

```http
POST /auth/login
GET /auth/me
```

## 2 FORMATO DE ERRO

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

Erros de validação retornam detalhes por campo:

```json
{
  "mensagem": "Dados inválidos.",
  "erros": [
    { "campo": "limite", "mensagem": "limite deve estar entre 1 e 100." }
  ]
}
```

## 3 PAGINAÇÃO E ORDENAÇÃO

As listagens usam os parâmetros `pagina` e `limite`. O limite padrão é `20` e o máximo é `100`. `ordem` aceita `asc` ou `desc`; os valores aceitos em `ordenarPor` dependem do recurso.

Formato padrão da resposta:

```json
{
  "dados": [],
  "paginacao": {
    "pagina": 1,
    "limite": 20,
    "total": 0,
    "itens": 0,
    "totalPaginas": 0
  }
}
```

Listagens e filtros disponíveis:

| Rota | Filtros | Ordenação permitida |
| --- | --- | --- |
| `GET /posts` | `busca`, `disciplina`, `tag`, `autor`, `visivelPara` | `createdAt`, `titulo`, `disciplina` |
| `GET /posts/:postId/comentarios` | — | `criadoEm` |
| `GET /users` | `busca`, `role`, `ativo` | `createdAt`, `nome`, `email` |
| `GET /alunos` | `busca`, `turma` | `createdAt`, `nome`, `matricula` |
| `GET /professores` | `busca`, `materia`, `turma` | `createdAt`, `nome` |
| `GET /turmas` | `busca`, `turno`, `anoLetivo`, `ativa` | `createdAt`, `codigo`, `nome`, `anoLetivo` |
| `GET /disciplinas` | `busca`, `turmaId`, `ativa` | `createdAt`, `codigo`, `nome`, `cargaHoraria` |

Os filtros de posts nunca ampliam a visibilidade definida pela role autenticada.

## 4 BANCO DE DADOS E RELACIONAMENTOS

Coleções principais:

- `USERS`
- `ALUNOS`
- `PROFESSORES`
- `POSTS`
- `COMENTARIOS`
- `TURMAS`
- `DISCIPLINAS`

Relacionamentos:

```text
USERS 1 ─── 0..1 ALUNOS
USERS 1 ─── 0..1 PROFESSORES
PROFESSORES/USERS 1 ─── N POSTS
USERS 1 ─── N COMENTARIOS
POSTS 1 ─── N COMENTARIOS
USERS/PROFESSORES 1 ─── N TURMAS
USERS/PROFESSORES 1 ─── N DISCIPLINAS
TURMAS N ─── N DISCIPLINAS
```

Observações:

- aluno e professor possuem um usuário associado;
- posts são criados por usuários com role `professor`;
- comentários podem ser criados por usuários com role `aluno` ou `professor`;
- autorização é controlada por JWT, role e propriedade do recurso.

## 5 COMENTÁRIO

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

## 6 PERFIS AUTENTICADOS

```http
GET /alunos/me
GET /professores/me
```

Autenticação: JWT

Roles:

- `/alunos/me`: `aluno`
- `/professores/me`: `professor`

Resposta `200`: documento do perfil vinculado ao usuário autenticado, com `userId` populado com `nome`, `email`, `role` e `ativo`.

Erros principais:

- `401`: token ausente ou inválido;
- `403`: role incompatível;
- `404`: perfil ainda não cadastrado.

## 7 PUBLICAÇÕES

```http
GET /posts
GET /posts/:id
POST /posts
PUT /posts/:id
DELETE /posts/:id
```

Autenticação: JWT

Regras:

- `aluno` e `professor` podem listar e visualizar posts visíveis para sua role;
- somente `professor` cria posts;
- somente o professor autor edita ou exclui o próprio post;
- o frontend nunca envia `autor`; o backend define autoria pelo JWT;
- excluir um post remove seus comentários relacionados.

Body de criação/edição:

```json
{
  "titulo": "Título",
  "conteudo": "Conteúdo",
  "disciplina": "Tecnologia",
  "tags": ["tag"],
  "visivelPara": "todos"
}
```

Resposta de `GET /posts`: envelope paginado no formato descrito acima. Os filtros podem ser combinados.

## 8 LISTAGEM DE COMENTÁRIOS

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
  "dados": [],
  "paginacao": {
    "pagina": 1,
    "limite": 20,
    "total": 0,
    "itens": 0,
    "totalPaginas": 0
  }
}
```

Erros principais:

- `400`: ID de post inválido;
- `401`: token ausente ou inválido;
- `404`: post não encontrado ou não visível para o perfil autenticado.

## 9 CRIAÇÃO DE COMENTÁRIO

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

## 10 ATUALIZAÇÃO DE COMENTÁRIO

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

## 11 EXCLUSÃO DE COMENTÁRIO

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

## 12 DOMÍNIO ACADÊMICO

Todas as rotas exigem JWT e usam validação centralizada. Listagens retornam `{ dados, paginacao }`.

### 12.1 Turmas

| Método | Rota | Permissão |
| --- | --- | --- |
| `GET` | `/turmas` | Professor lista o catálogo; aluno lista somente a turma do próprio perfil |
| `GET` | `/turmas/:id` | Professor ou aluno pertencente à turma |
| `POST` | `/turmas` | Professor |
| `PUT` | `/turmas/:id` | Professor responsável |
| `DELETE` | `/turmas/:id` | Professor responsável, se não houver alunos ou disciplinas vinculadas |

Body de criação:

```json
{
  "codigo": "1A",
  "nome": "Turma 1A",
  "anoLetivo": 2027,
  "turno": "manha",
  "descricao": "Turma do período matutino.",
  "ativa": true
}
```

`codigo` é único e normalizado para letras maiúsculas. `turno` aceita `manha`, `tarde`, `noite` ou `integral`.

### 12.2 Disciplinas

| Método | Rota | Permissão |
| --- | --- | --- |
| `GET` | `/disciplinas` | Professor lista o catálogo; aluno lista somente disciplinas ativas da própria turma |
| `GET` | `/disciplinas/:id` | Professor ou aluno de turma vinculada à disciplina ativa |
| `POST` | `/disciplinas` | Professor |
| `PUT` | `/disciplinas/:id` | Professor responsável |
| `DELETE` | `/disciplinas/:id` | Professor responsável |

Body de criação:

```json
{
  "codigo": "MAT",
  "nome": "Matemática",
  "descricao": "Fundamentos e resolução de problemas.",
  "cargaHoraria": 80,
  "turmaIds": ["ID_DA_TURMA"],
  "ativa": true
}
```

Todas as IDs de `turmaIds` devem apontar para turmas existentes. IDs repetidas são normalizadas para um único vínculo.

### 12.3 Atividades e entregas

| Método | Rota | Permissão |
| --- | --- | --- |
| `GET` | `/atividades` | Professor vê as próprias; aluno vê as publicadas da própria turma |
| `GET` | `/atividades/:id` | Usuário com acesso à atividade |
| `POST` | `/atividades` | Professor |
| `PUT` | `/atividades/:id` | Professor autor |
| `DELETE` | `/atividades/:id` | Professor autor |
| `POST` | `/atividades/:atividadeId/entregas` | Aluno da turma, uma entrega por atividade |
| `GET` | `/atividades/:atividadeId/entregas` | Professor autor |
| `GET` | `/entregas/me` | Aluno autenticado |

Excluir uma atividade também remove suas entregas e correções.

### 12.4 Correções

| Método | Rota | Permissão |
| --- | --- | --- |
| `PUT` | `/entregas/:entregaId/correcao` | Professor autor da atividade |
| `GET` | `/entregas/:entregaId/correcao` | Aluno autor da entrega ou professor autenticado |

A nota aceita valores de `0` a `10`. Uma nova correção da mesma entrega atualiza a correção existente.

### 12.5 Presença

| Método | Rota | Permissão |
| --- | --- | --- |
| `GET` | `/presencas` | Aluno vê as próprias; professor pode filtrar `turma` e `disciplina` |
| `POST` | `/presencas` | Professor |

O mesmo aluno, disciplina e data identificam um único registro, que pode ser atualizado por novo envio.

### 12.6 Boletim

| Método | Rota | Permissão |
| --- | --- | --- |
| `GET` | `/boletins/me` | Aluno autenticado |
| `GET` | `/boletins/alunos/:alunoId` | Professor |
| `POST` | `/boletins/alunos/:alunoId/notas` | Professor |

### 12.7 Cronograma

| Método | Rota | Permissão |
| --- | --- | --- |
| `GET` | `/cronograma` | Aluno vê a própria turma; professor vê os próprios eventos |
| `POST` | `/cronograma` | Professor |
| `PUT` | `/cronograma/:id` | Professor autor |
| `DELETE` | `/cronograma/:id` | Professor autor |

Tipos de evento: `aula`, `atividade`, `prova` e `evento`.
