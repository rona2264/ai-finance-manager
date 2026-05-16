import express from 'express';
import { handleChat, getChatHistory, getGreeting, deleteChatMessages } from '../controllers/chatController.js';

const router = express.Router();

router.get('/greeting', getGreeting);
router.post('/delete', deleteChatMessages);
router.post('/', handleChat);
router.get('/:userId', getChatHistory);

export default router;