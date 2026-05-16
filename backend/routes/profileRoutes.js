import express from 'express';
import { createOrUpdateProfile, getProfileStatus } from '../controllers/profileController.js';

const router = express.Router();

// Las rutas asumen que la base ya es '/api/profile'
router.post('/', createOrUpdateProfile);
router.get('/:userId', getProfileStatus);

export default router;