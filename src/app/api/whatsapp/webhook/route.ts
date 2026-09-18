import { NextResponse } from 'next/server';
import { collection, query, where, getDocs, doc, getDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase"; 
import OpenAI from 'openai';

// Inicializamos el cerebro de OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 1. MÉTODO GET: Verificación de Facebook (Solo se usa una vez)
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
    return new NextResponse("Forbidden", { status: 403 });
  }
}

// 2. MÉTODO POST: Motor principal de procesamiento de WhatsApp
export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.object !== "whatsapp_business_account") {
      return new NextResponse("Not Found", { status: 404 });
    }

    for (const entry of body.entry) {
      for (const change of entry.changes) {
        const value = change.value;

        if (value.messages && value.messages.length > 0) {
          const message = value.messages[0];
          const clientPhone = message.from; 
          const businessPhoneId = value.metadata.phone_number_id; 
          
          if (message.type === "text") {
            const incomingText = message.text.body;
            console.log(`📩 Mensaje de ${clientPhone}: ${incomingText}`);

            // PASO A: Buscar el negocio
            const q = query(collection(db, "businesses"), where("whatsappPhoneNumberId", "==", businessPhoneId));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
              console.log(`⚠️ Negocio no encontrado para ID: ${businessPhoneId}`);
              continue;
            }

            const businessDoc = querySnapshot.docs[0];
            const businessData = businessDoc.data();
            const businessId = businessDoc.id; 
            
            // PASO B.1: Extraer Catálogo (O(1))
            let catalogoString = "Catálogo de productos/servicios disponibles:\n";
            try {
              const menuDocRef = doc(db, "menus", businessId);
              const menuDocSnap = await getDoc(menuDocRef);

              if (menuDocSnap.exists() && menuDocSnap.data().catalog) {
                menuDocSnap.data().catalog.forEach((cat: any) => {
                  catalogoString += `\n--- Categoría: ${cat.category || 'General'} ---\n`;
                  cat.items?.forEach((item: any) => {
                    if (item.available !== false) { 
                      catalogoString += `- ${item.name}: $${item.price}\n  Descripción: ${item.description}\n`;
                    }
                  });
                });
              } else {
                catalogoString += "No hay productos listados por el momento.\n";
              }
            } catch (menuError) {
              console.error("❌ Error al recuperar catálogo:", menuError);
            }

            // 🚀 PASO B.2: PROCESAMIENTO INTELIGENTE DE HORARIOS
            const schedule = businessData.schedule;
            let horarioString = "Horario de operación semanal:\n";
            
            if (schedule) {
              const diasMap: Record<string, string> = { monday: "Lunes", tuesday: "Martes", wednesday: "Miércoles", thursday: "Jueves", friday: "Viernes", saturday: "Sábado", sunday: "Domingo" };
              for (const [key, name] of Object.entries(diasMap)) {
                if (schedule[key] && schedule[key].isOpen) {
                  horarioString += `- ${name}: de ${schedule[key].open} a ${schedule[key].close}\n`;
                } else {
                  horarioString += `- ${name}: CERRADO (No agendar)\n`;
                }
              }
            } else {
              horarioString += "- Horario estándar. Asume abierto en horario comercial normal.\n";
            }

            // Fechas bloqueadas (Vacaciones/Festivos)
            const blockedDates = businessData.blockedDates && businessData.blockedDates.length > 0 
              ? businessData.blockedDates.join(", ") 
              : "Ninguno";

            // Inyectar fecha actual para que la IA entienda el "hoy" y "mañana"
            const fechaActual = new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City", dateStyle: "full", timeStyle: "short" });

            // PASO B.3: Inyección en OpenAI
            try {
              const contextoBase = businessData.aiPromptContext || `Eres el asistente virtual de ventas para el negocio '${businessData.businessName}'. Tu objetivo es ser amable, conciso y ayudar al cliente a agendar citas o hacer pedidos.`;

              const promptFinal = `
${contextoBase}

HOY ES: ${fechaActual} (Toma esto como referencia estricta de tiempo).

${catalogoString}

REGLAS DE AGENDA Y DISPONIBILIDAD:
${horarioString}
- Días festivos/excepciones (ESTÁ CERRADO, NO AGENDAR): ${blockedDates}

REGLAS ESTRICTAS DE VENTAS:
1. SOLO ofrece productos/servicios del catálogo. Si no está, ofrece la mejor alternativa.
2. PRECIOS EXACTOS. Da el precio listado sin inventar.
3. RESTRICCIÓN DE HORARIO: NUNCA agendes ni ofrezcas disponibilidad fuera del horario de operación indicado arriba, ni en los días cerrados o festivos.
4. Si el cliente pide cita en un día cerrado u horario inválido, infórmale el horario del negocio y ofrécele el día abierto más próximo.
5. Sé conciso y persuasivo (máximo 2 a 3 párrafos cortos). Si el cliente está listo, invítalo a confirmar su reserva/pedido.
`;

              const aiResponse = await openai.chat.completions.create({
                model: "gpt-3.5-turbo", 
                messages: [
                  { role: "system", content: promptFinal },
                  { role: "user", content: incomingText }
                ],
                temperature: 0.3, // Temperatura baja para respetar estrictamente las horas
              });

              const aiResponseText = aiResponse.choices[0].message.content;
              console.log("🧠 Respuesta IA:\n", aiResponseText);

              // PASO B.4: Guardar historial en Firebase de forma asíncrona
              try {
                await addDoc(collection(db, "businesses", businessId, "chats"), {
                  clienteCelular: clientPhone,
                  mensajeCliente: incomingText,
                  respuestaIA: aiResponseText,
                  fecha: serverTimestamp(),
                  leidoPorHumano: false
                });
              } catch (dbError) {
                console.error("❌ Error guardando chat:", dbError);
              }

              // PASO C: Enviar mensaje (DESCOMENTAR CUANDO META LIBERE EL NÚMERO)
              // await sendWhatsAppMessage(businessPhoneId, clientPhone, aiResponseText || "");

            } catch (aiError) {
              console.error("❌ Error OpenAI:", aiError);
            }
          }
        }
      }
    }
    return new NextResponse("EVENT_RECEIVED", { status: 200 });

  } catch (error) {
    console.error("❌ Error en Webhook:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// Envío a Meta Cloud API
async function sendWhatsAppMessage(phoneNumberId: string, to: string, text: string) {
  const accessToken = process.env.META_ACCESS_TOKEN;
  if (!accessToken) return;

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
        to: to, 
        type: "text",
        text: { preview_url: false, body: text }
      }),
    });

    if (!response.ok) {
      console.error("❌ Error API Meta:", await response.json());
    } else {
      console.log(`🚀 Mensaje enviado a ${to}`);
    }
  } catch (error) {
    console.error("❌ Error de red:", error);
  }
}