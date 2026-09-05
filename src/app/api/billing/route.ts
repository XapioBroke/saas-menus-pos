import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { businessId, planName, price, email } = await req.json();

    // Validación de seguridad
    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      return NextResponse.json({ error: "API Key de Mercado Pago no configurada." }, { status: 500 });
    }

    // Payload para la API de Suscripciones (Preapproval) de Mercado Pago
    const payload = {
      reason: `SaaS Menú & POS - ${planName} (${businessId})`,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months", // Cobro mensual automático
        transaction_amount: price,
        currency_id: "MXN" // Moneda nacional configurada por defecto
      },
      back_url: `https://saas-menus-pos.vercel.app/admin/dashboard?businessId=${businessId}`,
      payer_email: email || "test_user@testuser.com"
    };

    const response = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Error de Mercado Pago:", data);
      return NextResponse.json({ error: "Falla al crear la suscripción en MP" }, { status: 400 });
    }

    // MP nos devuelve el "init_point", que es el enlace de pago seguro para el cliente
    return NextResponse.json({ init_point: data.init_point });

  } catch (error) {
    console.error("Error crítico en API Billing:", error);
    return NextResponse.json({ error: "Fallo de infraestructura en servidor" }, { status: 500 });
  }
}