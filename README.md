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
| `npm test` | Executa testes com cobertura e exige mais de 90% em todas as métricas globais. |

## Fluxo de branching

- Atualize `develop` e crie uma branch com o padrão `feature/nome-da-feature`:

```bash
git switch develop
git pull origin develop
git switch -c feature/nome-da-feature
```

- Após concluir a alteração, envie a feature:

```bash
git push -u origin feature/nome-da-feature
```

- O push em `feature/**` executa os checks `build`, `test` e `api` uma única vez.
- Quando os checks passarem, o workflow cria ou reutiliza automaticamente o Pull Request da feature para `develop` e habilita o auto-merge.
- O push resultante em `develop` executa uma única validação e, se ela passar, cria ou reutiliza o Pull Request para `main` e habilita seu auto-merge.
- O Pull Request de release solicita automaticamente a revisão de `@RobinMagnus`; o merge aguarda a aprovação e as proteções da `main`.
- A branch `main` deve exigir os checks `build` e `test` e uma aprovação de `@RobinMagnus`.
- O arquivo `.github/CODEOWNERS` define `@RobinMagnus` como responsável pelo código.
- Os jobs de merge usam o secret `AUTO_MERGE_TOKEN`, que deve conter um Personal Access Token com acesso ao repositório e permissão para criar e gerenciar Pull Requests e workflows.
- Cadastre o token em **Settings → Secrets and variables → Actions** com o nome exato `AUTO_MERGE_TOKEN`. Nunca registre o valor do token no repositório.

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
- uma atividade com entrega corrigida;
- um registro de presença e um evento de cronograma.

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

## Testes

```bash
npm test
```

A suíte usa Jest, Supertest e MongoDB Memory Server, sem depender do banco real. Os 61 testes atuais cobrem autenticação, autorização, perfis, posts, comentários e os fluxos acadêmicos de atividades, entregas, correções, presença, boletim e cronograma.

O comando `npm test` coleta a cobertura da aplicação e falha quando qualquer métrica global não supera 90%: statements, branches, functions ou lines. Na medição atual, todas estão acima do limite.

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
│   │   ├── roleMiddleware.js
│   │   └── validationMiddleware.js
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
│   ├── utils/
│   │   └── pagination.js
│   ├── app.js
│   │   └── server.js
├── docker-compose.yml
├── docs/
│   └── API_CONTRACT.md
├── jest.config.js
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
- Um único workflow de CI publica os checks `build`, `test` e `api`, controla os merges automáticos e evita execuções duplicadas para `main` e `develop`.
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
- Paginação padronizada nas listagens de usuários, alunos, professores, posts e comentários.
- Filtros combináveis de busca, perfil, turma, matéria, disciplina, tag, autoria e visibilidade, conforme o recurso.
- Validação centralizada de bodies e queries com erros estruturados por campo.
- Cobertura automatizada global acima de 90%, protegida por limite mínimo no Jest.
- Filtro de visibilidade para posts conforme role do usuário.
- Autorização refinada por role e propriedade nas rotas de alunos e professores.
- CORS configurável.
- Workflow de CI para backend.
- Atividades com autoria, turma, disciplina, prazo e status.
- Entregas únicas por aluno e atividade, com acesso restrito à turma.
- Correções com nota e feedback vinculadas à entrega.
- Registro de presença, boletim completo e cronograma por turma.

Ainda não implementado:

- Feedback pedagógico gerado por IA.
- Integração com provedores de IA.

## Limitações conhecidas

- `POST /auth/register` cria apenas o usuário; perfis de aluno/professor são criados em rotas separadas ou pelo seed.
- O seed apaga dados existentes antes de recriar os dados iniciais.
- A suíte automatizada cobre autenticação, sessão, posts e comentários, mas ainda não cobre todos os cenários do MVP.
- Recursos relacionados a IA ainda não existem no backend; qualquer menção a IA no produto atual é estrutural ou simulada no frontend.

## Próximos passos

1. ~~Ampliar testes automatizados para autenticação, autorização, posts e perfis.~~ Concluído.
2. ~~Ampliar e endurecer testes dos comentários já implementados.~~ Concluído.
3. Criar turmas e disciplinas.
4. ~~Criar atividades e entregas.~~ Concluído.
5. ~~Criar correções, presença e boletim.~~ Concluído.
6. Integrar IA por último, após consolidar os fluxos principais.
