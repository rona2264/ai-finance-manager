import React, { useState, useEffect, useRef } from 'react';
import { getProfileStatus, sendChatMessage, getChatHistory, getGreeting, deleteChatMessages } from '../services/api';
import { UserButton, useAuth, useUser, useClerk } from '@clerk/clerk-react';
import Charts from '../components/Charts';
import History from '../components/History';

export default function Chat({ onboardingData }) {
  const { getToken } = useAuth();
  const { user } = useUser();
  const { openUserProfile } = useClerk();
  const userId = user?.id;
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'charts' | 'history'
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState({ salary: 0, remaining: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [groupedHistory, setGroupedHistory] = useState({});
  const [currentViewDate, setCurrentViewDate] = useState('new');
  const [showScrollArrow, setShowScrollArrow] = useState(false);
  const messagesEndRef = useRef(null);
  const [greeting, setGreeting] = useState('Soy todo oídos.');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [contextMenu, setContextMenu] = useState(null);

  const fetchStatus = async () => {
    try {
      const token = await getToken();
      const data = await getProfileStatus(userId, token);
      setStatus(data);
    } catch (e) {
      console.error("Error conectando al servidor:", e);
    }
  };

  const fetchHistory = async () => {
    try {
      const token = await getToken();
      const history = await getChatHistory(userId, token);
      if (history.length > 0) {
        const groups = history.reduce((acc, msg) => {
          const d = new Date(msg.createdAt);
          const dateStr = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
          if (!acc[dateStr]) acc[dateStr] = [];
          acc[dateStr].push(msg);
          return acc;
        }, {});
        setGroupedHistory(groups);
      }
    } catch (e) {
      console.error("Error cargando historial de chat", e);
    }
  };

  const fetchGreeting = async () => {   //en startNewChat la función está comentada por lo que no está en uso
    try {
      const token = await getToken();
      const data = await getGreeting(token);
      if (data.greeting) setGreeting(data.greeting);
    } catch (e) {
      setGreeting('Soy todo oídos.');
    }
  };

  const startNewChat = () => {
    setCurrentViewDate('new');
    setMessages([]);
    //fetchGreeting(); // no me gustan los mensajes que escribe Gemini sin importar el prompt que le dé.
  };

  const loadChatDay = (dateStr) => {
    setCurrentViewDate(dateStr);
    setMessages(groupedHistory[dateStr] || []);
  };

  useEffect(() => { 
    const initChat = async () => {
      if (!userId) return;
      fetchStatus();
      await fetchHistory();
      startNewChat();
    };
    initChat();
  }, [userId]);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const handleContextMenu = (e, dateStr) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, dateStr });
  };

  const handleDeleteChat = async (dateStr) => {
    const messagesToDelete = groupedHistory[dateStr];
    if (!messagesToDelete) return;

    const messageIds = messagesToDelete.map(m => m._id);
    try {
      const token = await getToken();
      await deleteChatMessages(token, messageIds);
      setGroupedHistory(prev => {
        const newHistory = { ...prev };
        delete newHistory[dateStr];
        return newHistory;
      });
      if (currentViewDate === dateStr) startNewChat();
    } catch (error) {
      console.error("Error al eliminar chat:", error);
    }
  };

  const scrollToBottom = () => {  //animación suave scroll down en el chat al presionar "botón ir a último mensaje"
    const container = document.getElementById('chat-scroll-container');
    if (container) {
      const start = container.scrollTop;
      const end = container.scrollHeight - container.clientHeight;
      const distance = end - start;
      if (distance <= 0) return;
      const duration = 250; 
      let startTime = null;
      const animateScroll = (time) => {
        if (!startTime) startTime = time;
        const progress = Math.min((time - startTime) / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        container.scrollTop = start + distance * easeOut;
        if (progress < 1) requestAnimationFrame(animateScroll);
      };
      requestAnimationFrame(animateScroll);
    } else {
      messagesEndRef.current?.scrollIntoView();
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleScroll = (e) => {
    const currentY = e.currentTarget.scrollTop;
    const isNearBottom = e.currentTarget.scrollHeight - currentY <= e.currentTarget.clientHeight + 150;
    setShowScrollArrow(!isNearBottom);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsLoading(true);

    try {
      const token = await getToken();
      // Se envia la lista de mensajes actuales para que Gemini tenga mayor contexto en caso de un prompt vago por parte del usuario
      const data = await sendChatMessage(userMsg, userId, token, messages);
      
      setMessages(prev => [...prev, { role: 'ai', text: data.message }]);
      fetchStatus();
      await fetchHistory();
      setRefreshTrigger(prev => prev + 1);
      
    } catch (error) {
      const errorMsg = error.message === 'Failed to fetch' 
        ? "🔌 Error de red: El servidor local parece estar apagado."
        : error.message;

      setMessages(prev => [...prev, { role: 'ai', text: errorMsg }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col font-sans overflow-hidden relative">
      {/* NAVEGACIÓN SUPERIOR FIJA */}
      <nav className="absolute top-0 left-0 w-full bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center z-50">
        <div className="flex items-center gap-2">
          <div className="md:hidden flex items-center">
            <UserButton />
          </div>
          <h1 className="font-bold text-slate-800 text-lg tracking-tight ml-1">fAInance</h1>
        </div>
        
        {/* TABS DE ESCRITORIO */}
        <div className="hidden md:flex gap-6 absolute left-1/2 -translate-x-1/2">
          <button onClick={() => setActiveTab('chat')} className={`flex items-center gap-2 font-medium text-sm px-3 py-1.5 rounded-lg transition-all ${activeTab === 'chat' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            Chat
          </button>
          <button onClick={() => setActiveTab('charts')} className={`flex items-center gap-2 font-medium text-sm px-3 py-1.5 rounded-lg transition-all ${activeTab === 'charts' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
            Dashboard
          </button>
          <button onClick={() => setActiveTab('history')} className={`flex items-center gap-2 font-medium text-sm px-3 py-1.5 rounded-lg transition-all ${activeTab === 'history' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M3 3v18h18"/><path d="M3 9h18"/><path d="M3 15h18"/></svg>
            Estado de Cuenta
          </button>
        </div>

        <div className="flex gap-4">
          <div className="flex flex-col items-end bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5 leading-none">Disponible</p>
            <div className="flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-slate-500"><rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/></svg>
              <p className={`text-sm font-bold tracking-tight leading-none ${status.remaining < 0 ? 'text-red-600' : 'text-slate-800'}`}>
                ${status.remaining.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </nav>

      {/* WRAPPER PRINCIPAL DESPLAZADO POR NAVBAR */}
      <div className="flex-1 flex flex-col overflow-hidden pt-[72px]">
        {/* TABS PARA TELÉFONOS */}
        <div className="flex md:hidden justify-center gap-2 bg-white border-b border-slate-200 py-2 px-2 z-0 shrink-0">
          <button onClick={() => setActiveTab('chat')} className={`flex-1 flex justify-center py-2 rounded-lg text-sm font-medium ${activeTab === 'chat' ? 'bg-slate-100 text-slate-900' : 'text-slate-500'}`}>Chat</button>
          <button onClick={() => setActiveTab('charts')} className={`flex-1 flex justify-center py-2 rounded-lg text-sm font-medium ${activeTab === 'charts' ? 'bg-slate-100 text-slate-900' : 'text-slate-500'}`}>Dashboard</button>
          <button onClick={() => setActiveTab('history')} className={`flex-1 flex justify-center py-2 rounded-lg text-sm font-medium ${activeTab === 'history' ? 'bg-slate-100 text-slate-900' : 'text-slate-500'}`}>Estado Cta</button>
        </div>

        {/* CONTENEDOR PRINCIPAL DINÁMICO */}
        <div className={`flex flex-1 overflow-hidden ${activeTab === 'chat' ? '' : 'hidden'}`}>
            {/* SIDEBAR HISTORIAL */}
            <aside className="w-64 bg-white border-r border-slate-200 flex-col hidden md:flex z-10">
              <div className="p-4 border-b border-slate-100 sticky top-0 bg-white">
                <button onClick={startNewChat} className="w-full flex items-center justify-center gap-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-4 py-2.5 rounded-xl font-medium transition-colors">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M12 5v14M5 12h14"/></svg>
                  Nuevo Chat
                </button>
              </div>
              <div className="p-3 flex flex-col gap-1 overflow-y-auto flex-1">
                {Object.keys(groupedHistory).reverse().map(dateStr => (
                  <button 
                    key={dateStr} 
                    onClick={() => loadChatDay(dateStr)} 
                    onContextMenu={(e) => handleContextMenu(e, dateStr)}
                    className={`text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${currentViewDate === dateStr ? 'bg-slate-100 text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 border border-transparent'}`}
                  >
                    Chat del {dateStr}
                  </button>
                ))}
              </div>
              
              {/* BOTÓN PERFIL DE USUARIO */}
              <div className="p-4 border-t border-slate-100 mt-auto bg-slate-50/50">
                <button 
                  onClick={() => openUserProfile()} 
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-200 rounded-xl transition-colors text-left"
                >
                  <img src={user?.imageUrl} alt="Profile" className="w-8 h-8 rounded-full border border-slate-300 shadow-sm object-cover" />
                  <span className="font-medium text-sm text-slate-700 truncate">{user?.fullName || user?.firstName || 'Tu Perfil'}</span>
                </button>
              </div>
            </aside>
            
            {/* ÁREA DE CHAT Y FORMULARIO */}
            <div className="flex-1 relative flex flex-col overflow-hidden">
              <div id="chat-scroll-container" className="flex-1 overflow-y-auto bg-slate-50" onScroll={handleScroll}>
                <div className="max-w-3xl mx-auto w-full flex flex-col gap-5 p-4 md:p-6 min-h-[calc(100%-80px)]">
            
                  {/* EMPTY STATE */}
                  {messages.length === 0 && !isLoading && currentViewDate === 'new' && (
                    <div className="flex flex-col items-center justify-center mt-12 md:mt-24 animate-fade-in text-center px-4">
                      <div className="w-12 h-12 bg-white border border-slate-200 shadow-sm rounded-2xl flex items-center justify-center mb-4 text-emerald-500">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                      </div>
                      <h2 className="text-2xl font-bold text-slate-800 mb-2">Hola, {user?.firstName || 'Usuario'}. ¿Cómo te ayudo hoy?</h2>
                      <p className="text-slate-500 max-w-md mb-8 transition-opacity duration-500">{greeting}</p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
                        {['Compré algo en el súper', 'Me transfirieron plata 🤑', '¿Cuánto tengo que pagar el mes que viene?', 'Borrá el último gasto'].map((suggestion, i) => (
                          <button key={i} onClick={() => setInput(suggestion)} className="bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-sm text-slate-600 text-sm py-3 px-4 rounded-xl text-left transition-all">
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-3 w-full animate-fade-in ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.role === 'ai' && (
                        <div className="w-8 h-8 rounded-full border border-slate-200 bg-white flex items-center justify-center text-emerald-600 flex-shrink-0 shadow-sm mt-1">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                        </div>
                      )}
                      <div className={`px-5 py-3.5 max-w-[85%] sm:max-w-[75%] text-[15px] leading-relaxed ${msg.role === 'user' ? 'bg-emerald-600 text-white rounded-2xl rounded-tr-sm shadow-sm' : 'bg-white text-slate-800 border border-slate-200 rounded-2xl rounded-tl-sm shadow-sm'}`}>
                        <p>{msg.text}</p>
                      </div>
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex gap-3 w-full justify-start animate-fade-in">
                      <div className="w-8 h-8 rounded-full border border-slate-200 bg-white flex items-center justify-center text-emerald-600 flex-shrink-0 shadow-sm mt-1">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                      </div>
                      <div className="px-5 py-4 bg-white border border-slate-200 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1.5 h-[52px]">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} className="h-2" />
                </div>
              </div>

              {showScrollArrow && (
                 <button onClick={scrollToBottom} className="absolute bottom-28 right-6 md:right-10 bg-white border border-slate-200 text-slate-500 hover:text-emerald-600 p-3 rounded-full shadow-lg transition-all hover:scale-110 z-40">
                   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
                 </button>
              )}

              {/* BARRA DE ENTRADA */}
              <div className="w-full bg-slate-50 p-4 pb-6 border-t border-slate-200/50 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)] shrink-0 z-30 relative">
                <div className="max-w-3xl mx-auto relative">
                  <form onSubmit={handleSend} className="relative flex items-center shadow-lg rounded-2xl bg-white border border-slate-200 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all">
                    <input 
                      type="text"
                      placeholder="Consultale a fAInance..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      disabled={isLoading}
                      className="flex-1 bg-transparent px-5 py-4 outline-none text-slate-800 placeholder-slate-400 text-base"
                    />
                    <button 
                      type="submit"
                      disabled={isLoading || !input.trim()}
                      className="absolute right-2 bg-emerald-600 text-white rounded-xl p-2 hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:hover:bg-emerald-600"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                    </button>
                  </form>
                  <p className="text-center text-xs text-slate-400 mt-3 font-medium">La inteligencia artificial puede cometer errores. Verificá tus números.</p>
                </div>
              </div>
            </div>
        </div>
        
        <div className={`flex-1 overflow-y-auto w-full p-4 md:p-6 ${activeTab === 'charts' ? 'block' : 'hidden'}`}>
          <Charts userId={userId} refreshTrigger={refreshTrigger} />
        </div>
        
        <div className={`flex-1 overflow-y-auto w-full p-4 md:p-6 ${activeTab === 'history' ? 'block' : 'hidden'}`}>
          <History userId={userId} remaining={status.remaining} refreshTrigger={refreshTrigger} />
        </div>
      </div>

      {/* MENÚ CONTEXTUAL */}
      {contextMenu && (
        <div 
          className="fixed bg-white border border-slate-200 shadow-xl rounded-lg py-1 z-[100] min-w-[150px] animate-fade-in"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button 
            onClick={() => handleDeleteChat(contextMenu.dateStr)}
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            Eliminar chat
          </button>
        </div>
      )}
    </div>
  );
}
