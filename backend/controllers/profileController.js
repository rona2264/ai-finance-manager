import Transaction from '../models/Transaction.js';
import UserProfile from '../models/UserProfile.js';

const getLocalDate = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });

export const createOrUpdateProfile = async (req, res) => {
  try {
    const { userId, monthly_salary, available_balance, onboardingData } = req.body;

    console.log('📝 POST /api/profile recibido:', { userId, monthly_salary, available_balance, onboardingData });

    if (!userId) {
      return res.status(400).json({ error: "userId es requerido" });
    }

    // Sanitización para evitar que Mongoose crashee si se envían campos vacíos
    const safeSalary = Number(monthly_salary) || 0;
    const safeBalance = Number(available_balance) || 0;

    const profile = await UserProfile.findOneAndUpdate(
      { userId },
      { 
        $set: { 
          userId,
          monthly_salary: safeSalary,
          available_balance: safeBalance,
          last_salary_update: new Date()
        } 
      },
      { upsert: true, new: true }
    );

    console.log('✅ Perfil guardado:', profile);

    const existingTx = await Transaction.findOne({ userId });
    if (!existingTx && onboardingData) {
      if (onboardingData.credit_card && Number(onboardingData.credit_card) > 0) {
        await new Transaction({
          userId, type: 'expense', category: 'Tarjeta de Crédito',
          description: 'Saldo inicial tarjeta', amount: Number(onboardingData.credit_card),
          date: getLocalDate(),
          isCreditCardPayment: true
        }).save();
      }
      if (onboardingData.fixed_expenses && Number(onboardingData.fixed_expenses) > 0) {
        await new Transaction({
          userId, type: 'expense', category: 'Gastos Fijos',
          description: 'Gastos fijos estimados', amount: Number(onboardingData.fixed_expenses),
          date: getLocalDate(),
          isRecurring: true
        }).save();
      }
    }

    res.json({ 
      success: true, 
      message: "Perfil creado/actualizado correctamente",
      profile 
    });
  } catch (error) {
    console.error("Error creando perfil:", error);
    res.status(500).json({ error: "Error creando el perfil" });
  }
};

export const getProfileStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const profile = await UserProfile.findOne({ userId });
    
    console.log(`📊 GET /api/profile/${userId}:`, profile);

    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
    const startOfMonth = new Date(now);
    startOfMonth.setDate(1);
    const startOfMonthStr = startOfMonth.toLocaleDateString('en-CA');

    const transactions = await Transaction.find({
      userId,
      date: { $gte: startOfMonthStr }
    });

    let totalExpenses = 0;
    let extraIncomes = 0;
    let atrasadosSueldo = 0;

    transactions.forEach(tx => {
      if (tx.type === 'income') {
        // Si la IA lo categorizó como Sueldo, va a nuestra nueva variable
        if (tx.category === 'Sueldo') {
          atrasadosSueldo += tx.amount;
        } else {
          extraIncomes += tx.amount;
        }
          } else {
        // Si es una compra en cuotas (tarjeta de crédito), no descontamos del disponible en cuenta actual.
        // El usuario lo descontará el día que registre el pago de su resumen de tarjeta.
        // Tampoco descontamos si el gasto fue registrado como pendiente (isPaid: false).
        if (!tx.isInstallment && tx.isPaid !== false) {
          totalExpenses += tx.amount;
        }
      }
    });


    const baseSalary = profile?.monthly_salary || 0;
    const baseAvailable = profile?.available_balance || 0;
    
    console.log(`💰 Cálculo para ${userId}:`, { baseSalary, baseAvailable, atrasadosSueldo, extraIncomes, totalExpenses });
    
    // El sueldo que mostramos en pantalla es el Base + Lo que cobró atrasado este mes
    const displayedSalary = baseSalary + atrasadosSueldo;
    
    // El disponible es: lo que tenías al inicio + TODOS los ingresos (sueldos + extras) - gastos
    const remaining = baseAvailable + atrasadosSueldo + extraIncomes - totalExpenses;

    console.log(`✅ Respuesta: salary=${displayedSalary}, remaining=${remaining}`);

    res.json({ 
      exists: !!profile,
      salary: displayedSalary, 
      remaining 
    });
  } catch (error) {
    res.status(500).json({ error: "Error obteniendo el perfil" });
  }
};