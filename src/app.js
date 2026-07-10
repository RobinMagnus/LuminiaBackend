const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const alunoRoutes = require('./routes/alunoRoutes');
const professorRoutes = require('./routes/professorRoutes');
const postRoutes = require('./routes/postRoutes');
const comentarioRoutes = require('./routes/comentarioRoutes');

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Origem não permitida pelo CORS.'));
  }
}));
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    mensagem: 'API Luminia em funcionamento.',
    versao: '1.0.0'
  });
});

app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/alunos', alunoRoutes);
app.use('/professores', professorRoutes);
app.use('/posts', postRoutes);
app.use('/comentarios', comentarioRoutes);

app.use((req, res) => {
  res.status(404).json({ mensagem: 'Rota não encontrada.' });
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(error.status || 500).json({
    mensagem: error.message || 'Erro interno do servidor.'
  });
});

module.exports = app;
