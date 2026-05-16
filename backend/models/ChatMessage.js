import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  role: { type: String, enum: ['user', 'ai'], required: true },
  text: { type: String, required: true }
}, { timestamps: true });

export default mongoose.models.ChatMessage || mongoose.model('ChatMessage', chatMessageSchema);