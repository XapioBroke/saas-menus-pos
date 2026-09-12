import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    // 1. Recibimos el systemPrompt dinámico que inyectamos desde el Frontend
    const { messages, systemPrompt } = await req.json();

    // Validación de seguridad de la llave
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { reply: "Error interno: API Key de OpenAI no configurada en el servidor." }, 
        { status: 500 }
      );
    }

    // 2. Arquitectura Tier 1: Fusión de Contexto + Reglas Duras
    // Tomamos el menú y configuración del cliente, y le blindamos las reglas de negocio
    const finalSystemContent = `
${systemPrompt || 'Eres un asistente virtual experto en ventas.'}

=== REGLAS OPERATIVAS ESTRICTAS (PRIORIDAD ALTA) ===
1. Responde de forma amable, persuasiva, concisa y muy natural (como un humano en WhatsApp).
2. NO INVENTES precios, ni productos, ni promociones que no estén en el menú proporcionado arriba. Si no está en la lista, di cortésmente que no lo manejan.
3. Tu objetivo es resolver dudas y guiar al cliente sutilmente para que agregue productos a su carrito en la plataforma.
4. Si preguntan sobre métodos de pago, indica claramente que aceptan Efectivo, Tarjeta (mediante Terminal) o Link de Mercado Pago directo en el carrito.
    `;

    const systemMessage = {
      role: "system",
      content: finalSystemContent
    };

    // 3. Llamada directa a la API de OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Modelo rápido y económico perfecto para este caso
        messages: [systemMessage, ...messages],
        temperature: 0.7,
        max_tokens: 250
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Fallo en la respuesta de OpenAI:", data);
      return NextResponse.json(
        { reply: "Lo siento, mi procesador de lenguaje está saturado. Por favor intenta de nuevo en unos segundos." }, 
        { status: 500 }
      );
    }

    return NextResponse.json({ reply: data.choices[0].message.content });

  } catch (error) {
    console.error("Error crítico en ruta Chat API:", error);
    return NextResponse.json(
      { reply: "Error de infraestructura. No pudimos conectar con el motor de IA." }, 
      { status: 500 }
    );
  }
}