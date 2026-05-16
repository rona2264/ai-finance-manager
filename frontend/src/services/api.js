const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const EXPORT_URL = `${API_URL}/export`;

export const saveProfile = async (profileData, token) => {
  const response = await fetch(`${API_URL}/profile`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(profileData)
  });
  
  if (!response.ok) {
    throw new Error('Error guardando el perfil');
  }
  return response.json();
};

export const getProfileStatus = async (userId, token) => {
  const response = await fetch(`${API_URL}/profile/${userId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Error obteniendo el perfil');
  return response.json();
};

export const sendChatMessage = async (text, userId, token, history = []) => {
  const response = await fetch(`${API_URL}/chat`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ text, userId, history })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Error desconocido del servidor.");
  }
  return data;
};

export const getGreeting = async (token) => {
  const response = await fetch(`${API_URL}/chat/greeting`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Error obteniendo el saludo');
  return response.json();
};

export const deleteChatMessages = async (token, messageIds) => {
  const response = await fetch(`${API_URL}/chat/delete`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ messageIds })
  });
  if (!response.ok) throw new Error('Error eliminando mensajes');
  return response.json();
};

export const getChatHistory = async (userId, token) => {
  const response = await fetch(`${API_URL}/chat/${userId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Error obteniendo el historial');
  return response.json();
};

export const getUserTransactions = async (userId, token) => {
  const response = await fetch(`${API_URL}/transactions/${userId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Error obteniendo transacciones');
  return response.json();
};

export const deleteTransactions = async (token, transactionIds) => {
  const response = await fetch(`${API_URL}/transactions/delete`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ transactionIds })
  });
  if (!response.ok) throw new Error('Error eliminando transacciones');
  return response.json();
};