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

## Fluxo de branching

- Crie branches `feature/*` a partir de `develop`.
- Abra o Pull Request da feature para `develop`.
- Cada push em `develop` cria ou reutiliza um Pull Request de `develop` para `main` e habilita o auto-merge.
- A branch `main` deve exigir os checks `build` e `test` e uma aprovação de `@RobinMagnus`.
- O arquivo `.github/CODEOWNERS` define `@RobinMagnus` como responsável pelo código.
- O workflow usa `GITHUB_TOKEN` por padrão e aceita o secret `AUTO_MERGE_TOKEN` como alternativa quando forem necessárias permissões adicionais.

Para usar o fallback, crie o secret `AUTO_MERGE_TOKEN` nas configurações de Actions do repositório. Nunca registre o token no código ou no histórico do Git.

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

Resposta esperada:

```json
{
  "mensagem": "Login realizado com sucesso.",
  "token": "TOKEN_JWT",
  "user": {
    "id": "ID_DO_USUARIO",
    "nome": "Professor Teste",
    "email": "professor@luminia.com",
    "role": "professor",
    "ativo": true
  }
}
```

### Usuário autenticado

```bash
curl http://localhost:3000/auth/me \
  -H "Authorization: Bearer TOKEN_JWT"
```

### Listar posts

```bash
curl http://localhost:3000/posts \
  -H "Authorization: Bearer TOKEN_JWT"
```

### Criar post como professor

```bash
curl -X POST http://localhost:3000/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN_JWT" \
  -d '{
    "titulo": "Introdução à acessibilidade digital",
    "conteudo": "Conteúdo de apoio para discussão em sala.",
    "disciplina": "Tecnologia",
    "tags": ["acessibilidade", "inclusao"],
    "visivelPara": "todos"
  }'
```

### Criar comentário

```bash
curl -X POST http://localhost:3000/posts/POST_ID/comentarios \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN_JWT" \
  -d '{ "conteudo": "Minha dúvida sobre este conteúdo." }'
```

Respo... (truncated for brevity)

## Testes

```bash
npm test
```

A suíte atual usa Jest, Supertest e MongoDB Memory Server, sem depender do banco real. Ela cobre os principais cenários de comentários: autenticação, criação, listagem, edição, exclusão[...]

## Estrutura de pastas

```txt
.
├── .github/
│   └── workflows/
│       └── backend-ci.yml
├── src/
│   ├── config/
│   │   └── database.js
│   ├── controllers/
│   │   ├── alunoController.js
│   │   ├── authController.js
│   │   ├── comentarioController.js
│   │   ├── postController.js
│   │   ├── professorController.js
│   │   └── userController.js
│   ├── middlewares/
│   │   ├── authMiddleware.js
│   │   └── roleMiddleware.js
│   ├── models/
│   │   ├── Aluno.js
│   │   ├── Comentario.js
│   │   ├── Post.js
│   │   ├── Professor.js
│   │   └── User.js
│   ├── routes/
│   │   ├── alunoRoutes.js
│   │   ├── authRoutes.js
│   │   ├── comentarioRoutes.js
│   │   ├── postRoutes.js
│   │   ├── professorRoutes.js
│   │   └── userRoutes.js
│   ├── seed/
│   │   └── seed.js
│   ├── app.js
│   │   └── server.js
├── docker-compose.yml
├── docs/
│   └── API_CONTRACT.md
├── package.json
├── package-lock.json
└── README.md
```

## Status da integração

- O backend já fornece autenticação real via `POST /auth/login` e sessão via `GET /auth/me`.
- O frontend consome `POST /auth/login`, salva o token JWT no `localStorage`, usa `GET /auth/me` para restaurar sessão e envia `Authorization: Bearer TOKEN` nas chamadas protegidas.
- O frontend consome `GET /posts`, `GET /posts/:id`, `POST /posts`, `PUT /posts/:id` e `DELETE /posts/:id` para conteúdos/posts reais.
- O frontend consome `GET /alunos/me` e `GET /professores/me` para perfis básicos reais.
- O frontend consome comentários reais com `GET /posts/:postId/comentarios`, `POST /posts/:postId/comentarios`, `PUT /comentarios/:id` e `DELETE /comentarios/:id`.
- O CORS está configurável por `CORS_ORIGIN` e, por padrão, permite `http://localhost:5173` e `http://localhost:5174`.
- O CI do backend publica os checks `build`, `test` e `api`. Ele valida a sintaxe JavaScript, executa a suíte automatizada e testa a API com MongoDB em service container.
- Os testes com MongoDB em memória possuem uma janela de inicialização explícita para evitar falhas intermitentes em ambientes de CI mais lentos.
- O fluxo `develop` → `main` possui criação/reutilização automática de PR e habilitação de auto-merge após o atendimento das proteções configuradas no GitHub.

## Matriz de autorização

| Ação | Aluno | Professor |
| --- | --- | --- |
| Realizar login | Sim | Sim |
| Restaurar sessão em `/auth/me` | Sim | Sim |
| Visualizar posts | Sim | Sim |
| Criar post | Não | Sim |
| Editar post autorizado | Não | Sim, se for autor |
| Excluir post autorizado | Não | Sim, se for autor |
| Visualizar próprio perfil | Sim | Sim |
| Comentar em post visível | Sim | Sim |

## Status atual

Implementado:

- API Express com organização por rotas, controllers, models e middlewares.
- Conexão com MongoDB via Mongoose.
- Autenticação JWT com senha criptografada por bcrypt.
- Models de `User`, `Aluno`, `Professor` e `Post`.
- Model de `Comentario` relacionado a `Post` e `User`.
- Seed com usuários de teste, perfis e posts.
- Seed com comentários de aluno e professor.
- CRUD básico para alunos, professores e posts.
- Edição e exclusão de posts restritas ao professor autor.
- Rotas de comentários com autorização por propriedade.
- Filtro de visibilidade para posts conforme role do usuário.
- Autorização refinada por role e propriedade nas rotas de alunos e professores.
- CORS configurável.
- Workflow de CI para backend.

Ainda não implementado:

- Modelos reais de atividades, entregas, correções, presença, boletim detalhado, cronograma ou feedback de IA.
- Integração com provedores de IA.
- Paginação, filtros avançados e validação centralizada de entrada.

## Limitações conhecidas

- As rotas de `alunos` e `professores` já possuem regras por role/propriedade, mas a cobertura automatizada ainda pode ser ampliada.
- `POST /auth/register` cria apenas o usuário; perfis de aluno/professor são criados em rotas separadas ou pelo seed.
- O seed apaga dados existentes antes de recriar os dados iniciais.
- A suíte automatizada cobre autenticação, sessão, posts e comentários, mas ainda não cobre todos os cenários do MVP.
- Comentários não possuem paginação; a listagem retorna todos os comentários do post em ordem cronológica.
- Não existem endpoints específicos para atividades, envio de respostas, correções, presença, boletim completo ou cronograma.
- Recursos relacionados a IA ainda não existem no backend; qualquer menção a IA no produto atual é estrutural ou simulada no frontend.

## Próximos passos

1. ~~Ampliar testes automatizados para autenticação, autorização, posts e perfis.~~ Concluído.
2. Ampliar e endurecer testes dos comentários já implementados.
3. Criar turmas e disciplinas.
4. Criar atividades e entregas.
5. Criar correções, presença e boletim.
6. Integrar IA por último, após consolidar os fluxos principais.

## Fluxo de branching e contribuições

- Foi criada a branch `develop`: https://github.com/RobinMagnus/LuminiaBackend/tree/develop

- Fluxo recomendado para contribuições e features:
  1. Crie sua branch a partir de `develop` com o prefixo `feature`, por exemplo: `feature/minha-nova-funcionalidade`.
  2. Trabalhe e faça commits na sua branch `feature/*`.
  3. Abra um Pull Request da sua branch `feature/*` para `develop`.
  4. Quando a feature estiver testada e integrada em `develop`, abra um Pull Request de `develop` para `main` para a release.

- Regra para a branch `main` (recomendada): proteger a branch para impedir merges diretos até que todos os checks e aprovações sejam atendidos. Recomenda-se exigir os checks `build` e `test` e 1 aprovação antes de permitir merge.

- Como aplicar a proteção (via interface):
  1. Vá em Settings → Branches → Add rule.
  2. Em Branch name pattern use `main`.
  3. Marque "Require pull request reviews before merging" (requer 1 aprovação).
  4. Marque "Require status checks to pass before merging" e selecione os checks `build` e `test`.
  5. Marque "Require branches to be up to date before merging" (opcional).
  6. Marque "Include administrators" se quiser que administradores também sigam a regra.
  7. Salve a regra.

- Como aplicar a proteção (via API):

```bash
# Substitua OWNER, REPO e GITHUB_TOKEN
curl -X PUT \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer GITHUB_TOKEN" \
  https://api.github.com/repos/OWNER/REPO/branches/main/protection \
  -d '{
    "required_status_checks": {
      "strict": true,
      "contexts": ["build","test"]
    },
    "enforce_admins": true,
    "required_pull_request_reviews": {
      "dismiss_stale_reviews": false,
      "require_code_owner_reviews": false,
      "required_approving_review_count": 1
    },
    "restrictions": null
  }'
```

Observações importantes:
- O token usado no comando acima precisa do escopo `repo` (para repositórios privados) ou `public_repo` (para públicos) e permissão para administrar branch protection.
- Se você prefere que apenas usuários específicos possam dar merge, altere o campo `restrictions` via API para limitar quem pode push/merge.

## Notas finais

- Criei a branch `develop` para você.
- Atualizei este README com o fluxo de branching recomendado e instruções para proteger `main` exigindo `build` e `test` e 1 aprovação.

Se quiser, eu posso:
- Executar o comando API para aplicar a proteção automaticamente (preciso que você me forneça um token com permissão `repo` ou me autorize a usar credenciais — se preferir, eu mando o comando pronto para você executar localmente).
- Criar um arquivo `.github/CODEOWNERS` para garantir que suas aprovações sejam solicitadas automaticamente (posso criar um entry apontando para `@RobinMagnus`).

