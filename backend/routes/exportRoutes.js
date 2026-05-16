import express from 'express';
import { exportToExcel } from '../controllers/exportController.js';

const router = express.Router();

router.get('/:userId', exportToExcel);

export default router;