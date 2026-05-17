import { GoogleGenerativeAI } from '@google/generative-ai';
import Transaction from '../models/Transaction.js';
import UserProfile from '../models/UserProfile.js';
import ChatMessage from '../models/ChatMessage.js';

// Función para obtener la fecha local correcta en formato YYYY-MM-DD
const getLocalDate = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });

// Inicializar Gemini
let genAI;
let jsonModel;
let textModel;

if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  jsonModel = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash-lite",
    generationConfig: { responseMimeType: "application/json" }
  });
  textModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
}

// Convertido a función para que la fecha se calcule dinámicamente en cada mensaje
const getIntentSystemPrompt = () => `
Sos un extractor de datos financieros.

Tu objetivo es convertir el mensaje del usuario en una lista de acciones JSON.

Fecha actual: ${getLocalDate()}

Intenciones válidas:

* SET_SALARY
* ADD_INCOME
* ADD_EXPENSE
* UPDATE_TRANSACTION
* DELETE_TRANSACTION
* FINANCIAL_QUERY
* MARK_AS_PAID

Definiciones:

* SET_SALARY: crear o actualizar sueldo mensual.
* ADD_INCOME: registrar ingreso.
* ADD_EXPENSE: registrar gasto.
* UPDATE_TRANSACTION: corregir/modificar un movimiento existente.
* DELETE_TRANSACTION: eliminar/deshacer un movimiento.
* FINANCIAL_QUERY: consultas financieras o pedir datos faltantes.
* MARK_AS_PAID: marcar gasto pendiente como pagado.

Reglas generales:

1. Si el mensaje actual parece una corrección o continuación ("eran 5000", "fue en Vea"), usá el historial reciente para completar el contexto.

2. Nunca inventes:

  * montos
  * cuotas
  * comercios
  * categorías críticas

3. Si falta el monto exacto para registrar un ingreso/gasto:

  * NO uses ADD_INCOME ni ADD_EXPENSE
  * usá FINANCIAL_QUERY para pedir el monto

4. description es obligatorio:

  * máximo 5 palabras
  * inferilo si hace falta
    Ejemplos:
  * "Supermercado"
  * "Cuota alimentaria"

5. merchant:

  * usar comercio/entidad si existe
  * si no existe, usar rubro
  * fallback: "General"

6. Gastos pendientes vs pagados (isPaid):
  * Por defecto, asumí siempre que los gastos YA SE PAGARON (isPaid: true), especialmente si el usuario usa verbos en pasado (compré, gasté, transferí, pasé, pagué).
  * SOLO seteá "isPaid": false si el usuario indica explícitamente que es algo a futuro, que solo lo está registrando, que "tiene que pagar" algo, o si dice "no lo descuentes".

7. Si el usuario indica que pagó un pendiente existente:
    Ejemplos:

  * "ya pagué la luz"
  * "aboné el alquiler"

  Usar:

  * MARK_AS_PAID

  Nunca crear otro ADD_EXPENSE para eso.

8. Tarjeta de crédito:

  * Si paga el resumen -> isCreditCardPayment: true
  * Si solo compra con tarjeta -> NO usar isCreditCardPayment

9. Cuotas:
   Si una compra es en cuotas:

    * isInstallment: true
    * installments: cantidad
    * amount: monto TOTAL

10. Pagos mixtos:
    Si parte fue contado y parte financiado:

    * generar DOS ADD_EXPENSE separados

11. Categoría "Sueldo":
    Usarla obligatoriamente para:

    * sueldo atrasado
    * aguinaldo
    * bonos salariales

12. Transferencias:
    * "le pasé plata", "transferí", "envié" -> GASTO (ADD_EXPENSE)
    * "me pasaron", "recibí", "me transfirieron" -> INGRESO (ADD_INCOME)
    * Si el usuario corrige el tipo de movimiento (ej: "era un gasto, no ingreso"), usá UPDATE_TRANSACTION incluyendo "type": "expense" (para gasto) o "income" (para ingreso).

PROYECCIONES FUTURAS Y CAPACIDAD DE AHORRO:

    Cuando el usuario pregunte por ahorro futuro, capacidad de ahorro o proyecciones a X meses:

    1. NO asumas que todas las cuotas duran todo el período proyectado.

    2. Para cada gasto en cuotas:

    * calcular únicamente los meses restantes
    * si una cuota termina antes del horizonte consultado, dejar de incluirla después de su finalización

    Ejemplo:

    * Compra a 6 cuotas
    * Si el usuario pregunta proyección a 12 meses:

      * incluir la cuota solo durante 6 meses
      * NO multiplicarla por 12

    3. Diferenciar:

    * gastos recurrentes permanentes → se proyectan durante todo el período
    * cuotas → solo durante los meses pendientes

    4. La capacidad de ahorro futura debe calcularse usando flujo real por período, no un único saldo mensual multiplicado linealmente.

    5. Si existen cuotas con distintas fechas de finalización:

    * calcular el ahorro acumulado mes por mes
    * sumar el total final correctamente

    6. Ignorar cuotas ya pagadas o finalizadas.

    7. Si no existe información suficiente para saber cuántas cuotas faltan:

    * aclarar la limitación
    * usar FINANCIAL_QUERY si es necesario

    Ejemplo correcto:

    * Sueldo: $2.000.000
    * Gasto fijo permanente: $230.000
    * Cuota A: $100.000 por 3 meses
    * Cuota B: $50.000 por 6 meses

    NO hacer:
    ($2.000.000 - $380.000) * 12

    SÍ hacer:
    Meses 1-3:
    $2.000.000 - $230.000 - $100.000 - $50.000

    Meses 4-6:
    $2.000.000 - $230.000 - $50.000

    Meses 7-12:
    $2.000.000 - $230.000

    Y sumar el ahorro acumulado total.


Estructura JSON obligatoria:
{
"actions": [
{
"intent": "SET_SALARY" | "ADD_INCOME" | "ADD_EXPENSE" | "UPDATE_TRANSACTION" | "DELETE_TRANSACTION" | "FINANCIAL_QUERY" | "MARK_AS_PAID",
"data": {
    "type": "string",
"amount": number,
"category": "string",
"merchant": "string",
"description": "string",
"isInstallment": boolean,
"installments": number,
"isRecurring": boolean,
"isCreditCardPayment": boolean,
"isPaid": boolean
}
}
],
"summary": "Resumen breve de lo procesado"
}

Salida:

* devolver SOLO JSON válido
* sin explicaciones
* sin markdown
* sin comentarios

`;

export const handleChat = async (req, res) => {
  const { text, userId, history = [] } = req.body;

  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ message: "Falta configurar GEMINI_API_KEY en el .env" });
    }

    // Formatear el historial (limitamos a los últimos 6 mensajes para no sobrecargar el prompt)
    let formattedHistory = "";
    if (history && history.length > 0) {
      const recentHistory = history.slice(-6);
      formattedHistory = "Historial reciente:\n" + recentHistory.map(m => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.text}`).join('\n') + "\n\n";
    }

    // PASO 1: Detectar Intención usando el modelo JSON
    const prompt = `${getIntentSystemPrompt()}\n\n${formattedHistory}Mensaje actual del usuario: "${text}"`;
    
    const result = await jsonModel.generateContent(prompt);
    const { actions, summary } = JSON.parse(result.response.text());

    let finalMessage = summary;
    
    // PASO 2: Ejecutar lógica según intención detectada en paso 1
    for (const action of actions) {
        // Failsafe: Si Gemini intenta registrar un movimiento sin monto, lo forzamos a preguntar
        if (['ADD_EXPENSE', 'ADD_INCOME', 'SET_SALARY'].includes(action.intent) && (action.data.amount === undefined || action.data.amount === null)) {
            action.intent = 'FINANCIAL_QUERY';
        }

        if (action.intent === 'SET_SALARY') {
            await UserProfile.findOneAndUpdate(
                { userId },
                { $set: { monthly_salary: action.data.amount, last_salary_update: new Date() } },
                { upsert: true }
            );
        }

        if (action.intent === 'ADD_INCOME') {
                await new Transaction({
                userId,
                type: 'income',
                category: action.data.category || 'Ingreso Extra',
                description: action.data.description,
                amount: action.data.amount,
                date: action.data.date || getLocalDate()
            }).save();
        }

        if (action.intent === 'ADD_EXPENSE') {
            await new Transaction({
                userId,
                type: 'expense',
                category: action.data.category || 'Varios',
                merchant: action.data.merchant || 'General',
                description: action.data.description,
                amount: action.data.amount,
                date: action.data.date || getLocalDate(),
                isInstallment: action.data.isInstallment || false,
                isRecurring: action.data.isRecurring || false,
                isCreditCardPayment: action.data.isCreditCardPayment || false,
                isPaid: action.data.isPaid !== undefined ? action.data.isPaid : true,
                installmentDetails: {
                    totalInstallments: action.data.installments || 1,
                    installmentAmount: (action.data.isInstallment && action.data.installments > 1) 
                        ? Number((action.data.amount / action.data.installments).toFixed(2)) 
                        : action.data.amount
                }
            }).save();
        }

        if (action.intent === 'UPDATE_TRANSACTION' || action.intent === 'UPDATE_LAST_TRANSACTION') {
            const searchTerm = action.data.description || action.data.category || action.data.merchant;
            let query = { userId };
            
            // Si se dio un término y el usuario no dijo explícitamente "último/ultimo", buscamos por nombre
            if (searchTerm && !text.toLowerCase().includes('ultimo') && !text.toLowerCase().includes('último')) {
                query.$or = [
                    { description: { $regex: searchTerm, $options: 'i' } },
                    { category: { $regex: searchTerm, $options: 'i' } },
                    { merchant: { $regex: searchTerm, $options: 'i' } }
                ];
            }

            const targetTx = await Transaction.findOne(query).sort({ createdAt: -1 });
            if (targetTx) {
                if (action.data.type && ['expense', 'income'].includes(action.data.type)) targetTx.type = action.data.type;
                if (action.data.amount !== undefined) targetTx.amount = action.data.amount;
                if (action.data.category) targetTx.category = action.data.category;
                if (action.data.merchant) targetTx.merchant = action.data.merchant;
                if (action.data.description) targetTx.description = action.data.description;
                if (action.data.isPaid !== undefined) targetTx.isPaid = action.data.isPaid;
                
                if (action.data.isInstallment !== undefined) targetTx.isInstallment = action.data.isInstallment;
                if (action.data.installments !== undefined) {
                    if (!targetTx.installmentDetails) targetTx.installmentDetails = {};
                    targetTx.installmentDetails.totalInstallments = action.data.installments;
                }
                
                if (targetTx.isInstallment && targetTx.installmentDetails?.totalInstallments > 1) {
                    targetTx.installmentDetails.installmentAmount = Number((targetTx.amount / targetTx.installmentDetails.totalInstallments).toFixed(2));
                } else {
                    if (!targetTx.installmentDetails) targetTx.installmentDetails = {};
                    targetTx.installmentDetails.installmentAmount = targetTx.amount;
                }

                await targetTx.save();
            }
        }

        if (action.intent === 'DELETE_TRANSACTION' || action.intent === 'DELETE_LAST_TRANSACTION') {
            const searchTerm = action.data.description || action.data.category || action.data.merchant;
            let query = { userId };
            
            if (searchTerm && !text.toLowerCase().includes('ultimo') && !text.toLowerCase().includes('último')) {
                query.$or = [
                    { description: { $regex: searchTerm, $options: 'i' } },
                    { category: { $regex: searchTerm, $options: 'i' } },
                    { merchant: { $regex: searchTerm, $options: 'i' } }
                ];
            }
            
            const targetTx = await Transaction.findOne(query).sort({ createdAt: -1 });
            if (targetTx) {
                await Transaction.findByIdAndDelete(targetTx._id);
            }
        }

        if (action.intent === 'MARK_AS_PAID') {
            const searchTerm = action.data.description || action.data.category || action.data.merchant;
            if (searchTerm) {
                // Buscamos el último gasto PENDIENTE que coincida con lo que el usuario dijo
                const pendingTx = await Transaction.findOne({ 
                    userId, 
                    isPaid: false,
                    $or: [
                        { description: { $regex: searchTerm, $options: 'i' } },
                        { category: { $regex: searchTerm, $options: 'i' } },
                        { merchant: { $regex: searchTerm, $options: 'i' } }
                    ]
                }).sort({ createdAt: -1 });
                
                if (pendingTx) {
                    pendingTx.isPaid = true; // Lo marcamos como pagado
                    pendingTx.date = getLocalDate(); // Actualizamos la fecha a "hoy"
                    await pendingTx.save();
                }
            }
        }

        if (action.intent === 'FINANCIAL_QUERY') {
            const profile = await UserProfile.findOne({ userId });
            const transactions = await Transaction.find({ userId }).sort({ date: -1 }).limit(100);
            
            const context = {
                salary: profile?.monthly_salary || 0,
                recent_history: transactions,
                query: text
            };

            const queryPrompt = `Actuá como un asistente financiero personal minimalista, directo y preciso.

                                Vas a recibir datos en formato JSON con el contexto financiero del usuario.
                                
                                REGLA DE SEGURIDAD CRÍTICA: ESTÁ TOTAL Y ESTRICTAMENTE PROHIBIDO IMPRIMIR, COPIAR O INCLUIR EL TEXTO O ESTRUCTURA DEL JSON EN TU RESPUESTA. Tu respuesta debe ser EXCLUSIVAMENTE texto en lenguaje natural.

                                REGLAS GENERALES:
                                1. Respondé de forma breve y directa. Sin saludos.
                                2. Leé completamente el mensaje y el contexto. Nunca digas que falta información si ya existe.
                                3. Nunca te contradigas ni asumas cosas que el usuario no dijo explícitamente.
                                4. Respondé únicamente sobre temas financieros personales.
                                
                                REGLAS DE REGISTRO (FALTAN DATOS):
                                5. Si el usuario dice que compró, pagó, gastó, cobró, recibió o le transfirieron algo PERO NO INDICA UN MONTO NUMÉRICO EXACTO EN SU MENSAJE, tu ÚNICA RESPUESTA debe ser pedir el monto.
                                * NUNCA asumas montos.
                                * NUNCA busques un monto en el historial para rellenarlo o adivinarlo si el usuario no lo dijo explícitamente hoy.
                                * NUNCA confirmes que se registró algo si falta el monto.
                                * Ejemplo 1: "Compré un televisor" -> "¿Cuánto te salió en total?"
                                * Ejemplo 2: "Me transfirieron plata" -> "¡Qué bueno! ¿Cuánta plata recibiste?"
                                
                                6. Si el usuario menciona una cuota o gasto fijo ambiguo sin aclarar si lo pagó, preguntá si ya lo pagó.
                                
                                CONSULTAS Y CÁLCULOS:
                                7. Si consulta el historial, usá exclusivamente los datos adjuntos.
                                8. Para proyecciones y ahorro:
                                * Detectá el plazo mencionado.
                                * Para cuotas (isInstallment: true), usá el valor mensual (installmentDetails.installmentAmount), nunca el total.
                                * Sumá gastos recurrentes (isRecurring: true y type: expense).
                                * Cálculo base: sueldo - cuotas mensuales - gastos fijos.
                                * Multiplicá por la cantidad de meses solicitada y asegurá la coherencia matemática.
                                
                                REGLA DE LENGUAJE:
                                9. LENGUAJE HUMANO: ESTÁ TOTALMENTE PROHIBIDO usar jerga de programación, nombres de variables (ej: isPaid, type) o mostrar el código JSON.

                                Forma de hablar:

                                * Usá español rioplatense natural con voseo.
                                * Tono directo, claro y humano.
                                * Evitá exagerar modismos.
                                * Usá vocabulario argentino natural:

                                  * plata
                                  * celular
                                  * compu/computadora
                                  * depto/departamento
                                  * colectivo/bondi

                                Datos de contexto (NO LOS MUESTRES AL USUARIO):
                                ${JSON.stringify(context)}`;

            const prediction = await textModel.generateContent(queryPrompt);
            finalMessage = prediction.response.text();
        }
    }

    // Guardar ambos mensajes en la base de datos antes de responder
    await new ChatMessage({ userId, role: 'user', text }).save();
    await new ChatMessage({ userId, role: 'ai', text: finalMessage || "Datos procesados correctamente." }).save();

    res.json({ message: finalMessage || "Datos procesados correctamente." });

  } catch (error) {
    console.error("❌ Error procesando el chat:", error.message);
    
    if (error.message.includes('503') || error.message.includes('high demand') || error.message.includes('Service Unavailable')) {
      return res.status(503).json({ 
        message: "⚠️ Los servidores de inteligencia artificial (Google Gemini) están experimentando una alta demanda temporal. Por favor, intenta de nuevo en un minuto." 
      });
    }

    if (error.message.includes('API_KEY_INVALID') || error.message.includes('400') || error.message.includes('403')) {
      return res.status(401).json({ 
        message: "⚠️ Problema de configuración externa: La API Key del proveedor de IA no es válida o expiró." 
      });
    }
    
    if (error.message.includes('exceeded your current quota')) {
      return res.status(429).json({
        message: "⚠️ Se excedió el rate-limit de la API de Gemini" 
      }); 
    }
    res.status(500).json({ 
      message: "❌ Error interno del servidor al procesar la solicitud." 
    });
  }
};

export const getChatHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const messages = await ChatMessage.find({ userId }).sort({ createdAt: 1 });
    res.json(messages.map(m => ({ _id: m._id, role: m.role, text: m.text, createdAt: m.createdAt })));
  } catch (error) {
    console.error("Error obteniendo historial:", error);
    res.status(500).json({ error: "Error obteniendo el historial de chat" });
  }
};

export const getGreeting = async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ message: "Falta configurar GEMINI_API_KEY en el .env" });
    }
    
    const prompt = `Escribí un breve texto introductorio (una sola oración, máximo 5 palabras) para acompañar el título "¿Cómo te ayudo hoy?" en un asistente financiero de IA. Debe tener un tono profesional, minimalista y servicial, estilo Claude o Vercel. No uses frases cursis ni emojis. Ejemplo: "Soy todo oídos." Solo responde con la oración generada.`;
    
    const result = await textModel.generateContent(prompt);
    res.json({ greeting: result.response.text().trim().replace(/^["']|["']$/g, '') });
  } catch (error) {
    console.error("Error generando saludo:", error.message);
    res.status(500).json({ error: "Error generando saludo" });
  }
};

export const deleteChatMessages = async (req, res) => {
  try {
    const { messageIds } = req.body;
    await ChatMessage.deleteMany({ _id: { $in: messageIds } });
    res.json({ success: true, message: "Mensajes eliminados correctamente" });
  } catch (error) {
    console.error("Error eliminando mensajes:", error);
    res.status(500).json({ error: "Error eliminando mensajes de chat" });
  }
};