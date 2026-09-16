import { NextResponse } from 'next/server';
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase"; // Asegúrate de que esta ruta apunte a tu config de Firebase
import OpenAI from 'openai';

// Inicializamos el cerebro de OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
            const businessId = businessDoc.id; // ID del documento (ej. "gps-inteligente")
            
            console.log(`✅ Negocio identificado: ${businessData.businessName || 'Sin Nombre'}`);

            // PASO B.1: Extraer el catálogo (menús) de Firebase mediante Acceso Directo (O(1))
            let catalogoString = "Catálogo de productos/servicios disponibles:\n";

            try {
              const menuDocRef = doc(db, "menus", businessId);
              const menuDocSnap = await getDoc(menuDocRef);

              if (menuDocSnap.exists()) {
                const menuData = menuDocSnap.data();
                
                // Mapeo exacto basado en la estructura de tu JSON (catalog -> items)
                if (menuData.catalog && Array.isArray(menuData.catalog)) {
                  menuData.catalog.forEach((cat: any) => {
                    catalogoString += `\n--- Categoría: ${cat.category || 'General'} ---\n`;
                    if (cat.items && Array.isArray(cat.items)) {
                      cat.items.forEach((item: any) => {
                        if (item.available !== false) { // Filtramos para solo ofrecer lo disponible
                          catalogoString += `- ${item.name}: $${item.price}\n  Descripción: ${item.description}\n`;
                        }
                      });
                    }
                  });
                }
              } else {
                catalogoString += "No hay productos listados por el momento.\n";
              }
            } catch (menuError) {
              console.error("❌ Error al recuperar el menú de Firebase:", menuError);
              catalogoString += "Error al cargar el catálogo de productos.\n";
            }

            // Auditoría en consola para verificar que el catálogo se leyó correctamente
            console.log("📦 Catálogo inyectado a la IA:\n", catalogoString);

            // PASO B.2: Inyección del Cerebro OpenAI con Contexto y Catálogo
            try {
              const contextoBase = businessData.aiPromptContext || `Eres el asistente virtual de ventas para el negocio '${businessData.businessName}'. Tu objetivo es ser amable, conciso y ayudar al cliente a resolver dudas. Responde en un máximo de 3 oraciones cortas.`;

              const promptFinal = `
${contextoBase}

${catalogoString}

REGLAS ESTRICTAS DE VENTAS:
1. SOLO puedes ofrecer los productos listados en el catálogo anterior.
2. Si el cliente pregunta precios, dale el precio exacto listado.
3. Utiliza la descripción del catálogo para explicar los beneficios de cada producto.
4. Si preguntan por algo que no está en el catálogo, indica amablemente que no cuentan con ello y ofrece la mejor alternativa de tu lista.
5. Sé persuasivo e invita al cliente a concretar el pedido o agendar una cita.
6. Responde de forma natural y concisa (máximo 2 a 3 párrafos cortos).
`;

              const aiResponse = await openai.chat.completions.create({
                model: "gpt-3.5-turbo", // Puedes usar gpt-4o-mini para producción
                messages: [
                  {
                    role: "system",
                    content: promptFinal
                  },
                  {
                    role: "user",
                    content: incomingText
                  }
                ],
                temperature: 0.4, // Temperatura baja para precisión matemática en precios
              });

              const aiResponseText = aiResponse.choices[0].message.content;
              
              // Imprimimos el resultado en Vercel para probar la IA sin depender de Meta
              console.log("🧠 Respuesta de la IA con catálogo generada con éxito:\n", aiResponseText);

              // PASO C: Enviar la respuesta de vuelta por WhatsApp
              // ⚠️ MANTENEMOS COMENTADO hasta que Meta quite la restricción de "Pending review"
              // await sendWhatsAppMessage(businessPhoneId, clientPhone, aiResponseText || "");

            } catch (aiError) {
              console.error("❌ Error en el cerebro de OpenAI:", aiError);
            }
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