import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { items, businessName } = await req.json();

    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      return NextResponse.json({ error: "Token de MP no configurado" }, { status: 500 });
    }

    // Estructuramos el carrito para Mercado Pago
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
        success: "https://miterminal.com",
        pending: "https://miterminal.com",
        failure: "https://miterminal.com"
      }
    };

    // Petición a la API de Preferencias (Checkouts) de Mercado Pago
    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
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