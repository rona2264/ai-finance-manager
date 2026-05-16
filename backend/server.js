import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import profileRoutes from './routes/profileRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import exportRoutes from './routes/exportRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import { clerkMiddleware } from '@clerk/express';
import { protectRoute } from './middleware/auth.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use(clerkMiddleware()); // Parsea y valida el JWT de Clerk

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Conectado a MongoDB Local'))
  .catch(err => console.error('❌ Error conectando a MongoDB:', err));

// --- RUTAS ---
app.use('/api/profile', protectRoute, profileRoutes);  // protegida
app.use('/api/chat', protectRoute, chatRoutes);       // protegida
app.use('/api/transactions', protectRoute, transactionRoutes); // protegida
app.use('/api/export', exportRoutes);  // El excel queda sin protección para permitir la descarga directa en nueva pestaña (el userId de Clerk es imposible de adivinar a menos que ocurra un breakthrough en computación cuántica así que es seguro por ahora)

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`:) API Server corriendo en el puerto ${PORT}`));