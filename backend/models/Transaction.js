import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  type: { type: String, enum: ['expense', 'income'], default: 'expense' },
  category: { type: String, required: true },
  merchant: { type: String },
  description: { type: String },
  amount: { type: Number, required: true },
  date: { type: String, required: true },
  
  isInstallment: { type: Boolean, default: false },
  isRecurring: { type: Boolean, default: false },
  isCreditCardPayment: { type: Boolean, default: false },
  isPaid: { type: Boolean, default: true },
  installmentDetails: {
    totalInstallments: { type: Number, default: 1 },
    installmentAmount: { type: Number }
  }
}, { timestamps: true });

export default mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);