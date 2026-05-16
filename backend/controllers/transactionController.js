import Transaction from '../models/transaction.js';

export const getUserTransactions = async (req, res) => {
  try {
    const { userId } = req.params;
    // Obtenemos todas las transacciones ordenadas de la más reciente a la más antigua
    const transactions = await Transaction.find({ userId }).sort({ date: -1, createdAt: -1 });
    res.json(transactions);
  } catch (error) {
    console.error("Error obteniendo transacciones:", error);
    res.status(500).json({ error: "Error obteniendo el historial de transacciones" });
  }
};

export const deleteTransactions = async (req, res) => {
  try {
    const { transactionIds } = req.body;
    await Transaction.deleteMany({ _id: { $in: transactionIds } });
    res.json({ success: true, message: "Transacciones eliminadas correctamente" });
  } catch (error) {
    console.error("Error eliminando transacciones:", error);
    res.status(500).json({ error: "Error eliminando transacciones" });
  }
};