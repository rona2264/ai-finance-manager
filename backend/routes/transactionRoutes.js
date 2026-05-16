import express from 'express';
import { getUserTransactions, deleteTransactions } from '../controllers/transactionController.js';

const router = express.Router();

router.post('/delete', deleteTransactions);
router.get('/:userId', getUserTransactions);

export default router;