import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Inicializamos el cliente de OpenAI. Automáticamente leerá tu OPENAI_API_KEY del .env.local
const openai = new OpenAI();

export async function POST(req: Request) {
  try {
    // Recibimos los datos desde el teléfono del comensal
    const { messages, businessName, menuCatalog, aiPrompt } = await req.json();

    // ESTO ES LO QUE VALE $69 USD AL MES: El System Prompt Dinámico
    const systemPrompt = {
      role: "system",
      content: `Eres el asistente virtual exclusivo y experto en ventas de un negocio llamado "${businessName}".
      
      INSTRUCCIONES ESPECÍFICAS DEL DUEÑO DEL NEGOCIO:
      ${aiPrompt || 'Sé un vendedor amable y eficiente.'}
      
      OBJETIVO:
      Atender a los clientes de forma amable, persuasiva y muy rápida (respuestas cortas, ideales para leer en un móvil). Ayúdales a decidir qué ordenar y recomienda complementos para subir el ticket promedio.
      
      REGLAS ESTRICTAS:
      1. NUNCA inventes platillos, ingredientes o precios. Basa tus respuestas ÚNICAMENTE en el catálogo proporcionado.
      2. Si el usuario pregunta cosas que no tienen que ver con el restaurante (ej. matemáticas, política, programación), declina cortésmente diciendo que eres un experto culinario/vendedor y redirige la conversación a los productos.
      3. Mantén un tono cálido y servicial.
      
      CATÁLOGO DEL RESTAURANTE (JSON):
      ${JSON.stringify(menuCatalog)}`
    };

    // Construimos el array de mensajes (Reglas del sistema + Historial de chat del usuario)
    const apiMessages = [systemPrompt, ...messages];

    // Llamada al modelo Tier 1 para costo-efectividad
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: apiMessages,
      temperature: 0.7, // 0.7 le da un tono natural y conversacional sin ser impredecible
      max_tokens: 300,  // Limitamos el largo para mantener respuestas concisas y baratas
    });

    return NextResponse.json({ reply: response.choices[0].message.content });

  } catch (error) {
    console.error("Error en el cerebro de IA:", error);
    return NextResponse.json({ error: "Falla de conexión sináptica" }, { status: 500 });
  }
}