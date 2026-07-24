# Luminia Backend

API REST do **Luminia**, plataforma educacional criada para apoiar fluxos de professor e aluno com autenticação, cadastro de perfis e publicação de conteúdos.

Este backend faz parte de um MVP acadêmico/hackathon. O foco atual é fornecer uma base simples em Node.js, Express e MongoDB para autenticação JWT e consumo inicial pelo frontend.

> Observação: a pasta local deste repositório está nomeada como `LuminiaBack`.

## SUMÁRIO

1. [Apresentação](#1-apresentação)
2. [Tecnologias utilizadas](#2-tecnologias-utilizadas)
3. [Scripts disponíveis](#3-scripts-disponíveis)
4. [Fluxo de desenvolvimento](#4-fluxo-de-desenvolvimento)
5. [Instalação e configuração](#5-instalação-e-configuração)
6. [Execução da aplicação](#6-execução-da-aplicação)
7. [Autenticação e rotas](#7-autenticação-e-rotas)
8. [Exemplos de requisições](#8-exemplos-de-requisições)
9. [Testes e qualidade](#9-testes-e-qualidade)
10. [Estrutura do projeto](#10-estrutura-do-projeto)
11. [Integração e autorização](#11-integração-e-autorização)
12. [Mapeamento da implantação](#12-mapeamento-da-implantação)
13. [Limitações conhecidas](#13-limitações-conhecidas)
14. [Planejamento](#14-planejamento)
15. [Referências normativas](#15-referências-normativas)

## 1 APRESENTAÇÃO

Este documento registra os requisitos de execução, a organização técnica, os contratos principais e o estado de implantação do backend. Sua estrutura foi adaptada para Markdown com numeração progressiva de seções e organização lógica do conteúdo.

## 2 TECNOLOGIAS UTILIZADAS

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

## 3 SCRIPTS DISPONÍVEIS

Scripts reais definidos no `package.json`:

| Comando              | Descrição                                                                      |
| -------------------- | ------------------------------------------------------------------------------ |
| `npm start`          | Inicia a API com `node src/server.js`.                                         |
| `npm run dev`        | Inicia a API com `nodemon src/server.js`.                                      |
| `npm run seed`       | Sincroniza os dados iniciais sem apagar outros registros.                      |
| `npm run seed:reset` | Apaga todas as coleções da aplicação e recria os dados iniciais.               |
| `npm test`           | Executa testes com cobertura e exige mais de 90% em todas as métricas globais. |

## 4 FLUXO DE DESENVOLVIMENTO

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

## 5 INSTALAÇÃO E CONFIGURAÇÃO

### 5.1 Instalação das dependências

```bash
npm install
```

Para instalação reproduzível em CI, o projeto possui `package-lock.json` e usa:

```bash
npm ci
```

### 5.2 Configuração das variáveis de ambiente

Crie um arquivo `.env` a partir do exemplo:

```bash
cp .env.example .env
```

Variáveis documentadas em `.env.example`:

```env
PORT=3000
MONGO_PORT=27018
MONGO_URI=mongodb://luminia:luminia123@localhost:27018/luminia_db?authSource=admin
JWT_SECRET=troque_este_segredo
JWT_EXPIRES_IN=1d
FRONTEND_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173,http://localhost:5174
```

Para uso real, troque `JWT_SECRET` por um valor seguro. A variável `CORS_ORIGIN` aceita uma lista separada por vírgulas com as origens permitidas para o frontend. Quando `CORS_ORIGIN` não estiv[...]

### 5.3 Política de compartilhamento de recursos entre origens

O CORS é configurado em `src/app.js` por variável de ambiente:

- `CORS_ORIGIN`: lista de origens permitidas separadas por vírgula;
- `FRONTEND_URL`: origem única usada como fallback;
- fallback local: `http://localhost:5173,http://localhost:5174`.

A configuração permite o uso de `Authorization` e `Content-Type` em desenvolvimento local. Não há uso de cookies ou `credentials` nesta etapa; a sessão web usa Bearer Token.

### 5.4 Docker e MongoDB

O arquivo `docker-compose.yml` sobe um serviço MongoDB com a imagem `mongo:7`.

```bash
docker compose up -d
```

Configuração atual do container:

- Container: `luminia-mongo`
- Porta host padrão: `27018` (container interno `27017`)
- Usuário padrão: `luminia`
- Senha padrão: `luminia123`
- Banco inicial: `luminia_db`
- Volume persistente: `luminia_mongo_data`

As credenciais podem ser sobrescritas pelas variáveis `MONGO_ROOT_USERNAME`, `MONGO_ROOT_PASSWORD` e `MONGO_DATABASE`. A porta host pode ser alterada por `MONGO_PORT`.

Para verificar se o container está ativo:

```bash
docker ps
```

## 6 EXECUÇÃO DA APLICAÇÃO

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

### 6.1 Carga inicial de dados

Com o MongoDB ativo e o `.env` configurado:

```bash
npm run seed
```

O comando padrão é incremental e idempotente: cria ou atualiza as fixtures identificadas por chaves estáveis, não duplica registros em execuções repetidas e preserva os demais dados do banco.

Para limpar todas as coleções e recriar somente os dados iniciais, use deliberadamente:

```bash
npm run seed:reset
```

> Atenção: `seed:reset` é destrutivo e deve ser usado somente em ambientes locais ou bancos descartáveis.

Usuários criados:

| Perfil    | Email                   | Senha    |
| --------- | ----------------------- | -------- |
| Professor | `professor@luminia.com` | `123456` |
| Aluno     | `aluno@luminia.com`     | `123456` |

O seed também cria:

- um perfil de professor vinculado ao usuário professor;
- um perfil de aluno vinculado ao usuário aluno;
- dois posts de exemplo.
- dois comentários de exemplo, um criado pelo aluno e outro pelo professor.
- uma atividade com entrega corrigida;
- um registro de presença e um evento de cronograma.

## 7 AUTENTICAÇÃO E ROTAS

### 7.1 Autenticação JWT

O login retorna um token JWT. Rotas protegidas exigem o header:

```txt
Authorization: Bearer SEU_TOKEN
```

O token inclui o `id` do usuário e a `role` (`professor` ou `aluno`). O tempo de expiração usa `JWT_EXPIRES_IN`, com fallback para `1d`.

### 7.2 Rotas disponíveis

#### 7.2.1 Geral

| Método | Rota | Proteção | Descrição                     |
| ------ | ---- | -------- | ----------------------------- |
| `GET`  | `/`  | Pública  | Verifica se a API está ativa. |

#### 7.2.2 Autenticação

| Método | Rota             | Proteção | Descrição                                                                 |
| ------ | ---------------- | -------- | ------------------------------------------------------------------------- |
| `POST` | `/auth/register` | Pública  | Cria o usuário e o perfil correspondente à role na mesma operação lógica. |
| `POST` | `/auth/login`    | Pública  | Autentica usuário e retorna JWT.                                          |
| `GET`  | `/auth/me`       | JWT      | Retorna dados básicos do usuário autenticado.                             |

#### 7.2.3 Usuários

| Método | Rota         | Proteção | Descrição             |
| ------ | ------------ | -------- | --------------------- |
| `GET`  | `/users`     | JWT      | Lista usuários.       |
| `GET`  | `/users/:id` | JWT      | Busca usuário por ID. |

#### 7.2.4 Alunos

| Método   | Rota          | Proteção        | Descrição                                                                                               |
| -------- | ------------- | --------------- | ------------------------------------------------------------------------------------------------------- |
| `GET`    | `/alunos`     | JWT + professor | Lista perfis de alunos.                                                                                 |
| `GET`    | `/alunos/me`  | JWT + aluno     | Retorna o perfil do aluno autenticado.                                                                  |
| `GET`    | `/alunos/:id` | JWT             | Professor acessa qualquer perfil; aluno acessa somente o próprio.                                       |
| `POST`   | `/alunos`     | JWT + professor | Cria perfil de aluno.                                                                                   |
| `PUT`    | `/alunos/:id` | JWT             | Professor atualiza qualquer perfil; aluno atualiza somente `nome` e `dataNascimento` do próprio perfil. |
| `DELETE` | `/alunos/:id` | JWT + professor | Remove perfil de aluno.                                                                                 |

#### 7.2.5 Professores

| Método   | Rota               | Proteção                | Descrição                                       |
| -------- | ------------------ | ----------------------- | ----------------------------------------------- |
| `GET`    | `/professores`     | JWT                     | Lista perfis de professores.                    |
| `GET`    | `/professores/me`  | JWT + professor         | Retorna o perfil do professor autenticado.      |
| `GET`    | `/professores/:id` | JWT                     | Busca professor por ID.                         |
| `POST`   | `/professores`     | JWT + professor         | Cria perfil de professor.                       |
| `PUT`    | `/professores/:id` | JWT + professor próprio | Atualiza somente o próprio perfil de professor. |
| `DELETE` | `/professores/:id` | JWT + professor próprio | Remove somente o próprio perfil de professor.   |

#### 7.2.6 Turmas e disciplinas

As listagens são paginadas. Professores visualizam o catálogo completo; alunos visualizam somente a própria turma e as disciplinas ativas vinculadas a ela.

| Método | Rota | Proteção | Descrição |
| --- | --- | --- | --- |
| `GET` | `/turmas` | JWT | Lista turmas conforme a role. |
| `GET` | `/turmas/:id` | JWT | Consulta uma turma permitida. |
| `GET` | `/turmas/:id/alunos` | JWT + professor responsável | Lista os alunos vinculados à turma, com busca, ordenação e paginação. |
| `POST` | `/turmas` | JWT + professor | Cria uma turma. |
| `PUT` | `/turmas/:id` | JWT + professor responsável | Atualiza a turma própria. |
| `DELETE` | `/turmas/:id` | JWT + professor responsável | Remove turma sem alunos ou disciplinas vinculadas. |
| `GET` | `/disciplinas` | JWT | Lista disciplinas conforme a role. |
| `GET` | `/disciplinas/:id` | JWT | Consulta uma disciplina permitida. |
| `POST` | `/disciplinas` | JWT + professor | Cria uma disciplina vinculada a turmas existentes. |
| `PUT` | `/disciplinas/:id` | JWT + professor responsável | Atualiza a disciplina própria. |
| `DELETE` | `/disciplinas/:id` | JWT + professor responsável | Remove a disciplina própria. |

#### 7.2.7 Publicações

Todas as rotas de posts exigem JWT. Criação exige role `professor`; edição e remoção exigem role `professor` e autoria do post.

| Método   | Rota         | Proteção              | Descrição                                       |
| -------- | ------------ | --------------------- | ----------------------------------------------- |
| `GET`    | `/posts`     | JWT                   | Lista posts visíveis para a role do usuário.    |
| `GET`    | `/posts/:id` | JWT                   | Busca post visível por ID.                      |
| `POST`   | `/posts`     | JWT + professor       | Cria post.                                      |
| `PUT`    | `/posts/:id` | JWT + professor autor | Atualiza post próprio.                          |
| `DELETE` | `/posts/:id` | JWT + professor autor | Remove post próprio e comentários relacionados. |

Visibilidade de posts:

- `todos`: visível para alunos e professores;
- `alunos`: visível apenas para alunos;
- `professores`: visível apenas para professores.

#### 7.2.8 Comentários

Todas as rotas de comentários exigem JWT.

| Método   | Rota                         |   Aluno |                          Professor |
| -------- | ---------------------------- | ------: | ---------------------------------: |
| `GET`    | `/posts/:postId/comentarios` |     Sim |                                Sim |
| `POST`   | `/posts/:postId/comentarios` |     Sim |                                Sim |
| `PUT`    | `/comentarios/:id`           | Próprio |                            Próprio |
| `DELETE` | `/comentarios/:id`           | Próprio | Próprio ou comentários em seu post |

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

## 8 EXEMPLOS DE REQUISIÇÕES

### 8.1 Login

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

### 8.2 Usuário autenticado

```bash
curl http://localhost:3000/auth/me \
  -H "Authorization: Bearer TOKEN_JWT"
```

### 8.3 Listagem de publicações

```bash
curl http://localhost:3000/posts \
  -H "Authorization: Bearer TOKEN_JWT"
```

### 8.4 Criação de publicação pelo professor

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

### 8.5 Criação de comentário

```bash
curl -X POST http://localhost:3000/posts/POST_ID/comentarios \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN_JWT" \
  -d '{ "conteudo": "Minha dúvida sobre este conteúdo." }'
```

## 9 TESTES E QUALIDADE

```bash
npm test
```

A suíte usa Jest, Supertest e MongoDB Memory Server, sem depender do banco real. Os 79 testes atuais cobrem autenticação, criação integrada de perfis, seed incremental e reset explícito, autorização, posts, comentários e os fluxos acadêmicos de turmas, disciplinas, atividades, entregas, correções, presença, boletim e cronograma.

O comando `npm test` coleta a cobertura da aplicação e falha quando qualquer métrica global não supera 90%: statements, branches, functions ou lines. Na medição atual, todas estão acima do limite.

## 10 ESTRUTURA DO PROJETO

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
│   │   ├── academicoController.js
│   │   ├── catalogoAcademicoController.js
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
│   │   ├── Atividade.js
│   │   ├── Comentario.js
│   │   ├── Disciplina.js
│   │   ├── Post.js
│   │   ├── Professor.js
│   │   ├── Turma.js
│   │   └── User.js
│   ├── routes/
│   │   ├── alunoRoutes.js
│   │   ├── authRoutes.js
│   │   ├── comentarioRoutes.js
│   │   ├── postRoutes.js
│   │   ├── professorRoutes.js
│   │   ├── disciplinaRoutes.js
│   │   ├── turmaRoutes.js
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

## 11 INTEGRAÇÃO E AUTORIZAÇÃO

### 11.1 Estado da integração

- O backend já fornece autenticação real via `POST /auth/login` e sessão via `GET /auth/me`.
- O frontend consome `POST /auth/login`, salva o token JWT no `localStorage`, usa `GET /auth/me` para restaurar sessão e envia `Authorization: Bearer TOKEN` nas chamadas protegidas.
- O frontend consome `GET /posts`, `GET /posts/:id`, `POST /posts`, `PUT /posts/:id` e `DELETE /posts/:id` para conteúdos/posts reais.
- O frontend consome `GET /alunos/me` e `GET /professores/me` para perfis básicos reais.
- O frontend consome comentários reais com `GET /posts/:postId/comentarios`, `POST /posts/:postId/comentarios`, `PUT /comentarios/:id` e `DELETE /comentarios/:id`.
- O CORS está configurável por `CORS_ORIGIN` e, por padrão, permite `http://localhost:5173` e `http://localhost:5174`.
- Um único workflow de CI publica os checks `build`, `test` e `api`, controla os merges automáticos e evita execuções duplicadas para `main` e `develop`.
- Os testes com MongoDB em memória possuem uma janela de inicialização explícita para evitar falhas intermitentes em ambientes de CI mais lentos.
- O fluxo `develop` → `main` possui criação/reutilização automática de PR e habilitação de auto-merge após o atendimento das proteções configuradas no GitHub.

### 11.2 Matriz de autorização

| Ação                           | Aluno | Professor         |
| ------------------------------ | ----- | ----------------- |
| Realizar login                 | Sim   | Sim               |
| Restaurar sessão em `/auth/me` | Sim   | Sim               |
| Visualizar posts               | Sim   | Sim               |
| Criar post                     | Não   | Sim               |
| Editar post autorizado         | Não   | Sim, se for autor |
| Excluir post autorizado        | Não   | Sim, se for autor |
| Visualizar próprio perfil      | Sim   | Sim               |
| Comentar em post visível       | Sim   | Sim               |

## 12 MAPEAMENTO DA IMPLANTAÇÃO

Os estados utilizados neste mapeamento são:

- **Implantado**: disponível no backend, validado por testes automatizados e documentado;
- **Parcialmente implantado**: possui base funcional, mas ainda depende de integração, normalização ou configuração externa;
- **Não implantado**: não possui implementação funcional no backend.

| Área                                | Estado                  | Evidência e escopo atual                                                                                                              |
| ----------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| API Express e persistência MongoDB  | Implantado              | Organização em rotas, controladores, modelos e middlewares, com conexão por Mongoose.                                                 |
| Autenticação e autorização          | Implantado              | Registro integrado ao perfil, login, restauração de sessão, JWT, bcrypt, roles e regras de propriedade.                               |
| Perfis de alunos e professores      | Implantado              | Criação junto ao usuário, consulta e manutenção conforme a role autenticada.                                                          |
| Publicações e comentários           | Implantado              | CRUD, visibilidade, autoria, comentários e exclusões relacionadas.                                                                    |
| Paginação, filtros e validação      | Implantado              | Queries paginadas, filtros combináveis e erros estruturados por campo.                                                                |
| Turmas e disciplinas                | Implantado              | Catálogo, filtros, vínculos, propriedade, visibilidade do aluno e proteção de exclusão.                                               |
| Atividades, entregas e correções    | Implantado              | Atividades por turma, entrega única, nota, feedback e autorização por autoria.                                                        |
| Presença, boletim e cronograma      | Implantado              | Registro e consulta conforme aluno, professor, turma e disciplina.                                                                    |
| Seed de desenvolvimento             | Implantado              | Sincronização incremental e idempotente por padrão; limpeza disponível apenas por `seed:reset` explícito.                             |
| Testes e cobertura                  | Implantado              | 79 testes e limite global superior a 90% para statements, branches, functions e lines.                                                |
| Integração acadêmica com o frontend | Parcialmente implantado | Os endpoints existem, porém as telas acadêmicas do frontend ainda utilizam dados simulados.                                           |
| Normalização de turma e disciplina  | Parcialmente implantado | `Disciplina` referencia `Turma`; modelos anteriores ainda mantêm alguns campos de turma e disciplina como texto para compatibilidade. |
| Automação de integração contínua    | Parcialmente implantado | O workflow está configurado, mas auto-merge, proteções de branch e `AUTO_MERGE_TOKEN` dependem das configurações do GitHub.           |
| Inteligência artificial             | Não implantado          | Não há provedor, geração de feedback pedagógico ou testes de integração com IA.                                                       |

## 13 LIMITAÇÕES CONHECIDAS

- O cadastro integrado utiliza compensação: se o perfil não puder ser criado, o usuário recém-criado é removido. Transações MongoDB completas exigiriam um replica set.
- `npm run seed:reset` continua sendo uma operação destrutiva por definição e deve ser restrita a bancos locais ou descartáveis.
- A suíte automatizada cobre os principais fluxos, validações e regras de autorização dos recursos implementados, mantendo todas as métricas globais acima de 90%; integrações de IA ainda dependerão de testes próprios quando forem adicionadas.
- Recursos relacionados a IA ainda não existem no backend; qualquer menção a IA no produto atual é estrutural ou simulada no frontend.

## 14 PLANEJAMENTO

| Ordem | Atividade                                                                          | Situação  |
| ----: | ---------------------------------------------------------------------------------- | --------- |
|     1 | Ampliar testes de autenticação, autorização, publicações e perfis                  | Concluída |
|     2 | Ampliar os testes de comentários                                                   | Concluída |
|     3 | Criar turmas e disciplinas                                                         | Concluída |
|     4 | Criar atividades e entregas                                                        | Concluída |
|     5 | Criar correções, presença e boletim                                                | Concluída |
|     6 | Integrar as telas acadêmicas do frontend aos endpoints existentes                  | Pendente  |
|     7 | Migrar campos textuais legados para referências normalizadas de turma e disciplina | Pendente  |
|     8 | Integrar inteligência artificial após a consolidação dos fluxos principais         | Pendente  |

## 15 REFERÊNCIAS NORMATIVAS

ASSOCIAÇÃO BRASILEIRA DE NORMAS TÉCNICAS. **ABNT NBR 6024:2012: informação e documentação — numeração progressiva das seções de um documento — apresentação**. Rio de Janeiro: ABNT, 2012.

ASSOCIAÇÃO BRASILEIRA DE NORMAS TÉCNICAS. **ABNT NBR 6027:2012: informação e documentação — sumário — apresentação**. Rio de Janeiro: ABNT, 2012.

ASSOCIAÇÃO BRASILEIRA DE NORMAS TÉCNICAS. **ABNT NBR 14724:2024: informação e documentação — trabalhos acadêmicos — apresentação**. Rio de Janeiro: ABNT, 2024.

> Nota: este README é um documento técnico em Markdown. Por isso, aplica a organização, a hierarquia e a numeração progressiva das normas citadas, mas não reproduz requisitos gráficos próprios de documentos paginados, como margens, fonte, espaçamento e folha de rosto.
