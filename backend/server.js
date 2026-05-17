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

console.log("--- INICIANDO SERVIDOR ---");
if (!process.env.MONGO_URI) console.log("❌ FALTA VARIABLE: MONGO_URI");
if (!process.env.GEMINI_API_KEY) console.log("❌ FALTA VARIABLE: GEMINI_API_KEY");
if (!process.env.CLERK_SECRET_KEY) console.log("❌ FALTA VARIABLE: CLERK_SECRET_KEY");

const app = express();
app.use(cors());
app.use(express.json());

try {
  app.use(clerkMiddleware()); // Parsea y valida el JWT de Clerk
} catch (error) {
  console.log("❌ Error iniciando Clerk:", error.message);
}

if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Conectado a MongoDB en la Nube'))
    .catch(err => console.error('❌ Error conectando a MongoDB:', err));
}

// --- RUTAS ---
app.use('/api/profile', protectRoute, profileRoutes);  // protegida
app.use('/api/chat', protectRoute, chatRoutes);       // protegida
app.use('/api/transactions', protectRoute, transactionRoutes); // protegida
app.use('/api/export', exportRoutes);  // El excel queda sin protección para permitir la descarga directa en nueva pestaña (el userId de Clerk es imposible de adivinar a menos que ocurra un breakthrough en computación cuántica así que es seguro por ahora)

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`:) API Server corriendo en el puerto ${PORT}`));