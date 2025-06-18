const mongoose = require('mongoose');

// Modelo de Usuário
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    balance: { type: Number, default: 0.00 },
    avatar: { 
        url: { type: String, default: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg' },
        public_id: { type: String }
    },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isBlocked: { type: Boolean, default: false },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
}, { timestamps: true });

// Modelo de Transação (Depósito/Levantamento)
const transactionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['deposit', 'withdrawal'], required: true },
    method: { type: String, enum: ['M-Pesa', 'e-Mola'], required: true },
    amount: { type: Number, required: true },
    phoneNumber: { type: String, required: true }, // Número de onde veio o dinheiro (depósito) ou para onde vai (levantamento)
    status: { type: String, enum: ['pending', 'approved', 'denied'], default: 'pending' },
    adminNotes: { type: String }, // Notas do admin ao aprovar/negar
}, { timestamps: true });

// Modelo do Jogo de Damas
const gameSchema = new mongoose.Schema({
    gameCode: { type: String, required: true, unique: true },
    players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    // Board: 0 = empty, 1 = player1 peon, 2 = player2 peon, 11 = player1 dama, 22 = player2 dama
    boardState: { type: [[Number]], required: true },
    currentPlayer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    betAmount: { type: Number, required: true, default: 0 },
    status: { type: String, enum: ['waiting', 'active', 'finished', 'draw'], default: 'waiting' },
    winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    moveHistory: [{
        from: { r: Number, c: Number },
        to: { r: Number, c: Number },
        piece: Number,
        captured: [{ piece: Number, position: { r: Number, c: Number } }]
    }],
}, { timestamps: true });

// Modelo de Configurações da Plataforma
const settingsSchema = new mongoose.Schema({
    // Usaremos um único documento para todas as configurações
    singleton: { type: String, default: 'main_settings', unique: true },
    maxBet: { type: Number, default: 10000 },
    minDeposit: { type: Number, default: 50 },
    maxDeposit: { type: Number, default: 25000 },
    minWithdrawal: { type: Number, default: 100 },
    mpesaNumber: { type: String, default: '840000000' }, // Número da empresa para receber depósitos
    emolaNumber: { type: String, default: '860000000' },
});

const User = mongoose.model('User', userSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);
const Game = mongoose.model('Game', gameSchema);
const Settings = mongoose.model('Settings', settingsSchema);

module.exports = { User, Transaction, Game, Settings };