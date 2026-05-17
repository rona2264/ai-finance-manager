import React, { useEffect, useState, useMemo } from 'react';
import { getUserTransactions, deleteTransactions, EXPORT_URL } from '../services/api';
import { useAuth } from '@clerk/clerk-react';

const EyeIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const EyeOffIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;

export default function History({ userId, remaining, refreshTrigger }) {
  const { getToken } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBalance, setShowBalance] = useState(true);
  const [collapsedTables, setCollapsedTables] = useState({});

  // Selector de Periodos
  const [period, setPeriod] = useState('current');
  const [customMonth, setCustomMonth] = useState('');

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const now = new Date();
  const currentMonthName = monthNames[now.getMonth()];
  const nextMonthName = monthNames[(now.getMonth() + 1) % 12];

  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterMinAmount, setFilterMinAmount] = useState('');
  const [filterMaxAmount, setFilterMaxAmount] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  useEffect(() => {
    const loadData = async () => {
      if (!userId) return;
      setIsLoading(true);
      try {
        const token = await getToken();
        const data = await getUserTransactions(userId, token);
        setTransactions(data);
      } catch (error) {
        console.error("Error cargando historial", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [userId, getToken, refreshTrigger]);

  const toggleTable = (index) => {
    setCollapsedTables(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const handleDelete = async () => {
    try {
      const token = await getToken();
      await deleteTransactions(token, selectedIds);
      setTransactions(prev => prev.filter(tx => !selectedIds.includes(tx._id)));
      setSelectedIds([]);
      setIsEditing(false);
    } catch (error) {
      console.error("Error al eliminar", error);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const getCurrentInstallment = (txDateStr, totalInstallments) => {
    if (!txDateStr || !totalInstallments) return 1;
    const [y, m, d] = txDateStr.split('-');
    const txDate = new Date(y, m - 1, d);
    const now = new Date();
    const monthsElapsed = (now.getFullYear() - txDate.getFullYear()) * 12 + now.getMonth() - txDate.getMonth();
    return Math.min(Math.max(1, monthsElapsed + 1), totalInstallments);
  };

  const getDateRange = () => {
    const date = new Date();
    if (period === 'current') return { start: new Date(date.getFullYear(), date.getMonth(), 1), end: new Date(date.getFullYear(), date.getMonth() + 1, 0) };
    if (period === 'next') return { start: new Date(date.getFullYear(), date.getMonth() + 1, 1), end: new Date(date.getFullYear(), date.getMonth() + 2, 0) };
    if (period === 'next3') return { start: new Date(date.getFullYear(), date.getMonth() + 1, 1), end: new Date(date.getFullYear(), date.getMonth() + 4, 0) };
    if (period === 'custom' && customMonth) {
      const [y, m] = customMonth.split('-');
      return { start: new Date(y, m - 1, 1), end: new Date(y, m, 0) };
    }
    return { start: new Date(1900, 0, 1), end: new Date(2100, 0, 1) };
  };

  const { start: periodStart, end: periodEnd } = getDateRange();

  const allPeriodItems = useMemo(() => {
    if (!transactions.length) return [];
    const items = [];
    
    transactions.forEach(tx => {
      if (!tx.date) return;
      if (tx.isInstallment) return; // Omitimos la transacción base de cuotas para mostrar solo sus proyecciones futuras
      const [y, m, d] = tx.date.split('-');
      const txDate = new Date(y, m - 1, d);
      if (txDate >= periodStart && txDate <= periodEnd) {
        items.push({ ...tx, isProjected: false });
      }
    });

    transactions.forEach(tx => {
      if (!tx.date) return;
      if (tx.isInstallment && tx.installmentDetails && tx.installmentDetails.totalInstallments > 1) {
        const [y, m, d] = tx.date.split('-');
        const txDate = new Date(y, m - 1, d);
        for (let i = 1; i <= tx.installmentDetails.totalInstallments; i++) {
          const paymentDate = new Date(txDate.getFullYear(), txDate.getMonth() + i, txDate.getDate() || 1); // Empieza a cobrarse el MES SIGUIENTE
          if (paymentDate >= periodStart && paymentDate <= periodEnd) {
            items.push({
              ...tx, _id: tx._id + '_inst_' + i, baseId: tx._id, // Guardamos el baseId para poder eliminarlo a través de su cuota proyectada
              date: `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}-${String(paymentDate.getDate() || 1).padStart(2, '0')}`,
              amount: tx.installmentDetails?.installmentAmount || tx.amount || 0, isProjected: true, currentInstallment: i
            });
          }
        }
      }
    });

    const latestRecurring = {};
    transactions.forEach(tx => {
      if (!tx.date) return;
      if (tx.isRecurring) {
        const key = tx.merchant || tx.category;
        if (!latestRecurring[key] || new Date(tx.date) > new Date(latestRecurring[key].date)) {
          latestRecurring[key] = tx;
        }
      }
    });

    Object.values(latestRecurring).forEach(tx => {
      const [y, m, d] = tx.date.split('-');
      const txDate = new Date(y, m - 1, d);
      let currentProj = new Date(txDate.getFullYear(), txDate.getMonth() + 1, txDate.getDate() || 1);
      const maxDate = new Date(Math.min(periodEnd.getTime(), new Date().getTime() + 1000*3600*24*365*2));
      
      while (currentProj <= maxDate) {
        if (currentProj >= periodStart && currentProj <= periodEnd) {
          const exists = items.some(act => !act.isProjected && act.isRecurring && (act.merchant || act.category) === (tx.merchant || tx.category) && act.date?.substring(0,7) === `${currentProj.getFullYear()}-${String(currentProj.getMonth() + 1).padStart(2, '0')}`);
          if (!exists) {
            items.push({
              ...tx, _id: tx._id + '_rec_' + currentProj.getTime(),
              date: `${currentProj.getFullYear()}-${String(currentProj.getMonth() + 1).padStart(2, '0')}-${String(currentProj.getDate() || 1).padStart(2, '0')}`,
              isProjected: true
            });
          }
        }
        currentProj.setMonth(currentProj.getMonth() + 1);
      }
    });

    return items.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [transactions, period, customMonth]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const categories = [...new Set(transactions.map(tx => tx.category))];

  const filteredItems = useMemo(() => {
    return allPeriodItems.filter(tx => {
      if (searchTerm && !(tx.description?.toLowerCase().includes(searchTerm.toLowerCase()) || tx.merchant?.toLowerCase().includes(searchTerm.toLowerCase()))) return false;
      if (filterCategory && tx.category !== filterCategory) return false;
      if (filterMinAmount && tx.amount < Number(filterMinAmount)) return false;
      if (filterMaxAmount && tx.amount > Number(filterMaxAmount)) return false;
      if (filterDateFrom && new Date(tx.date) < new Date(filterDateFrom)) return false;
      if (filterDateTo && new Date(tx.date) > new Date(filterDateTo)) return false;
      return true;
    });
  }, [allPeriodItems, searchTerm, filterCategory, filterMinAmount, filterMaxAmount, filterDateFrom, filterDateTo]);

  const fixedExpenses = filteredItems.filter(tx => tx.isRecurring);
  const creditCardTransactions = filteredItems.filter(tx => !tx.isRecurring && (tx.isInstallment || tx.isCreditCardPayment));
  const generalTransactions = filteredItems.filter(tx => !tx.isRecurring && !tx.isInstallment && !tx.isCreditCardPayment);

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-4 w-full animate-fade-in">
        {/* Balance Skeleton */}
        <div className="flex flex-col items-center mb-10 mt-4">
          <div className="h-3 w-32 bg-slate-200 animate-pulse rounded-full mb-3"></div>
          <div className="flex items-center gap-4">
            <div className="h-14 w-48 bg-slate-200 animate-pulse rounded-2xl"></div>
            <div className="h-10 w-10 bg-slate-200 animate-pulse rounded-full"></div>
          </div>
        </div>
        
        {/* Period Selector Skeleton */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {[...Array(4)].map((_, i) => <div key={i} className="h-9 w-28 bg-slate-200 animate-pulse rounded-xl"></div>)}
        </div>
        
        {/* Actions Bar Skeleton */}
        <div className="mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex gap-2 w-full md:w-auto">
            <div className="h-10 w-36 bg-slate-200 animate-pulse rounded-lg"></div>
            <div className="h-10 w-24 bg-slate-200 animate-pulse rounded-lg"></div>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="h-10 flex-1 md:w-56 bg-slate-200 animate-pulse rounded-lg"></div>
            <div className="h-10 w-24 bg-slate-200 animate-pulse rounded-lg"></div>
          </div>
        </div>
        
        {/* Tables Skeleton */}
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mb-8">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex justify-between items-center">
              <div className="h-5 w-48 bg-slate-200 animate-pulse rounded-lg"></div>
              <div className="h-5 w-5 bg-slate-200 animate-pulse rounded-full"></div>
            </div>
            <div className="p-5 flex flex-col gap-5">
              <div className="flex gap-4 pb-2 border-b border-slate-100">
                <div className="h-3 w-20 bg-slate-100 animate-pulse rounded"></div>
                <div className="h-3 w-24 bg-slate-100 animate-pulse rounded"></div>
                <div className="h-3 flex-1 bg-slate-100 animate-pulse rounded"></div>
                <div className="h-3 w-20 bg-slate-100 animate-pulse rounded"></div>
              </div>
              {[...Array(3)].map((_, j) => (
                <div key={j} className="flex gap-4 items-center">
                  <div className="h-4 w-20 bg-slate-200 animate-pulse rounded-md"></div>
                  <div className="h-6 w-24 bg-slate-100 animate-pulse rounded-md"></div>
                  <div className="h-4 flex-1 bg-slate-200 animate-pulse rounded-md"></div>
                  <div className="h-4 w-20 bg-slate-200 animate-pulse rounded-md ml-auto"></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 animate-fade-in">
      
      {/* Disponible en el centro */}
      <div className="flex flex-col items-center mb-10 mt-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Dinero Disponible</h2>
        <div className="flex items-center gap-4">
          <div className="grid place-items-center">
            <span className={`col-start-1 row-start-1 text-5xl md:text-6xl font-extrabold tracking-tight transition-all duration-300 ${remaining < 0 ? 'text-red-500' : 'text-emerald-500'} ${showBalance ? 'opacity-100 scale-100 blur-none' : 'opacity-0 scale-95 blur-md pointer-events-none select-none'}`}>
              ${remaining.toLocaleString()}
            </span>
            <span className={`col-start-1 row-start-1 text-5xl md:text-6xl font-extrabold tracking-tight transition-all duration-300 ${remaining < 0 ? 'text-red-500' : 'text-emerald-500'} ${!showBalance ? 'opacity-100 scale-100 blur-none' : 'opacity-0 scale-95 blur-md pointer-events-none select-none'}`}>
              {`$${remaining.toLocaleString()}`.replace(/\d/g, '*')}
            </span>
          </div>
          <button onClick={() => setShowBalance(!showBalance)} className="text-slate-300 hover:text-slate-500 transition-colors bg-white p-2 rounded-full shadow-sm border border-slate-100 z-10 shrink-0">
            {showBalance ? <EyeOffIcon/> : <EyeIcon/>}
          </button>
        </div>
      </div>

      {/* Selector de Periodo */}
      <div className="flex flex-wrap gap-2 justify-center mb-8">
        <button onClick={() => setPeriod('current')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${period === 'current' ? 'bg-slate-800 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{currentMonthName}</button>
        <button onClick={() => setPeriod('next')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${period === 'next' ? 'bg-slate-800 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{nextMonthName}</button>
        <button onClick={() => setPeriod('next3')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${period === 'next3' ? 'bg-slate-800 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Próximos 3 meses</button>
        <div className="flex items-center gap-2">
          <button onClick={() => setPeriod('custom')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${period === 'custom' ? 'bg-slate-800 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Elegir mes</button>
          {period === 'custom' && <input type="month" value={customMonth} onChange={e => setCustomMonth(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />}
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-4">
        {/* Contenedor principal de Botones y Búsqueda */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex gap-2 w-full md:w-auto">
            <button onClick={() => window.location.href = `${EXPORT_URL}/${userId}`} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-sm flex items-center gap-2">
              Exportar a Excel
            </button>
            {isEditing && selectedIds.length > 0 && (
              <button onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-sm animate-fade-in">
                Eliminar ({selectedIds.length})
              </button>
            )}
            <button onClick={() => { setIsEditing(!isEditing); setSelectedIds([]); }} className={`px-4 py-2 rounded-lg font-bold transition-colors shadow-sm ${isEditing ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>
              {isEditing ? 'Cancelar' : 'Editar'}
            </button>
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <input 
              type="text" 
              placeholder="Buscar descripción..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm flex-1 md:w-56 focus:outline-none focus:border-emerald-500 shadow-sm"
            />
            <button onClick={() => setShowFilters(!showFilters)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2 ${showFilters ? 'bg-emerald-100 text-emerald-700' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
              Filtros
            </button>
          </div>
        </div>

        {/* Panel de Filtros Expandible */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm animate-fade-in">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Desde</label>
              <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Hasta</label>
              <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Categoría</label>
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 bg-white">
                <option value="">Todas</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Monto ($)</label>
              <div className="flex items-center gap-2">
                <input type="number" placeholder="Min" value={filterMinAmount} onChange={e => setFilterMinAmount(e.target.value)} className="w-full px-2 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />
                <span className="text-slate-400">-</span>
                <input type="number" placeholder="Max" value={filterMaxAmount} onChange={e => setFilterMaxAmount(e.target.value)} className="w-full px-2 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Renderizado Dinámico de Tablas */}
      {[ 
        { title: 'Gastos Fijos Recurrentes', data: fixedExpenses, hideMinus: true }, 
        { title: 'Tarjetas de Crédito', data: creditCardTransactions, hideMinus: true }, 
        { title: 'Movimientos', data: generalTransactions } 
      ].map((table, i) => (
      <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mb-8">
        <div 
          className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition-colors"
          onClick={() => toggleTable(i)}
        >
          <h3 className="font-bold text-slate-800">{table.title}</h3>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`w-5 h-5 text-slate-500 transition-transform duration-300 ${collapsedTables[i] ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6"/></svg>
        </div>
        {!collapsedTables[i] && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px] table-fixed">
            <thead>
              <tr className="bg-white text-slate-400 text-xs uppercase tracking-wider border-b border-slate-100">
                {isEditing && <th className="p-4 w-10"></th>}
                <th className="p-4 font-semibold w-40">Fecha</th>
                <th className="p-4 font-semibold w-40">Categoría</th>
                <th className="p-4 font-semibold">Descripción</th>
                <th className="p-4 font-semibold w-40">Medio de pago</th>
                <th className="p-4 font-semibold text-right w-32">Monto</th>
              </tr>
            </thead>
            <tbody>
              {table.data.length === 0 ? (
                <tr>
                  <td colSpan={isEditing ? 6 : 5} className="p-8 text-center text-slate-400">
                    No hay movimientos para este periodo.
                  </td>
                </tr>
              ) : table.data.map((tx) => (
                <tr key={tx._id} className={`border-b last:border-b-0 border-slate-50 hover:bg-slate-50/50 transition-colors ${tx.isProjected ? 'opacity-70' : ''}`}>
                  {isEditing && (
                    <td className="p-4 w-10">
                      {(!tx.isProjected || tx.isInstallment) && <input type="checkbox" checked={selectedIds.includes(tx.baseId || tx._id)} onChange={() => toggleSelect(tx.baseId || tx._id)} className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />}
                    </td>
                  )}
                  <td className="p-4 text-slate-600 text-sm">
                    {formatDate(tx.date)}
                    {tx.isProjected && <span className="ml-2 text-[9px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded uppercase font-bold">Proyectado</span>}
                  </td>
                  <td className="p-4"><span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-xs font-medium">{tx.category}</span></td>
                  <td className="p-4 text-slate-700 text-sm">
                    {tx.description || tx.merchant || '-'}
                    {tx.isPaid === false && !tx.isProjected && <span className="ml-2 text-[9px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Pendiente</span>}
                  </td>
                  <td className="p-4">
                    {tx.isCreditCardPayment ? (
                      <span className="font-medium text-xs text-slate-700">Pago de Tarjeta</span>
                    ) : tx.isInstallment ? (
                      <div className="flex flex-col">
                        <span className="font-medium text-xs text-slate-700">Tarjeta de Crédito</span>
                        <span className="text-[11px] text-slate-400 mt-0.5">
                          Cuota {tx.currentInstallment || getCurrentInstallment(tx.date, tx.installmentDetails?.totalInstallments)} de {tx.installmentDetails?.totalInstallments}
                        </span>
                      </div>
                    ) : (
                      <span className="font-medium text-xs text-slate-500 border border-slate-200 bg-slate-50 px-2 py-0.5 rounded">Contado</span>
                    )}
                  </td>
                  <td className={`p-4 text-right font-bold text-sm ${tx.type === 'income' ? 'text-emerald-600' : 'text-slate-700'}`}>
                    {tx.type === 'income' ? '+' : (table.hideMinus ? '' : '-')}${(tx.amount || 0).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
    </div>
      ))}
    </div>
  );
}
