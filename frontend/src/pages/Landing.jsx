import React, { useState } from "react";
import { useSignIn } from '@clerk/clerk-react';

export default function Landing({ onStart }) {
  const { signIn, setActive, isLoaded } = useSignIn();
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  const handleDemoLogin = async (e) => {
    e.preventDefault();
    if (!isLoaded) {
      alert("Clerk aún está cargando la conexión, intentá en un segundo.");
      return;
    }
    setIsDemoLoading(true);

    try {
      const result = await signIn.create({
        identifier: '180m3vgla5@ruutukf.com', // USUARIO-DEMO-CLERK
        password: 'PasswordDemo123!'     // CONTRASEÑA-DEMO-CLERK
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        // Forzamos la recarga de la página para que la app detecte la sesión y entre al Dashboard
        window.location.reload();
      } else {
        alert(`El inicio de sesión requiere más pasos. Estado: ${result.status}. Verificá en Clerk que el usuario de prueba esté verificado y no requiera 2FA.`);
      }
    } catch (error) {
      console.error("Error iniciando sesión de demo:", error);
      alert(error.errors?.[0]?.message || "Hubo un error cargando la demo. Verificá que el usuario exista en Clerk.");
    } finally {
      setIsDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-emerald-500/30 overflow-hidden relative">
      {/* Glows de fondo estilo IA SaaS */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-600/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Navbar Minimalista */}
      <nav className="max-w-6xl mx-auto px-6 py-6 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5 text-zinc-950"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <span className="font-bold text-lg tracking-tight">fAInance</span>
        </div>
        <button onClick={handleDemoLogin} disabled={isDemoLoading} className="text-sm font-medium bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white px-4 py-2 rounded-xl transition-all disabled:opacity-50">
          {isDemoLoading ? 'Cargando...' : 'Iniciar demo'}
        </button>
      </nav>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-6 pt-24 pb-32 relative z-10 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/50 border border-zinc-800 backdrop-blur-md mb-8">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-medium text-zinc-300">Impulsado por Gemini 2.5 Flash</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-400 max-w-4xl mx-auto leading-tight">
          Inteligencia para tus <br className="hidden md:block"/> finanzas personales
        </h1>
        
        <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Registra, categoriza y analiza tus movimientos usando lenguaje natural. Tu asistente financiero personal diseñado para hacerte la vida más fácil.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <button onClick={onStart} className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold px-8 py-3.5 rounded-xl transition-all shadow-[0_0_40px_-10px_#10b981] flex items-center justify-center gap-2">
            Comenzar gratis
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
          <a href="https://github.com" target="_blank" rel="noreferrer" className="bg-zinc-900 hover:bg-zinc-800 text-zinc-50 border border-zinc-800 font-medium px-8 py-3.5 rounded-xl transition-all flex items-center justify-center gap-2">
            Ver en GitHub
          </a>
        </div>

        {/* Mockup Preview */}
        <div className="mt-24 w-full max-w-5xl mx-auto p-2 md:p-4 rounded-2xl md:rounded-[2rem] bg-zinc-900/30 border border-zinc-800/50 backdrop-blur-xl shadow-2xl">
          <div className="bg-zinc-950 rounded-xl md:rounded-2xl border border-zinc-800/50 overflow-hidden shadow-inner flex flex-col h-[400px]">
            <div className="h-12 border-b border-zinc-800/50 flex items-center px-4 gap-2">
              <div className="w-3 h-3 rounded-full bg-zinc-800" />
              <div className="w-3 h-3 rounded-full bg-zinc-800" />
              <div className="w-3 h-3 rounded-full bg-zinc-800" />
            </div>
            <div className="flex-1 p-6 flex flex-col gap-4 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-80">
              <div className="self-end bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm max-w-[80%] shadow-sm">
                Gasté 25.000 en el súper y me pagaron 150.000 por un trabajo freelance.
              </div>
              <div className="self-start bg-zinc-900 border border-zinc-800 px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm max-w-[80%] text-zinc-300 shadow-sm flex gap-3">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-emerald-500 mt-0.5"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                <p>¡Listo! Registré un <b>Gasto</b> de $25,000 en Supermercado y un <b>Ingreso Extra</b> de $150,000. Tu balance disponible se ha actualizado.</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Features Bento Grid */}
      <section className="max-w-6xl mx-auto px-6 py-24 border-t border-zinc-900 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Todo lo que necesitás</h2>
          <p className="text-zinc-400 max-w-2xl mx-auto">Olvidate de las hojas de cálculo complejas. Hablá con tus finanzas.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-zinc-900/40 border border-zinc-800/50 p-8 rounded-3xl backdrop-blur-sm hover:bg-zinc-900/60 transition-colors">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20 mb-6 text-emerald-400">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Lenguaje Natural</h3>
            <p className="text-zinc-400 leading-relaxed">Escribí como hablás. Nuestra IA impulsada por Gemini va a procesar el texto, entender el contexto y extraer toda la información automáticamente.</p>
          </div>
          <div className="bg-zinc-900/40 border border-zinc-800/50 p-8 rounded-3xl backdrop-blur-sm hover:bg-zinc-900/60 transition-colors">
            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20 mb-6 text-blue-400">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Dashboard en vivo</h3>
            <p className="text-zinc-400 leading-relaxed">Gráficos interactivos generados al instante.</p>
          </div>
          <div className="bg-zinc-900/40 border border-zinc-800/50 p-8 rounded-3xl backdrop-blur-sm hover:bg-zinc-900/60 transition-colors">
            <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center border border-purple-500/20 mb-6 text-purple-400">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Exportación Excel</h3>
            <p className="text-zinc-400 leading-relaxed">Descargá todo tu historial de movimientos en un click.</p>
          </div>
          <div className="md:col-span-2 bg-zinc-900/40 border border-zinc-800/50 p-8 rounded-3xl backdrop-blur-sm hover:bg-zinc-900/60 transition-colors">
            <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center border border-orange-500/20 mb-6 text-orange-400">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Control total</h3>
            <p className="text-zinc-400 leading-relaxed">Corregí, modificá o borrá transacciones simplemente pidiéndoselo al asistente. Tenés el control absoluto de tus números.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-10 text-center text-zinc-500 text-sm relative z-10">
        <p className="mb-2">Desarrollado por Ronaldo Fines</p>
        <div className="flex justify-center gap-4 text-xs font-mono">
          <span>React</span>•<span>Node.js</span>•<span>MongoDB</span>•<span>Gemini 2.5</span>•<span>chart.js</span>•<span>Clerk</span>
        </div>
      </footer>
    </div>
  );
}
