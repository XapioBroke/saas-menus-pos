import { NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // Aceptamos 'cart' o 'items' para no romper tu código anterior de reservas
    // method puede ser 'online' o 'terminal'
    const { businessId, cart, items, referenceId, method = 'online' } = body;
    const finalItems = cart || items;

    if (!businessId || !finalItems || finalItems.length === 0) {
      return NextResponse.json({ error: "Faltan datos requeridos o carrito vacío" }, { status: 400 });
    }

    // 1. Extraer las llaves SECRETAS del negocio desde Firebase
    const bizRef = doc(db, "businesses", businessId);
    const bizSnap = await getDoc(bizRef);

    if (!bizSnap.exists()) {
      return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
    }

    const bizData = bizSnap.data();
    
    // Variables estandarizadas según tu base de datos
    const accessToken = bizData.mercadopagoAccessToken;
    const deviceId = bizData.mercadopagoDeviceId;

    if (!accessToken) {
      return NextResponse.json({ error: "El negocio no ha configurado su cuenta de Mercado Pago" }, { status: 403 });
    }

    // ==========================================
    // FLUJO A: PAGO EN LÍNEA (SDK Oficial)
    // ==========================================
    if (method === 'online') {
      const client = new MercadoPagoConfig({ accessToken: accessToken });
      const preference = new Preference(client);

      const mpItems = finalItems.map((item: any) => ({
        id: item.id || `item-${Date.now()}`,
        title: item.name,
        description: item.description || "",
        quantity: Number(item.quantity) || 1,
        unit_price: Number(item.price),
        currency_id: "MXN",
      }));

      const result = await preference.create({
        body: {
          items: mpItems,
          external_reference: referenceId || `REF-${Date.now()}`,
          back_urls: {
            success: `https://miterminal.com/menu/${businessId}?status=success`,
            pending: `https://miterminal.com/menu/${businessId}?status=pending`,
            failure: `https://miterminal.com/menu/${businessId}?status=failure`,
          },
          auto_return: "approved",
          statement_descriptor: bizData.businessName.substring(0, 16)
        }
      });

      return NextResponse.json({ 
        success: true,
        init_point: result.init_point, 
        id: result.id 
      });
    }

    // ==========================================
    // FLUJO B: TERMINAL FÍSICA (POINT API)
    // ==========================================
    else if (method === 'terminal') {
      if (!deviceId) {
        return NextResponse.json({ error: "El negocio no tiene una terminal física vinculada (Device ID)." }, { status: 400 });
      }

      // Calculamos el total
      const totalAmount = finalItems.reduce((sum: number, item: any) => sum + (Number(item.price) * (Number(item.quantity) || 1)), 0);
      const paymentIntentId = referenceId || crypto.randomUUID();

      // Para la Point API usamos fetch directo, ya que el SDK de Node a veces es muy rígido con esto
      const pointResponse = await fetch(`https://api.mercadopago.com/point/integration-api/devices/${deviceId}/payment-intents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: totalAmount,
          description: `Pedido en ${bizData.businessName}`,
          payment: {
            installments: 1,
            type: "credit_card" // Acepta tanto débito como crédito en la máquina
          },
          additional_info: {
            external_reference: paymentIntentId,
            print_on_terminal: true // Le ordenamos a la máquina imprimir el ticket al aprobar
          }
        })
      });

      const pointData = await pointResponse.json();

      if (!pointResponse.ok) {
        throw new Error(pointData.message || "Error al despertar la terminal.");
      }

      return NextResponse.json({ 
        success: true, 
        message: "¡Terminal despertada! Acerque la tarjeta.",
        intentId: paymentIntentId
      });
    }

    return NextResponse.json({ error: "Método de pago no válido." }, { status: 400 });

  } catch (error: any) {
    console.error("Error en Checkout API:", error);
    return NextResponse.json({ error: error.message || "Error interno al generar el cobro" }, { status: 500 });
  }
}