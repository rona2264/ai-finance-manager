# fAInance - AI Personal Finance Manager

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Node.js](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![MongoDB](https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Gemini](https://img.shields.io/badge/Google%20Gemini-8E75B2?style=for-the-badge&logo=google%20gemini&logoColor=white)

**fAInance** es una aplicación web Full-Stack de gestión financiera personal impulsada por Inteligencia Artificial (Google Gemini 2.5 Flash). Permite a los usuarios registrar, categorizar y analizar sus ingresos y gastos simplemente usando lenguaje natural a través de un chat.

🔗 **[Ver Demo en Vivo](https://fainance-frontend.vercel.app/)** *(Incluye opción de "Iniciar Demo" sin necesidad de registro)*

---

## ✨ Características Principales

- **Procesamiento de Lenguaje Natural:** Escribí "gasté 25000 en el súper" y fAInance va a extraer el monto, la categoría y va a crear el registro.
- **Dashboard Interactivo:** Gráficos en tiempo real (implementados con Chart.js) que muestran el balance, gastos por categoría y proyecciones a 12 meses de pagos en cuotas y gastos fijos.
- **Estado de Cuenta:** Visualización tabular de los movimientos, permitiendo filtrar por fechas, montos y categorías.
- **Autenticación Segura:** Gestión de usuarios mediante **Clerk**.
- **Exportación de Datos:** Descarga de reportes en Excel ordenados por pestañas (Movimientos, Tarjetas, Gastos Fijos).

---

## 🛠️ Stack usado

- **Frontend:** React.js, Vite, Tailwind CSS, Chart.js
- **Backend:** Node.js, Express.js
- **Base de Datos:** MongoDB
- **Servicios Externos:** Google Gemini API, Clerk
- **Despliegue:** Vercel y Render

---

## 💻 Instalación Local 

Si querés correr este proyecto en tu entorno local, hacé lo siguiente:

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/tu-usuario/ai-finance-manager.git
   cd ai-finance-manager
   ```

2. **Configurar el Backend:**
   ```bash
   cd backend
   npm install
   ```
   Creá un archivo `.env` basándote en el archivo `.env.example` ubicado en el root del repo y agregá tus API Keys. Luego, iniciá el servidor:
   ```bash
   npm run dev
   ```

3. **Configurar el Frontend:**
   ```bash
   cd ../frontend
   npm install
   ```
   Creá un archivo `.env` y agregá la clave pública de Clerk. Después, iniciá el cliente:
   ```bash
   npm run dev
   ```
