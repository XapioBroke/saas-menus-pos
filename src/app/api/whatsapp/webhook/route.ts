import { NextResponse } from 'next/server';
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase"; // Asegúrate de que esta ruta apunte a tu config de Firebase

// 1. MÉTODO GET: Verificación de Facebook (Solo se usa una vez al configurar Meta)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.META_VERIFY_TOKEN;

  if (mode === "subscribe" && token === verifyToken) {
    console.log("✅ Webhook verificado por Meta");
    return new NextResponse(challenge, { status: 200 });
  } else {
    console.error("❌ Falló la verificación del Webhook");
    return new NextResponse("Forbidden", { status: 403 });
  }
}

// 2. MÉTODO POST: El motor que recibe todos los mensajes de WhatsApp de todos tus clientes
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Verificamos que sea un evento de WhatsApp
    if (body.object !== "whatsapp_business_account") {
      return new NextResponse("Not Found", { status: 404 });
    }

    // Iteramos sobre las entradas (Meta a veces agrupa varios mensajes en un solo envío)
    for (const entry of body.entry) {
      for (const change of entry.changes) {
        const value = change.value;

        // Validamos que haya un mensaje nuevo
        if (value.messages && value.messages.length > 0) {
          const message = value.messages[0];
          
          // Datos cruciales extraídos del Payload
          const clientPhone = message.from; // Número del cliente que escribe
          const businessPhoneId = value.metadata.phone_number_id; // ID del número del negocio
          
          // Solo procesamos mensajes de texto por ahora (luego agregaremos audios/imágenes)
          if (message.type === "text") {
            const incomingText = message.text.body;
            console.log(`📩 Mensaje recibido de ${clientPhone} a la terminal ${businessPhoneId}: ${incomingText}`);

            // PASO A: Buscar de quién es este número en Firebase
            const q = query(
              collection(db, "businesses"), 
              where("whatsappPhoneNumberId", "==", businessPhoneId)
            );
            
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
              console.log(`⚠️ No se encontró ningún negocio con el ID de WhatsApp: ${businessPhoneId}`);
              continue; // Ignoramos y pasamos al siguiente
            }

            const businessDoc = querySnapshot.docs[0];
            const businessData = businessDoc.data();
            const businessId = businessDoc.id;

            console.log(`✅ Negocio identificado: ${businessData.businessName}`);

            // PASO B: Aquí entrará la Inteligencia Artificial (OpenAI o Gemini)
            // Extraemos el prompt y el catálogo para dárselo a la IA
            const aiContext = businessData.aiPromptContext;
            
            // TODO: (Siguiente fase) Llamada a la API de OpenAI/Gemini pasándole el contexto y el mensaje
            // const aiResponse = await callAI(incomingText, aiContext, catalog);
            
            // Simulación temporal de la respuesta de la IA
            const aiResponseText = `Hola! Soy el asistente virtual de ${businessData.businessName}. He recibido tu mensaje: "${incomingText}". Pronto podré tomarte el pedido de manera automática.`;

            // PASO C: Enviar la respuesta de vuelta por WhatsApp
            await sendWhatsAppMessage(businessPhoneId, clientPhone, aiResponseText);
          }
        }
      }
    }

    // Siempre debemos responder 200 OK rápidamente a Meta para que no nos reintente enviar el mismo mensaje
    return new NextResponse("EVENT_RECEIVED", { status: 200 });

  } catch (error) {
    console.error("❌ Error procesando el webhook:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// Función auxiliar para enviar el mensaje de vuelta usando la API Cloud de Meta
async function sendWhatsAppMessage(phoneNumberId: string, to: string, text: string) {
  const accessToken = process.env.META_ACCESS_TOKEN;
  
  if (!accessToken) {
    console.error("Falta el META_ACCESS_TOKEN");
    return;
  }

  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to, // Número del cliente
        type: "text",
        text: {
          preview_url: false,
          body: text // La respuesta de tu IA
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ Error enviando mensaje a Meta:", errorData);
    } else {
      console.log(`🚀 Mensaje enviado con éxito a ${to}`);
    }
  } catch (error) {
    console.error("❌ Error de red enviando mensaje:", error);
  }
}