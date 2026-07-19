# Luminia Backend

API REST do **Luminia**, plataforma educacional criada para apoiar fluxos de professor e aluno com autenticação, cadastro de perfis e publicação de conteúdos.

Este backend faz parte de um MVP acadêmico/hackathon. O foco atual é fornecer uma base simples em Node.js, Express e MongoDB para autenticação JWT e consumo inicial pelo frontend.

> Observação: a pasta local deste repositório está nomeada como `LuminiaBack`.

## Tecnologias usadas

- Node.js
- Express
- MongoDB
- Mongoose
- JSON Web Token (`jsonwebtoken`)
- bcrypt
- dotenv
- cors
- nodemon
- Docker e Docker Compose
- GitHub Actions para CI

## Scripts disponíveis

Scripts reais definidos no `package.json`:

| Comando | Descrição |
| --- | --- |
| `npm start` | Inicia a API com `node src/server.js`. |
| `npm run dev` | Inicia a API com `nodemon src/server.js`. |
| `npm run seed` | Limpa e recria dados iniciais no MongoDB. |
| `npm test` | Executa testes com Jest, Supertest e MongoDB Memory Server. |

## Instalação

```bash
npm install
```

Para instalação reproduzível em CI, o projeto possui `package-lock.json` e usa:

```bash
npm ci
```

## Configuração do `.env`

Crie um arquivo `.env` a partir do exemplo:

```bash
cp .env.example .env
```

Variáveis documentadas em `.env.example`:

```env
PORT=3000
MONGO_URI=mongodb://luminia:luminia123@localhost:27017/luminia_db?authSource=admin
JWT_SECRET=troque_este_segredo
JWT_EXPIRES_IN=1d
FRONTEND_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173,http://localhost:5174
```

Para uso real, troque `JWT_SECRET` por um valor seguro. A variável `CORS_ORIGIN` aceita uma lista separada por vírgulas com as origens permitidas para o frontend. Quando `CORS_ORIGIN` não estiv[...]

## CORS

O CORS é configurado em `src/app.js` por variável de ambiente:

- `CORS_ORIGIN`: lista de origens permitidas separadas por vírgula;
- `FRONTEND_URL`: origem única usada como fallback;
- fallback local: `http://localhost:5173,http://localhost:5174`.

A configuração permite o uso de `Authorization` e `Content-Type` em desenvolvimento local. Não há uso de cookies ou `credentials` nesta etapa; a sessão web usa Bearer Token.

## Docker e MongoDB

O arquivo `docker-compose.yml` sobe um serviço MongoDB com a imagem `mongo:7`.

```bash
docker compose up -d
```

Configuração atual do container:

- Container: `luminia-mongo`
- Porta: `27017`
- Usuário padrão: `luminia`
- Senha padrão: `luminia123`
- Banco inicial: `luminia_db`
- Volume persistente: `luminia_mongo_data`

As credenciais podem ser sobrescritas pelas variáveis `MONGO_ROOT_USERNAME`, `MONGO_ROOT_PASSWORD` e `MONGO_DATABASE`.

Para verificar se o container está ativo:

```bash
docker ps
```

## Executando a API

Com o MongoDB ativo e o `.env` configurado:

```bash
npm run dev
```

ou:

```bash
npm start
```

A API fica disponível em:

```txt
http://localhost:3000
```

Rota pública de verificação:

```bash
curl http://localhost:3000
```

Resposta esperada:

```json
{
  "mensagem": "API Luminia em funcionamento.",
  "versao": "1.0.0"
}
```

## Seed

Com o MongoDB ativo e o `.env` configurado:

```bash
npm run seed
```

O seed apaga dados existentes de `Post`, `Aluno`, `Professor` e `User`, e recria dados mínimos para teste.

Usuários criados:

| Perfil | Email | Senha |
| --- | --- | --- |
| Professor | `professor@luminia.com` | `123456` |
| Aluno | `aluno@luminia.com` | `123456` |

O seed também cria:

- um perfil de professor vinculado ao usuário professor;
- um perfil de aluno vinculado ao usuário aluno;
- dois posts de exemplo.
- dois comentários de exemplo, um criado pelo aluno e outro pelo professor.

## Autenticação JWT

O login retorna um token JWT. Rotas protegidas exigem o header:

```txt
Authorization: Bearer SEU_TOKEN
```

O token inclui o `id` do usuário e a `role` (`professor` ou `aluno`). O tempo de expiração usa `JWT_EXPIRES_IN`, com fallback para `1d`.

## Rotas disponíveis

### Geral

| Método | Rota | Proteção | Descrição |
| --- | --- | --- | --- |
| `GET` | `/` | Pública | Verifica se a API está ativa. |

### Auth

| Método | Rota | Proteção | Descrição |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | Pública | Cria usuário com role `aluno` ou `professor`. |
| `POST` | `/auth/login` | Pública | Autentica usuário e retorna JWT. |
| `GET` | `/auth/me` | JWT | Retorna dados básicos do usuário autenticado. |

### Users

| Método | Rota | Proteção | Descrição |
| --- | --- | --- | --- |
| `GET` | `/users` | JWT | Lista usuários. |
| `GET` | `/users/:id` | JWT | Busca usuário por ID. |

### Alunos

| Método | Rota | Proteção | Descrição |
| --- | --- | --- | --- |
| `GET` | `/alunos` | JWT + professor | Lista perfis de alunos. |
| `GET` | `/alunos/me` | JWT + aluno | Retorna o perfil do aluno autenticado. |
| `GET` | `/alunos/:id` | JWT | Professor acessa qualquer perfil; aluno acessa somente o próprio. |
| `POST` | `/alunos` | JWT + professor | Cria perfil de aluno. |
| `PUT` | `/alunos/:id` | JWT | Professor atualiza qualquer perfil; aluno atualiza somente `nome` e `dataNascimento` do próprio perfil. |
| `DELETE` | `/alunos/:id` | JWT + professor | Remove perfil de aluno. |

### Professores

| Método | Rota | Proteção | Descrição |
| --- | --- | --- | --- |
| `GET` | `/professores` | JWT | Lista perfis de professores. |
| `GET` | `/professores/me` | JWT + professor | Retorna o perfil do professor autenticado. |
| `GET` | `/professores/:id` | JWT | Busca professor por ID. |
| `POST` | `/professores` | JWT + professor | Cria perfil de professor. |
| `PUT` | `/professores/:id` | JWT + professor próprio | Atualiza somente o próprio perfil de professor. |
| `DELETE` | `/professores/:id` | JWT + professor próprio | Remove somente o próprio perfil de professor. |

### Posts

Todas as rotas de posts exigem JWT. Criação exige role `professor`; edição e remoção exigem role `professor` e autoria do post.

| Método | Rota | Proteção | Descrição |
| --- | --- | --- | --- |
| `GET` | `/posts` | JWT | Lista posts visíveis para a role do usuário. |
| `GET` | `/posts/:id` | JWT | Busca post visível por ID. |
| `POST` | `/posts` | JWT + professor | Cria post. |
| `PUT` | `/posts/:id` | JWT + professor autor | Atualiza post próprio. |
| `DELETE` | `/posts/:id` | JWT + professor autor | Remove post próprio e comentários relacionados. |

Visibilidade de posts:

- `todos`: visível para alunos e professores;
- `alunos`: visível apenas para alunos;
- `professores`: visível apenas para professores.

### Comentários

Todas as rotas de comentários exigem JWT.

| Método | Rota | Aluno | Professor |
| --- | --- | ---: | ---: |
| `GET` | `/posts/:postId/comentarios` | Sim | Sim |
| `POST` | `/posts/:postId/comentarios` | Sim | Sim |
| `PUT` | `/comentarios/:id` | Próprio | Próprio |
| `DELETE` | `/comentarios/:id` | Próprio | Próprio ou comentários em seu post |

Modelo público de comentário:

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

`podeEditar` e `podeExcluir` são calculados pelo backend. O frontend não precisa reproduzir regras de propriedade.

## Exemplos de requests

### Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"professor@luminia.com","senha":"123456"}'
```

Respost... (truncated)
