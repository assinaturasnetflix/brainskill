const express = require('express');
const router = express.Router();
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const controllers = require('./controllers');
const { auth, admin } = require('./controllers'); // Importando middlewares

// --- Configuração do Cloudinary e Multer ---
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'brainskill_avatars',
        format: async (req, file) => 'png', // or 'jpg', 'jpeg'
        public_id: (req, file) => `avatar-${req.user.id}-${Date.now()}`,
    },
});

const upload = multer({ storage: storage });

// --- ROTAS PÚBLICAS (AUTENTICAÇÃO) ---
router.post('/register', controllers.register);
router.post('/login', controllers.login);
router.post('/forgot-password', controllers.forgotPassword);
router.post('/reset-password', controllers.resetPassword);

// --- ROTAS DE USUÁRIO (REQUER AUTENTICAÇÃO) ---
router.get('/profile', auth, controllers.getProfile);
router.put('/profile', auth, upload.single('avatar'), controllers.updateProfile);

// --- ROTAS DE SALDO/TRANSAÇÕES (REQUER AUTENTICAÇÃO) ---
router.post('/deposit', auth, controllers.requestDeposit);
router.post('/withdrawal', auth, controllers.requestWithdrawal);
router.get('/transactions', auth, controllers.getTransactionHistory);

// --- ROTAS DE JOGO (REQUER AUTENTICAÇÃO) ---
router.post('/games/create', auth, controllers.createGame);
router.post('/games/join', auth, controllers.joinGame);
router.post('/games/:gameId/move', auth, controllers.makeMove);
router.get('/games/history', auth, controllers.getGameHistory);
router.get('/games/:id', auth, controllers.getGameDetails);


// --- ROTAS DE ADMIN (REQUER AUTH E PRIVILÉGIOS DE ADMIN) ---
const adminRouter = express.Router();
adminRouter.use(auth, admin); // Aplica middleware para todas as rotas de admin

adminRouter.get('/users', controllers.adminGetAllUsers);
adminRouter.patch('/users/:userId/toggle-block', controllers.adminToggleBlockUser);
adminRouter.get('/transactions/pending', controllers.adminGetPendingTransactions);
adminRouter.post('/transactions/:transactionId/process', controllers.adminProcessTransaction);
adminRouter.post('/users/add-balance', controllers.adminAddBalance);
adminRouter.get('/stats', controllers.adminGetPlatformStats);
adminRouter.get('/settings', controllers.adminGetSettings);
adminRouter.put('/settings', controllers.adminUpdateSettings);

// Anexar o roteador de admin à rota principal
router.use('/admin', adminRouter);

module.exports = router;