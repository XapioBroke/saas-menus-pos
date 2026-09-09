// src/app/api/concierge/route.ts
import { NextResponse } from 'next/server';

// 📚 BASE DE CONOCIMIENTO (FAQs) - Reglas precargadas para ahorrar tokens de IA
const FAQS = [
  {
    keywords: ['editar', 'cambiar', 'actualizar', 'catalogo', 'menu'],
    answer: 'Para garantizar la estabilidad de tu diseño e IA, las modificaciones de catálogo las realiza nuestro equipo técnico. Por favor, solicítalo por WhatsApp detallando los cambios.'
  },
  {
    keywords: ['imprimir', 'descargar', 'qr'],
    answer: 'Ve a la tarjeta "Compartir Menú QR" en tu panel principal y haz clic en "Descargar QR en HD". Ese archivo tiene calidad perfecta para imprentas.'
  },
  {
    keywords: ['confirmar', 'cita', 'reservas', 'aprobar'],
    answer: 'Entra a "Ver Citas de Hoy". Verás una lista de reservas pendientes. Simplemente pulsa el botón verde "Confirmar" o el rojo "Cancelar" para actualizar el estatus.'
  },
  {
    keywords: ['pago', 'mercadopago', 'vincular', 'terminal'],
    answer: 'Estamos trabajando en la integración directa. Por ahora, los cobros físicos se gestionan directamente desde tu terminal Mercado Pago Point.'
  }
];

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    
    // Obtener el último mensaje del usuario y normalizarlo (minúsculas, sin acentos sutiles)
    const lastMessage = messages[messages.length - 1].content.toLowerCase().trim();

    // 🧠 Motor de Búsqueda de Reglas
    let matchedAnswer = null;

    for (const faq of FAQS) {
      // Si el mensaje del usuario contiene ALGUNA de las keywords de la FAQ
      if (faq.keywords.some(keyword => lastMessage.includes(keyword))) {
        matchedAnswer = faq.answer;
        break; // Detener búsqueda al encontrar la primera coincidencia
      }
    }

    // 💡 Respuesta del Bot de Reglas
    if (matchedAnswer) {
      return NextResponse.json({ 
        reply: matchedAnswer,
        escalate: false // No necesita WhatsApp
      });
    }

    // 🆘 Fallback (No se encontró respuesta - Pregunta compleja)
    // Devolvemos un flag para que el Frontend muestre el botón de WhatsApp
    return NextResponse.json({ 
      reply: 'Esa es una excelente pregunta. Para darte una respuesta precisa y segura, necesito escalarla con un asesor humano. ¿Deseas contactar con soporte por WhatsApp?',
      escalate: true // Activa el botón de WhatsApp en el frontend
    });

  } catch (error) {
    console.error("Error en Concierge API:", error);
    return NextResponse.json({ error: 'Fallo interno en el sistema de soporte.' }, { status: 500 });
  }
}