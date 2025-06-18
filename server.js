require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes');
const { Settings } = require('./models');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middlewares ---
app.use(cors()); // Permite requisições de diferentes origens
app.use(express.json()); // Para parsear o corpo das requisições JSON
app.use(express.urlencoded({ extended: true }));

// --- Servir arquivos estáticos (Frontend) ---
app.use(express.static(path.join(__dirname, 'public')));

// --- Conexão com o MongoDB Atlas ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('Conectado ao MongoDB Atlas com sucesso!');
        // Garante que as configurações padrão sejam criadas na inicialização
        Settings.findOne({ singleton: 'main_settings' }).then(settings => {
            if (!settings) {
                new Settings().save().then(() => console.log('Configurações padrão da plataforma criadas.'));
            }
        });
    })
    .catch(err => console.error('Erro ao conectar ao MongoDB:', err));

// --- Rotas da API ---
app.use('/api', apiRoutes);

// --- Rota principal para o Frontend ---
// Se nenhuma rota da API corresponder, serve o index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Iniciar o Servidor ---
app.listen(PORT, () => {
    console.log(`Servidor BrainSkill rodando na porta ${PORT}`);
    console.log(`Acesse o frontend em http://localhost:${PORT}`);
});