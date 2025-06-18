const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { User, Transaction, Game, Settings } = require('./models');

// --- LÓGICA DO JOGO DE DAMAS (REGRAS BRASILEIRAS) ---
// Esta é uma implementação simplificada. A lógica completa de "captura máxima" é complexa.
const CheckersLogic = {
    // Valida um movimento, incluindo capturas
    validateMove: (board, player, from, to) => {
        // ... (Implementação detalhada da lógica de validação)
        // 1. Verificar se a peça pertence ao jogador
        // 2. Verificar se o movimento é diagonal
        // 3. Verificar se é um movimento de captura ou um movimento simples
        // 4. Implementar regra de captura obrigatória
        // 5. Implementar promoção para Dama
        // 6. Validar movimentos da Dama
        // Esta função seria muito extensa. Vamos focar na estrutura da API.
        // O frontend terá uma lógica similar para UX, mas o backend DEVE validar.
        console.log("Validando movimento no backend...");
        return { isValid: true, capturedPieces: [] }; // Simulação
    },

    // Verifica se o jogo terminou
    checkWinCondition: (board, currentPlayerId) => {
        // ... (Verificar se o oponente não tem peças ou movimentos)
        console.log("Verificando condição de vitória...");
        return null; // ou o ID do vencedor
    },

    // Cria o tabuleiro inicial
    createInitialBoard: () => {
        const board = Array(8).fill(0).map(() => Array(8).fill(0));
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 8; c++) {
                if ((r + c) % 2 !== 0) board[r][c] = 2; // Peças do Jogador 2 (topo)
            }
        }
        for (let r = 5; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if ((r + c) % 2 !== 0) board[r][c] = 1; // Peças do Jogador 1 (base)
            }
        }
        return board;
    }
};

// --- MIDDLEWARE ---
exports.auth = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Acesso negado. Nenhum token fornecido.' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (ex) {
        res.status(400).json({ message: 'Token inválido.' });
    }
};

exports.admin = async (req, res, next) => {
    const user = await User.findById(req.user.id);
    if (user.role !== 'admin') return res.status(403).json({ message: 'Acesso negado. Requer privilégios de administrador.' });
    next();
};

// --- CONTROLLERS DE USUÁRIO E AUTENTICAÇÃO ---
exports.register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ message: 'Usuário já existe.' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = new User({ username, email, password: hashedPassword });
        await user.save();
        res.status(201).json({ message: 'Usuário registrado com sucesso.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro no servidor', error: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'Credenciais inválidas.' });
        if (user.isBlocked) return res.status(403).json({ message: 'Esta conta foi bloqueada.' });
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Credenciais inválidas.' });
        
        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user._id, username: user.username, role: user.role, balance: user.balance, avatar: user.avatar.url } });
    } catch (error) {
        res.status(500).json({ message: 'Erro no servidor', error: error.message });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { username } = req.body;
        const updateData = { username };

        if (req.file) {
            updateData.avatar = {
                url: req.file.path,
                public_id: req.file.filename
            };
            // Lógica para deletar avatar antigo no Cloudinary (opcional)
        }

        const user = await User.findByIdAndUpdate(req.user.id, updateData, { new: true }).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Erro no servidor', error: error.message });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar perfil.' });
    }
};

// --- RECUPERAÇÃO DE SENHA ---
const sendEmail = async (options) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail', // ou outro provedor
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #4CAF50; text-align: center;">BrainSkill - Recuperação de Senha</h2>
          <p>Olá,</p>
          <p>Você solicitou a recuperação de sua senha. Use o código abaixo para criar uma nova senha:</p>
          <div style="text-align: center; margin: 25px 0;">
            <span style="font-size: 24px; font-weight: bold; background-color: #f2f2f2; padding: 10px 20px; border-radius: 5px; letter-spacing: 3px;">
              ${options.code}
            </span>
          </div>
          <p>Este código é válido por 10 minutos.</p>
          <p>Se você não solicitou esta alteração, por favor, ignore este email.</p>
          <hr style="border: 0; border-top: 1px solid #eee;">
          <p style="font-size: 12px; color: #777; text-align: center;">© 2024 BrainSkill. Todos os direitos reservados.</p>
        </div>
      </div>
    `;

    const mailOptions = {
        from: `BrainSkill <${process.env.EMAIL_USER}>`,
        to: options.email,
        subject: options.subject,
        html: emailHtml,
    };

    await transporter.sendMail(mailOptions);
};

exports.forgotPassword = async (req, res) => {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(404).json({ message: 'Nenhum usuário encontrado com este email.' });
    
    const resetToken = crypto.randomBytes(3).toString('hex').toUpperCase(); // Código de 6 caracteres
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutos
    
    await user.save();
    
    try {
        await sendEmail({
            email: user.email,
            subject: 'Código de Recuperação de Senha - BrainSkill',
            code: resetToken,
        });
        res.status(200).json({ message: 'Email com código de recuperação enviado.' });
    } catch (err) {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        res.status(500).json({ message: 'Erro ao enviar o email.' });
    }
};

exports.resetPassword = async (req, res) => {
    const hashedToken = crypto.createHash('sha256').update(req.body.token).digest('hex');
    const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ message: 'Código inválido ou expirado.' });
    
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(req.body.password, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: 'Senha alterada com sucesso.' });
};

// --- CONTROLLERS DE TRANSAÇÕES (SALDO) ---
exports.requestDeposit = async (req, res) => {
    try {
        const { amount, method, phoneNumber } = req.body;
        const settings = await Settings.findOne();
        if (amount < settings.minDeposit || amount > settings.maxDeposit) {
            return res.status(400).json({ message: `Valor do depósito deve estar entre ${settings.minDeposit} e ${settings.maxDeposit} MT.`});
        }

        const deposit = new Transaction({ user: req.user.id, amount, method, phoneNumber, type: 'deposit' });
        await deposit.save();

        res.status(201).json({ 
            message: 'Pedido de depósito recebido. Aguardando aprovação do admin.',
            deposit,
            paymentDetails: {
                mpesa: settings.mpesaNumber,
                emola: settings.emolaNumber
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Erro no servidor', error: error.message });
    }
};

exports.requestWithdrawal = async (req, res) => {
    try {
        const { amount, method, phoneNumber } = req.body;
        const user = await User.findById(req.user.id);
        const settings = await Settings.findOne();

        if (amount > user.balance) {
            return res.status(400).json({ message: 'Saldo insuficiente.' });
        }
        if (amount < settings.minWithdrawal) {
            return res.status(400).json({ message: `O valor mínimo para levantamento é ${settings.minWithdrawal} MT.`});
        }

        user.balance -= amount; // Debita o saldo imediatamente para evitar gastos duplos
        await user.save();

        const withdrawal = new Transaction({ user: req.user.id, amount, method, phoneNumber, type: 'withdrawal' });
        await withdrawal.save();

        res.status(201).json({ message: 'Pedido de levantamento recebido. Aguardando aprovação do admin.', withdrawal });
    } catch (error) {
        // Se der erro, devolve o saldo ao usuário
        const user = await User.findById(req.user.id);
        user.balance += req.body.amount;
        await user.save();
        res.status(500).json({ message: 'Erro no servidor', error: error.message });
    }
};

exports.getTransactionHistory = async (req, res) => {
    try {
        const transactions = await Transaction.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: 'Erro no servidor', error: error.message });
    }
};


// --- CONTROLLERS DO JOGO ---
exports.createGame = async (req, res) => {
    try {
        const { betAmount } = req.body;
        const settings = await Settings.findOne();
        if (betAmount > settings.maxBet) {
            return res.status(400).json({ message: `A aposta máxima é ${settings.maxBet} MT.` });
        }

        const user = await User.findById(req.user.id);
        if (user.balance < betAmount) {
            return res.status(400).json({ message: 'Saldo insuficiente para esta aposta.' });
        }

        const gameCode = crypto.randomBytes(3).toString('hex').toUpperCase();
        const initialBoard = CheckersLogic.createInitialBoard();
        const game = new Game({
            gameCode,
            players: [req.user.id],
            boardState: initialBoard,
            betAmount,
            status: 'waiting'
        });
        await game.save();
        res.status(201).json(game);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao criar partida', error: error.message });
    }
};

exports.joinGame = async (req, res) => {
    try {
        const { gameCode } = req.body;
        const game = await Game.findOne({ gameCode });

        if (!game) return res.status(404).json({ message: 'Partida não encontrada.' });
        if (game.status !== 'waiting') return res.status(400).json({ message: 'Esta partida já começou ou foi encerrada.' });
        if (game.players.length >= 2) return res.status(400).json({ message: 'Esta partida já está cheia.' });
        if (game.players[0].toString() === req.user.id) return res.status(400).json({ message: 'Você não pode jogar contra si mesmo.' });

        const player2 = await User.findById(req.user.id);
        if (player2.balance < game.betAmount) {
            return res.status(400).json({ message: 'Saldo insuficiente para esta aposta.' });
        }

        // Debitar o saldo de ambos os jogadores
        const player1 = await User.findById(game.players[0]);
        player1.balance -= game.betAmount;
        player2.balance -= game.betAmount;
        
        await player1.save();
        await player2.save();

        game.players.push(req.user.id);
        game.status = 'active';
        game.currentPlayer = game.players[0]; // Jogador 1 (criador) começa
        await game.save();
        
        // AQUI seria o local ideal para emitir um evento WebSocket para os jogadores
        res.json(game);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao entrar na partida', error: error.message });
    }
};

exports.makeMove = async (req, res) => {
    try {
        const { gameId } = req.params;
        const { from, to } = req.body; // from: { r, c }, to: { r, c }
        const game = await Game.findById(gameId);

        if (!game) return res.status(404).json({ message: 'Partida não encontrada.' });
        if (game.status !== 'active') return res.status(400).json({ message: 'Partida não está ativa.' });
        if (game.currentPlayer.toString() !== req.user.id) return res.status(403).json({ message: 'Não é sua vez de jogar.' });

        const playerIndex = game.players.findIndex(p => p.toString() === req.user.id); // 0 ou 1
        const playerPieceValue = playerIndex + 1; // 1 ou 2

        // A validação real seria muito mais complexa
        const moveValidation = CheckersLogic.validateMove(game.boardState, playerPieceValue, from, to);
        if (!moveValidation.isValid) {
            return res.status(400).json({ message: 'Movimento inválido.' });
        }

        // Aplica o movimento no tabuleiro (simulação)
        const piece = game.boardState[from.r][from.c];
        game.boardState[from.r][from.c] = 0;
        game.boardState[to.r][to.c] = piece;
        // Lógica de promoção para Dama
        if ((piece === 1 && to.r === 0) || (piece === 2 && to.r === 7)) {
            game.boardState[to.r][to.c] = piece * 11; // 1->11, 2->22
        }

        // Salva o histórico
        game.moveHistory.push({ from, to, piece, captured: moveValidation.capturedPieces });

        // Verifica condição de vitória
        const winnerId = CheckersLogic.checkWinCondition(game.boardState, req.user.id);
        if (winnerId) {
            game.status = 'finished';
            game.winner = winnerId;
            const winner = await User.findById(winnerId);
            winner.balance += game.betAmount * 2; // Vencedor leva tudo
            await winner.save();
        } else {
            // Troca o jogador
            game.currentPlayer = game.players[1 - playerIndex]; // Troca para o outro jogador
        }

        await game.save();
        // AQUI emitir um evento WebSocket para o outro jogador com o novo estado do jogo
        res.json(game);

    } catch (error) {
        res.status(500).json({ message: 'Erro ao fazer jogada', error: error.message });
    }
};

exports.getGameHistory = async (req, res) => {
    const games = await Game.find({ players: req.user.id, status: 'finished' })
        .populate('players', 'username avatar')
        .populate('winner', 'username')
        .sort({ createdAt: -1 });
    res.json(games);
};

exports.getGameDetails = async (req, res) => {
    try {
        const game = await Game.findById(req.params.id).populate('players', 'username avatar');
        if (!game) return res.status(404).json({ message: "Jogo não encontrado." });
        res.json(game);
    } catch(err) {
        res.status(500).json({ message: "Erro no servidor" });
    }
};

// --- CONTROLLERS DE ADMIN ---
exports.adminGetAllUsers = async (req, res) => {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
};

exports.adminToggleBlockUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });
        user.isBlocked = !user.isBlocked;
        await user.save();
        res.json({ message: `Usuário ${user.username} ${user.isBlocked ? 'bloqueado' : 'desbloqueado'}.` });
    } catch (err) {
        res.status(500).json({ message: "Erro no servidor" });
    }
};

exports.adminGetPendingTransactions = async (req, res) => {
    const transactions = await Transaction.find({ status: 'pending' }).populate('user', 'username email').sort({ createdAt: 1 });
    res.json(transactions);
};

exports.adminProcessTransaction = async (req, res) => {
    try {
        const { transactionId } = req.params;
        const { status, adminNotes } = req.body; // status: 'approved' ou 'denied'

        const transaction = await Transaction.findById(transactionId);
        if (!transaction || transaction.status !== 'pending') {
            return res.status(400).json({ message: 'Transação não encontrada ou já processada.' });
        }

        const user = await User.findById(transaction.user);

        if (status === 'approved') {
            if (transaction.type === 'deposit') {
                user.balance += transaction.amount;
            } 
            // Para 'withdrawal', o dinheiro já foi debitado. Nada a fazer aqui.
        } else if (status === 'denied') {
            if (transaction.type === 'withdrawal') {
                user.balance += transaction.amount; // Devolve o saldo se o levantamento for negado
            }
        } else {
            return res.status(400).json({ message: 'Status inválido.' });
        }

        transaction.status = status;
        transaction.adminNotes = adminNotes;
        await transaction.save();
        await user.save();
        
        res.json({ message: `Transação ${transaction.id} foi ${status === 'approved' ? 'aprovada' : 'negada'}.` });

    } catch (err) {
        res.status(500).json({ message: "Erro no servidor", error: err.message });
    }
};

exports.adminAddBalance = async (req, res) => {
    try {
        const { userId, amount, reason } = req.body;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });
        
        user.balance += amount;
        await user.save();
        // Opcional: registrar essa transação manual em um log separado
        res.json({ message: `Adicionado ${amount} MT ao saldo de ${user.username}. Novo saldo: ${user.balance} MT. Razão: ${reason}`});

    } catch (err) {
        res.status(500).json({ message: "Erro no servidor" });
    }
};

exports.adminGetPlatformStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalGamesPlayed = await Game.countDocuments({ status: 'finished' });
        const activeGames = await Game.countDocuments({ status: 'active' });
        
        const depositAggregation = await Transaction.aggregate([
            { $match: { type: 'deposit', status: 'approved' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const totalDeposited = depositAggregation.length > 0 ? depositAggregation[0].total : 0;

        res.json({
            totalUsers,
            totalGamesPlayed,
            activeGames,
            totalDeposited
        });
    } catch (err) {
        res.status(500).json({ message: "Erro no servidor" });
    }
};

exports.adminGetSettings = async (req, res) => {
    let settings = await Settings.findOne({ singleton: 'main_settings' });
    if (!settings) {
        settings = await new Settings().save(); // Cria configurações padrão se não existirem
    }
    res.json(settings);
};

exports.adminUpdateSettings = async (req, res) => {
    try {
        const newSettings = req.body;
        const updatedSettings = await Settings.findOneAndUpdate({ singleton: 'main_settings' }, newSettings, { new: true, upsert: true });
        res.json(updatedSettings);
    } catch(err) {
        res.status(500).json({ message: "Erro ao atualizar configurações" });
    }
};
