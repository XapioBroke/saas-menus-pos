import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { accessToken } = await req.json();

    if (!accessToken) {
      return NextResponse.json({ error: "No se proporcionó Access Token." }, { status: 400 });
    }

    // Hacemos la llamada directa a la API de dispositivos de Mercado Pago
    const response = await fetch('https://api.mercadopago.com/point/integration-api/devices', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data.message || "Error al buscar terminales con este token." }, { status: response.status });
    }

    // Mercado Pago devuelve un objeto con la propiedad 'devices'
    return NextResponse.json({ devices: data.devices || [] });

  } catch (error: any) {
    console.error("Error en MP Devices API:", error);
    return NextResponse.json({ error: "Error interno del servidor al buscar dispositivos." }, { status: 500 });
  }
}