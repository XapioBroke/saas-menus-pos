import { NextResponse } from 'next/server';

// 📚 MOTOR SEMÁNTICO (Costo $0) - Diccionario extendido
const RULES = [
  {
    intent: "saludos",
    keywords: ['hola', 'buenos dias', 'buenas tardes', 'buenas noches', 'hey', 'saludos', 'que tal', 'duda', 'pregunta', 'ayuda'],
    answer: '¡Hola! Soy el asistente de soporte de MiTerminal. Puedo guiarte rápido sobre cómo gestionar tus citas, descargar tu QR, o editar tu catálogo. ¿En qué te ayudo hoy?'
  },
  {
    intent: "agradecimientos",
    keywords: ['gracias', 'perfecto', 'ok', 'entendido', 'excelente', 'vale', 'va', 'super'],
    answer: '¡De nada! Para eso estamos. Si necesitas algo más en el futuro, aquí estaré. 🚀'
  },
  {
    intent: "edicion_catalogo",
    keywords: ['editar', 'cambiar', 'actualizar', 'catalogo', 'menu', 'productos', 'precios', 'foto', 'logo', 'imagen', 'agregar', 'quitar', 'modificar'],
    answer: 'Para garantizar que tu Inteligencia Artificial y tu diseño premium funcionen perfecto, las modificaciones de catálogo las realiza nuestro equipo de ingenieros. Haz clic en el botón de abajo para enviarnos los cambios por WhatsApp.'
  },
  {
    intent: "qr",
    keywords: ['imprimir', 'descargar', 'qr', 'codigo', 'compartir', 'link', 'enlace', 'clientes'],
    answer: 'Ve al botón "Código QR del Negocio" en tu panel principal y selecciona "Descargar QR en HD". Obtendrás una imagen en alta calidad lista para enviar por WhatsApp, imprimir o hacer calcomanías.'
  },
  {
    intent: "citas",
    keywords: ['confirmar', 'cita', 'reservas', 'aprobar', 'cancelar', 'agenda', 'calendario', 'horario'],
    answer: 'Entra a la sección "Ver Citas de Hoy" en tu panel principal. Ahí verás tu agenda completa. Usa el botón verde para "Confirmar" o el rojo para "Cancelar" cada reserva.'
  },
  {
    intent: "pagos",
    keywords: ['pago', 'mercadopago', 'vincular', 'terminal', 'cobrar', 'tarjeta', 'dinero'],
    answer: 'Tu vinculación y el historial de pagos se gestionan directamente desde tu terminal física Mercado Pago Point. Estamos trabajando en una actualización para reflejar esos cobros aquí muy pronto.'
  }
];

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    
    // Extraer y limpiar el mensaje: a minúsculas y sin acentos (Normalización)
    const rawMessage = messages[messages.length - 1].content.toLowerCase().trim();
    const cleanMessage = rawMessage.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    let matchedAnswer = null;
    let requiresHuman = false;

    // Buscar coincidencias en el motor
    for (const rule of RULES) {
      if (rule.keywords.some(kw => cleanMessage.includes(kw))) {
        matchedAnswer = rule.answer;
        
        // Si la intención es editar el catálogo, forzamos mostrar el botón de WhatsApp
        if (rule.intent === "edicion_catalogo") {
          requiresHuman = true;
        }
        break;
      }
    }

    // 💡 Respuesta exitosa del Bot
    if (matchedAnswer) {
      return NextResponse.json({ 
        reply: matchedAnswer,
        escalate: requiresHuman 
      });
    }

    // 🆘 Fallback Suave (No detectó nada)
    return NextResponse.json({ 
      reply: 'No logré identificar tu consulta. Para proteger tu plataforma y darte una solución exacta, ¿prefieres que te comunique directamente con uno de nuestros asesores humanos?',
      escalate: true // Muestra el botón verde de WhatsApp
    });

  } catch (error) {
    console.error("Error en Concierge API:", error);
    return NextResponse.json({ error: 'Fallo interno en el sistema.' }, { status: 500 });
  }
}