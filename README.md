# Luminia Backend

API REST do **Luminia**, uma plataforma educacional criada para apoiar professores e alunos com organização de conteúdos, acessibilidade e uma estrutura preparada para futuras integrações com IA pedagógica.

Este back-end é a base inicial do MVP para hackathon/Tech Challenge FIAP. A proposta é manter o projeto simples, funcional e fácil de evoluir.

## Tecnologias

- Node.js
- Express
- MongoDB
- Mongoose
- JWT
- bcrypt
- dotenv
- cors
- nodemon
- Docker e Docker Compose

## Como instalar

```bash
npm install
```

## Configurar variáveis de ambiente

Crie um arquivo `.env` a partir do exemplo:

```bash
cp .env.example .env
```

Variáveis esperadas:

```env
PORT=3000
MONGO_URI=mongodb://luminia:luminia123@localhost:27017/luminia_db?authSource=admin
JWT_SECRET=troque_este_segredo
JWT_EXPIRES_IN=1d
```

Para uso real, troque o `JWT_SECRET` por um valor seguro.

## Subir o MongoDB com Docker

```bash
docker compose up -d
```

O container será criado como `luminia-mongo`, usando a porta `27017` e volume persistente.

Para verificar:

```bash
docker ps
```

## Rodar a API

Ambiente de desenvolvimento:

```bash
npm run dev
```

Ambiente simples de execução:

```bash
npm start
```

A API ficará disponível em:

```txt
http://localhost:3000
```

## Rodar o seed

Com o MongoDB ativo e o `.env` configurado:

```bash
npm run seed
```

Usuários de teste criados:

| Perfil | Email | Senha |
| --- | --- | --- |
| Professor | professor@luminia.com | 123456 |
| Aluno | aluno@luminia.com | 123456 |

O seed também cria os perfis de aluno/professor e 2 posts de exemplo.

## Rotas principais

### Auth

```txt
POST /auth/register
POST /auth/login
GET /auth/me
```

Exemplo de login:

```json
{
  "email": "professor@luminia.com",
  "senha": "123456"
}
```

Use o token retornado no header:

```txt
Authorization: Bearer SEU_TOKEN
```

### Users

Rotas protegidas por JWT:

```txt
GET /users
GET /users/:id
```

### Alunos

Rotas protegidas por JWT:

```txt
GET /alunos
GET /alunos/:id
POST /alunos
PUT /alunos/:id
DELETE /alunos/:id
```

### Professores

Rotas protegidas por JWT:

```txt
GET /professores
GET /professores/:id
POST /professores
PUT /professores/:id
DELETE /professores/:id
```

### Posts

Listagem e visualização exigem JWT. Criação, edição e exclusão são permitidas apenas para professores.

```txt
GET /posts
GET /posts/:id
POST /posts
PUT /posts/:id
DELETE /posts/:id
```

Exemplo de criação de post como professor:

```json
{
  "titulo": "Introdução à acessibilidade digital",
  "conteudo": "Conteúdo de apoio para discussão em sala.",
  "disciplina": "Tecnologia",
  "tags": ["acessibilidade", "inclusao"],
  "visivelPara": "todos"
}
```

## Estrutura do projeto

```txt
src/
├── config/
│   └── database.js
├── controllers/
│   ├── alunoController.js
│   ├── authController.js
│   ├── postController.js
│   ├── professorController.js
│   └── userController.js
├── middlewares/
│   ├── authMiddleware.js
│   └── roleMiddleware.js
├── models/
│   ├── Aluno.js
│   ├── Post.js
│   ├── Professor.js
│   └── User.js
├── routes/
│   ├── alunoRoutes.js
│   ├── authRoutes.js
│   ├── postRoutes.js
│   ├── professorRoutes.js
│   └── userRoutes.js
├── seed/
│   └── seed.js
├── app.js
└── server.js
```

## Próximos passos

- Adicionar validações mais completas nos dados de entrada.
- Criar testes automatizados para autenticação e rotas principais.
- Definir permissões mais detalhadas para aluno e professor.
- Criar modelos futuros para atividades, feedback da IA e registros de interação com IA.
- Integrar a camada de IA pedagógica, como Gemini API, somente após consolidar os fluxos principais.
