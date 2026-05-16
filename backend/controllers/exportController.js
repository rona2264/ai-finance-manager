import exceljs from 'exceljs';
import Transaction from '../models/transaction.js';

export const exportToExcel = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // 1. Buscar todas las transacciones del usuario, de la más nueva a la más vieja
    const transactions = await Transaction.find({ userId }).sort({ date: -1 });

    // 2. Crear un nuevo libro de Excel
    const workbook = new exceljs.Workbook();

    // 3. Separar los datos
    const fixed = transactions.filter(tx => tx.isRecurring);
    const cc = transactions.filter(tx => !tx.isRecurring && (tx.isInstallment || tx.isCreditCardPayment));
    const general = transactions.filter(tx => !tx.isRecurring && !tx.isInstallment && !tx.isCreditCardPayment);

    // Función auxiliar para crear hojas
    const createSheet = (name, data) => {
      const ws = workbook.addWorksheet(name);
      ws.columns = [
        { header: 'Fecha', key: 'date', width: 12 },
        { header: 'Categoría', key: 'category', width: 20 },
        { header: 'Comercio', key: 'merchant', width: 20 },
        { header: 'Descripción', key: 'description', width: 30 },
        { header: 'Monto Total ($)', key: 'amount', width: 18 },
        { header: 'Modalidad', key: 'installments', width: 25 }
      ];
      ws.getRow(1).font = { bold: true };
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
      
      data.forEach(tx => {
        ws.addRow({
          date: tx.date,
          category: tx.category,
          merchant: tx.merchant || '-',
          description: tx.description || '-',
          amount: tx.amount,
          installments: tx.isInstallment ? `${tx.installmentDetails.totalInstallments} cuotas de $${tx.installmentDetails.installmentAmount}` : 'Contado'
        });
      });
    };

    // 4. Llenar el Excel con las hojas
    createSheet('Movimientos', general);
    createSheet('Tarjetas de Crédito', cc);
    createSheet('Gastos Fijos', fixed);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=' + 'Historial_de_movimientos.xlsx');

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error("Error exportando a Excel:", error);
    res.status(500).json({ message: "Error interno generando el archivo." });
  }
};