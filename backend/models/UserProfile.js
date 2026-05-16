import mongoose from 'mongoose';

const userProfileSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  monthly_salary: { type: Number, default: 0 },
  available_balance: { type: Number, default: 0 },
  last_salary_update: { type: Date, default: Date.now }
});

export default mongoose.models.UserProfile || mongoose.model('UserProfile', userProfileSchema);