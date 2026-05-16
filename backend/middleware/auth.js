import { getAuth } from '@clerk/express';

export const protectRoute = (req, res, next) => {
  const { userId } = getAuth(req);
  
  if (!userId) {
    return res.status(401).json({ error: 'No autorizado. Inicia sesión para continuar.' });
  }
  
  next();
};