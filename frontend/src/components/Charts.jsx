import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { getUserTransactions } from '../services/api';
import { useAuth } from '@clerk/clerk-react';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

// Caché temporal en memoria para mantener el filtro al cambiar de pestañas
let cachedFilter = '1M';
let cachedDateRange = null;
let cachedCustomPicker = false;

export default function Charts({ userId, refreshTrigger }) {
  const { getToken } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const defaultEnd = new Date();
  const defaultStart = new Date();
  defaultStart.setMonth(defaultStart.getMonth() - 1);

  const [activeFilter, setActiveFilter] = useState(cachedFilter);
  const [showCustomPicker, setShowCustomPicker] = useState(cachedCustomPicker);
  const [dateRange, setDateRange] = useState(cachedDateRange || { start: defaultStart, end: defaultEnd });

  useEffect(() => {
    const loadData = async () => {
      if (!userId) return;
      setIsLoading(true);
      try {
        const token = await getToken();
        const data = await getUserTransactions(userId, token);
        setTransactions(data);
      } catch (error) {
        console.error("Error cargando transacciones", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [userId, getToken, refreshTrigger]);

  useEffect(() => {
    cachedFilter = activeFilter;
    cachedCustomPicker = showCustomPicker;
    cachedDateRange = dateRange;
  }, [activeFilter, showCustomPicker, dateRange]);

  // --- LÓGICA DEL FILTRO DE FECHAS ---
  const setFilter = (filter) => {
    setActiveFilter(filter);
    if (filter === 'Personalizado') {
      setShowCustomPicker(true);
      return;
    }
    setShowCustomPicker(false);
    const end = new Date();
    const start = new Date();
    
    if (filter === '1D') {
      // start y end son hoy
    } else if (filter === '1W') {
      start.setDate(end.getDate() - 7);
    } else if (filter === '1M') {
      start.setMonth(end.getMonth() - 1);
    } else if (filter === '3M') {
      start.setMonth(end.getMonth() - 3);
    } else if (filter === '6M') {
      start.setMonth(end.getMonth() - 6);
    } else if (filter === '1Y') {
      start.setFullYear(end.getFullYear() - 1);
    }
    setDateRange({ start, end });
  };

  const handleCustomDateChange = (type, value) => {
    if (!value) return;
    const [y, m, d] = value.split('-');
    const newDate = new Date(y, m - 1, d);
    setDateRange(prev => ({ ...prev, [type]: newDate }));
  };

  const formatDateObj = (d) => {
    if (!d) return '';
    return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
  };

  const formatInputDate = (d) => {
    if (!d) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // --- PROCESAMIENTO: GRÁFICOS GENERALES (PIE Y BARRA) ---
  const startDate = new Date(dateRange.start);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(dateRange.end);
  endDate.setHours(23, 59, 59, 999);

  const periodItems = [];
  const latestRecurringChart = {};

  transactions.forEach(tx => {
    if (!tx.date) return;
    if (tx.isRecurring) {
      const key = tx.merchant || tx.category;
      if (!latestRecurringChart[key] || new Date(tx.date) > new Date(latestRecurringChart[key].date)) {
        latestRecurringChart[key] = tx;
      }
    }
  });

  transactions.forEach(tx => {
    if (!tx.date) return;
    
    if (tx.isInstallment && tx.installmentDetails && tx.installmentDetails.totalInstallments > 1) {
      const [y, m, d] = tx.date.split('-');
      const txDate = new Date(y, m - 1, d);
      for (let i = 1; i <= tx.installmentDetails.totalInstallments; i++) {
        const paymentDate = new Date(txDate.getFullYear(), txDate.getMonth() + i, txDate.getDate() || 1);
        if (paymentDate >= startDate && paymentDate <= endDate) {
          periodItems.push({ ...tx, amount: tx.installmentDetails.installmentAmount || 0 });
        }
      }
    } else if (!tx.isRecurring) {
      const [y, m, d] = tx.date.split('-');
      const txDate = new Date(y, m - 1, d);
      if (txDate >= startDate && txDate <= endDate) {
        periodItems.push(tx);
      }
    }
  });

  Object.values(latestRecurringChart).forEach(tx => {
    const [y, m, d] = tx.date.split('-');
    const txDate = new Date(y, m - 1, d);
    let currentProj = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate() || 1);
    const maxDate = new Date(Math.min(endDate.getTime(), new Date().getTime() + 1000*3600*24*365*2));
    
    while (currentProj <= maxDate) {
      if (currentProj >= startDate && currentProj <= endDate) {
        periodItems.push(tx);
      }
      currentProj.setMonth(currentProj.getMonth() + 1);
    }
  });

  const colorsPalette = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b', '#14b8a6', '#f43f5e', '#84cc16'];

  const expenses = periodItems.filter(t => t.type === 'expense' && t.isPaid !== false);
  const categoryTotals = expenses.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
    return acc;
  }, {});

  const pieData = {
    labels: Object.keys(categoryTotals),
    datasets: [{
      data: Object.values(categoryTotals),
      backgroundColor: colorsPalette,
      borderWidth: 1,
    }],
  };

  const totalIncome = periodItems.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = expenses.reduce((acc, curr) => acc + curr.amount, 0);

  const barData = {
    labels: ['Ingresos vs Gastos'],
    datasets: [
      { label: 'Ingresos', data: [totalIncome], backgroundColor: '#10b981', borderRadius: 6 },
      { label: 'Gastos', data: [totalExpense], backgroundColor: '#ef4444', borderRadius: 6 }
    ],
  };

  // --- PROCESAMIENTO: PAGOS RECURRENTES FUTUROS (CUOTAS) ---
  const ccInstallmentsData = {};
  const ccMotives = new Set();
  const recurringData = {};
  const recurringMotives = new Set();
  const latestRecurring = {};
  const today = new Date();
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  // Para proyectar cuotas usamos TODO el historial general sin importar el filtro de fecha actual
  transactions.forEach(tx => {
    if (tx.isInstallment && tx.installmentDetails && tx.installmentDetails.totalInstallments > 1) {
      const [y, m, d] = tx.date.split('-');
      const txDate = new Date(y, m - 1, d);
      const motivo = tx.merchant || tx.description || tx.category || 'Varios';
      ccMotives.add(motivo);

      for (let i = 1; i <= tx.installmentDetails.totalInstallments; i++) {
        const paymentDate = new Date(txDate.getFullYear(), txDate.getMonth() + i, 1);
        if (paymentDate >= currentMonthStart) {
          const monthKey = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;
          if (!ccInstallmentsData[monthKey]) ccInstallmentsData[monthKey] = {};
          ccInstallmentsData[monthKey][motivo] = (ccInstallmentsData[monthKey][motivo] || 0) + tx.installmentDetails.installmentAmount;
        }
      }
    }

    if (tx.isRecurring && tx.type === 'expense') {
      const key = tx.merchant || tx.category;
      if (!latestRecurring[key] || new Date(tx.date) > new Date(latestRecurring[key].date)) {
        latestRecurring[key] = { amount: tx.amount, date: tx.date };
      }
    }
  });

  Object.keys(latestRecurring).forEach(motivo => {
    recurringMotives.add(motivo);
    for (let i = 0; i < 12; i++) {
        const paymentDate = new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() + i, 1);
        const monthKey = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;
        if (!recurringData[monthKey]) recurringData[monthKey] = {};
        recurringData[monthKey][motivo] = latestRecurring[motivo].amount;
    }
  });

  const generateFutureChart = (dataObj, motivesSet) => {
    const sortedMonths = Object.keys(dataObj).sort().slice(0, 12);
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const labels = sortedMonths.map(m => {
      const [year, month] = m.split('-');
      return `${monthNames[parseInt(month, 10) - 1]} ${year}`;
    });
    const datasets = Array.from(motivesSet).map((motivo, index) => ({
      label: motivo,
      data: sortedMonths.map(month => dataObj[month][motivo] || 0),
      backgroundColor: colorsPalette[index % colorsPalette.length],
      borderRadius: 4,
    }));
    return { labels, datasets };
  };

  const ccFutureBarData = generateFutureChart(ccInstallmentsData, ccMotives);
  const recFutureBarData = generateFutureChart(recurringData, recurringMotives);
  const futureBarOptions = {
    responsive: true,
    plugins: { 
      legend: { position: 'bottom' },
      tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: $${ctx.parsed.y.toLocaleString()}` } }
    },
    scales: {
      x: { stacked: true, grid: { display: false } },
      y: { stacked: true, border: { dash: [4, 4] }, grid: { color: '#f1f5f9' } }
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-4 flex flex-col gap-8 w-full animate-fade-in">
        {/* Period Selector Skeleton */}
        <div className="flex flex-col items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="h-7 w-64 bg-slate-200 animate-pulse rounded-lg mb-4"></div>
          <div className="flex flex-wrap justify-center gap-2 mb-2">
            {[...Array(7)].map((_, i) => <div key={i} className="h-8 w-14 bg-slate-100 animate-pulse rounded-full"></div>)}
          </div>
        </div>
        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
            <div className="h-6 w-48 bg-slate-200 animate-pulse rounded-lg mb-6"></div>
            <div className="w-[250px] h-[250px] bg-slate-100 animate-pulse rounded-full"></div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center items-center">
            <div className="h-6 w-48 bg-slate-200 animate-pulse rounded-lg mb-6"></div>
            <div className="w-full h-[250px] bg-slate-100 animate-pulse rounded-lg"></div>
          </div>
        </div>
        {/* Projections Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center w-full">
              <div className="h-6 w-48 bg-slate-200 animate-pulse rounded-lg mb-2"></div>
              <div className="h-4 w-40 bg-slate-100 animate-pulse rounded-lg mb-6"></div>
              <div className="w-full h-[200px] bg-slate-100 animate-pulse rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 animate-fade-in flex flex-col gap-8">
      
      {/* CONTROLADOR DE PERIODO */}
      <div className="flex flex-col items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-xl font-bold text-slate-800 mb-4 text-center">
          Periodo del {formatDateObj(dateRange.start)} al {formatDateObj(dateRange.end)}
        </h2>
        <div className="flex flex-wrap justify-center gap-2 mb-2">
          {['1D', '1W', '1M', '3M', '6M', '1Y', 'Personalizado'].map(filter => (
            <button
              key={filter}
              onClick={() => setFilter(filter)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                activeFilter === filter 
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' 
                  : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
        
        {showCustomPicker && (
          <div className="flex items-center gap-4 mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 animate-fade-in w-full max-w-md justify-between">
            <div className="flex flex-col flex-1">
              <label className="text-xs text-slate-500 font-bold mb-1 uppercase tracking-wider">Desde</label>
              <input type="date" value={formatInputDate(dateRange.start)} onChange={(e) => handleCustomDateChange('start', e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"/>
            </div>
            <div className="flex flex-col flex-1">
              <label className="text-xs text-slate-500 font-bold mb-1 uppercase tracking-wider">Hasta</label>
              <input type="date" value={formatInputDate(dateRange.end)} onChange={(e) => handleCustomDateChange('end', e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"/>
            </div>
          </div>
        )}
      </div>

      {/* GRÁFICOS PRINCIPALES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
          <h3 className="text-lg font-bold text-slate-800 mb-6 w-full text-center">Gastos por Categoría</h3>
          <div className="w-full max-w-[300px]">
            {expenses.length > 0 ? <Pie data={pieData} /> : <p className="text-center text-slate-500 my-10">No hay gastos en este periodo.</p>}
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
          <h3 className="text-lg font-bold text-slate-800 mb-6 text-center">Balance General</h3>
          <Bar data={barData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />
        </div>
      </div>

      {/* GRÁFICOS DE PROYECCIONES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-1 text-center">Gastos Fijos</h3>
          <p className="text-xs text-slate-500 text-center mb-6">Proyección próximos 12 meses</p>
          {recFutureBarData.labels.length > 0 ? <Bar data={recFutureBarData} options={futureBarOptions} /> : <p className="text-center text-slate-400 my-auto">Sin datos proyectados</p>}
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-1 text-center">Tarjetas de Crédito</h3>
          <p className="text-xs text-slate-500 text-center mb-6">Cuotas pendientes próximos 12 meses</p>
          {ccFutureBarData.labels.length > 0 ? <Bar data={ccFutureBarData} options={futureBarOptions} /> : <p className="text-center text-slate-400 my-auto">Sin cuotas pendientes</p>}
        </div>
      </div>

    </div>
  );
}