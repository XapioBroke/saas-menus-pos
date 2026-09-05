import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { messages, businessName, menuCatalog, aiPrompt } = await req.json();

    // Validación de seguridad de la llave
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { reply: "Error interno: API Key de OpenAI no configurada en el servidor." }, 
        { status: 500 }
      );
    }

    // Arquitectura del System Prompt (El cerebro del asistente)
    const systemMessage = {
      role: "system",
      content: `Eres el asistente virtual exclusivo y experto en ventas de ${businessName}.
      
      ${aiPrompt ? `Instrucciones clave del dueño: ${aiPrompt}` : ''}
      
      Aquí tienes el catálogo/menú en tiempo real:
      ${JSON.stringify(menuCatalog)}
      
      Reglas operativas:
      1. Responde de forma amable, persuasiva, concisa y muy natural.
      2. No inventes precios ni productos que no estén en el menú proporcionado.
      3. Tu objetivo es resolver dudas y guiar al cliente sutilmente para que agregue productos a su carrito y finalice la compra.
      4. Si preguntan sobre métodos de pago, indica que aceptan Efectivo, Tarjeta (Terminal) o Link de Mercado Pago directo en el carrito.`
    };

    // Llamada directa a la API de OpenAI (Evita problemas de dependencias en Vercel)
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Modelo rápido y económico para operaciones de alto volumen
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