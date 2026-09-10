import { NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase"; // Asegúrate de que esta ruta apunte a tu config de Firebase

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { businessId, items, referenceId } = body;

    if (!businessId || !items || items.length === 0) {
      return NextResponse.json({ error: "Faltan datos requeridos o carrito vacío" }, { status: 400 });
    }

    // 1. Extraer el Access Token SECRETO del negocio desde Firebase
    const bizRef = doc(db, "businesses", businessId);
    const bizSnap = await getDoc(bizRef);

    if (!bizSnap.exists()) {
      return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
    }

    const bizData = bizSnap.data();
    const accessToken = bizData.mercadopagoAccessToken;

    if (!accessToken) {
      return NextResponse.json({ error: "El negocio no ha configurado Mercado Pago" }, { status: 403 });
    }

    // 2. Inicializar Mercado Pago con las credenciales DEL DUEÑO (No las tuyas)
    const client = new MercadoPagoConfig({ accessToken: accessToken });
    const preference = new Preference(client);

    // 3. Formatear el carrito para Mercado Pago
    const mpItems = items.map((item: any) => ({
      id: item.id || `item-${Date.now()}`,
      title: item.name,
      quantity: Number(item.quantity) || 1,
      unit_price: Number(item.price),
      currency_id: "MXN", // Cambiar si usas otra moneda
    }));

    // 4. Crear la preferencia de pago
    const result = await preference.create({
      body: {
        items: mpItems,
        external_reference: referenceId || `REF-${Date.now()}`,
        // Redirecciones cuando el cliente termine de pagar
        back_urls: {
          success: `https://miterminal.com/reservas/${businessId}?status=success`,
          pending: `https://miterminal.com/reservas/${businessId}?status=pending`,
          failure: `https://miterminal.com/reservas/${businessId}?status=failure`,
        },
        auto_return: "approved",
      }
    });

    // 5. Devolver el link de cobro al frontend
    return NextResponse.json({ 
      init_point: result.init_point, // Link de pago tradicional
      id: result.id 
    });

  } catch (error) {
    console.error("Error en MercadoPago API:", error);
    return NextResponse.json({ error: "Error interno al generar el cobro" }, { status: 500 });
  }
}