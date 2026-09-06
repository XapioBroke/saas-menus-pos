import { NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(req: Request) {
  try {
    const { items, businessName, businessId } = await req.json();

    // 1. Buscar la configuración del restaurante en Firestore
    const businessRef = doc(db, "businesses", businessId);
    const businessSnap = await getDoc(businessRef);
    
    if (!businessSnap.exists()) {
      return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
    }

    const businessData = businessSnap.data();
    const ownerToken = businessData.mpAccessToken;

    // 2. Si el dueño no ha puesto su llave, abortamos la creación del link en línea
    if (!ownerToken) {
      return NextResponse.json({ error: "El negocio no tiene configurado Mercado Pago" }, { status: 400 });
    }

    // 3. Estructuramos el pedido
    const payload = {
      items: items.map((item: any) => ({
        title: `${item.name} (${businessName})`,
        unit_price: Number(item.price),
        quantity: Number(item.quantity),
        currency_id: 'MXN'
      })),
      purpose: 'wallet_purchase',
      auto_return: "approved",
      back_urls: {
        success: `https://miterminal.com/${businessId}`,
        pending: `https://miterminal.com/${businessId}`,
        failure: `https://miterminal.com/${businessId}`
      }
    };

    // 4. Disparamos a Mercado Pago USANDO LA LLAVE DEL DUEÑO DEL LOCAL
    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ownerToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.init_point) {
      return NextResponse.json({ init_point: data.init_point });
    } else {
      console.error("Fallo MP:", data);
      return NextResponse.json({ error: "Fallo al generar link" }, { status: 400 });
    }

  } catch (error) {
    console.error("Error en create-preference:", error);
    return NextResponse.json({ error: "Error de servidor" }, { status: 500 });
  }
}