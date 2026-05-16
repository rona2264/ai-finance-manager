import React, { useState } from 'react';
import { saveProfile } from '../services/api';
import { useAuth, useUser } from '@clerk/clerk-react';

export default function Onboarding({ onComplete }) {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [onboardingStep, setOnboardingStep] = useState(1);
  const userId = user?.id;
  const userName = user?.firstName || 'Usuario';
  const [setupType, setSetupType] = useState(null);
  const [onboardingData, setOnboardingData] = useState({});
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const getQuestions = () => {
    if (setupType === 'precargado') {
      return [
        { key: 'salary', text: `Excelente, ${userName}. ¿Cuál es tu sueldo mensual neto?` },
        { key: 'available', text: '¿Cuánto dinero disponible (en cuenta o efectivo) tenés actualmente?' },
        { key: 'credit_card', text: '¿De cuánto es el monto a pagar en el resumen actual/próximo de tu tarjeta?' },
        { key: 'fixed_expenses', text: 'Por último, ¿cuánto estimás que suman tus gastos fijos mensuales?' }
      ];
    }
    return [
      { key: 'salary', text: `Perfecto ${userName}, empecemos simple. ¿Cuál es tu sueldo mensual?` },
      { key: 'available', text: '¿Cuánto dinero disponible tenés actualmente?' }
    ];
  };

  const questions = getQuestions();
  const totalSteps = setupType === 'precargado' ? 5 : 3;
  const progress = ((onboardingStep) / totalSteps) * 100;

  const handleOnboardingSubmit = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    // Guardar respuestas de las preguntas
    const currentQuestion = questions[onboardingStep - 2];
    const updatedData = { ...onboardingData, [currentQuestion.key]: inputValue };
    setOnboardingData(updatedData);
    setInputValue('');

    // Avanzar o terminar
    if (onboardingStep - 1 < questions.length) {
      setOnboardingStep(prev => prev + 1);
    } else {
      // Aquí guardamos en el backend - PASAMOS updatedData directamente
      saveProfileAndComplete(updatedData);
    }
  };

  const saveProfileAndComplete = async (finalData) => {
    setIsLoading(true);
    try {
      const token = await getToken();
      // Extraer el sueldo y el disponible de los datos capturados
      const monthlySalary = parseFloat(finalData.salary) || 0;
      const availableBalance = parseFloat(finalData.available) || 0;

      console.log('💾 Enviando al backend:', { userId, monthlySalary, availableBalance, finalData });

      await saveProfile({
        userId,
        monthly_salary: monthlySalary,
        available_balance: availableBalance,
        onboardingData: finalData
      }, token);

      // Una vez guardado en BD, llamamos a onComplete
      onComplete({ userId, onboardingData: finalData });
    } catch (error) {
      console.error('Error al guardar el perfil:', error);
      alert('Hubo un error guardando tu perfil. Intenta de nuevo.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-100 p-4 overflow-hidden relative">
      
      {/* Glow de fondo */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-2xl mx-auto bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-xl rounded-[2rem] shadow-2xl relative overflow-hidden flex flex-col min-h-[400px]">
        
        {/* Barra de progreso sutil */}
        <div className="w-full h-1 bg-zinc-900 absolute top-0 left-0">
          <div className="h-full bg-emerald-500 transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
        </div>

        <div className="flex-1 p-8 md:p-12 flex flex-col justify-center">
        
        {/* PASO 1: ELECCIÓN DE MODO */}
        {onboardingStep === 1 && (
          <div className="w-full animate-fade-in text-center">
            <div className="w-12 h-12 bg-zinc-800 rounded-2xl mx-auto flex items-center justify-center mb-6">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 text-zinc-300"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <h2 className="text-3xl font-semibold mb-2 tracking-tight">¡Hola, {userName}!</h2>
            <p className="text-zinc-400 mb-10">¿Cómo preferís configurar tu perfil para empezar?</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                onClick={() => { setSetupType('precargado'); setOnboardingStep(2); }}
                className="group border border-zinc-800 hover:border-emerald-500/50 bg-zinc-900/50 hover:bg-zinc-800/50 p-6 rounded-2xl transition-all text-left flex flex-col"
              >
                <h3 className="text-lg font-medium text-zinc-200 group-hover:text-emerald-400 mb-2 transition-colors">Datos precargados</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">Cargamos tu sueldo, tarjetas y gastos fijos para un análisis profundo desde el día uno.</p>
              </button>
              <button 
                onClick={() => { setSetupType('cero'); setOnboardingStep(2); }}
                className="group border border-zinc-800 hover:border-emerald-500/50 bg-zinc-900/50 hover:bg-zinc-800/50 p-6 rounded-2xl transition-all text-left flex flex-col"
              >
                <h3 className="text-lg font-medium text-zinc-200 group-hover:text-emerald-400 mb-2 transition-colors">Empezar de cero</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">Solo tu sueldo base y dinero en cuenta, vamos registrando datos sobre la marcha.</p>
              </button>
            </div>
          </div>
        )}

        {/* PASOS 2+: PREGUNTAS DINÁMICAS */}
        {onboardingStep >= 2 && (
          <form onSubmit={handleOnboardingSubmit} className="w-full animate-fade-in flex flex-col items-center text-center">
            <span className="text-emerald-500 font-mono text-xs mb-4 tracking-widest uppercase">Paso {onboardingStep} de {totalSteps}</span>
            <h2 className="text-2xl md:text-3xl font-medium mb-10 text-zinc-100 max-w-lg leading-tight tracking-tight">
              {questions[onboardingStep - 2]?.text}
            </h2>
            <div className="relative w-full max-w-xs">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-3xl text-zinc-500">$</span>
              <input 
                autoFocus
                type="number"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="0.00"
                disabled={isLoading}
                className="w-full bg-zinc-900/80 border border-zinc-800 focus:border-emerald-500 rounded-2xl text-center text-3xl py-4 pl-8 outline-none transition-all text-emerald-400 disabled:opacity-50 shadow-inner"
              />
            </div>
            <p className="text-zinc-500 text-sm mt-4">
              {isLoading ? 'Guardando tu perfil...' : 'Presiona Enter para continuar'}
            </p>
          </form>
        )}

        </div>
      </div>
    </div>
  );
}
