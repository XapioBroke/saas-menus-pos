"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function BillingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const businessId = searchParams.get("businessId") || "";

  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [ownerEmail, setOwnerEmail] = useState("");

  const handleSubscribe = async (planName: string, price: number) => {
    if (!businessId) {
      alert("Error: No se detectó el ID del negocio.");
      return;
    }
    if (!ownerEmail.trim()) {
      alert("Por favor, ingresa tu correo para vincular la suscripción.");
      return;
    }

    setLoadingPlan(planName);

    try {
      const response = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          planName,
          price,
          email: ownerEmail
        })
      });

      const data = await response.json();

      if (data.init_point) {
        // Redirección directa a la bóveda segura de Mercado Pago
        window.location.href = data.init_point;
      } else {
        alert("Error al generar el link de pago.");
        setLoadingPlan(null);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Problema de conexión con el servidor de pagos.");
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-5xl mx-auto space-y-10">
        
        <header className="text-center space-y-4">
          <button onClick={() => router.push(`/admin/dashboard?businessId=${businessId}`)} className="text-sm font-bold text-gray-500 hover:text-black transition-colors">
            &larr; Volver al Panel
          </button>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Planes y Suscripción</h1>
          <p className="text-gray-500 font-medium text-lg max-w-2xl mx-auto">
            Activa el potencial completo de tu plataforma. Cobros recurrentes seguros procesados por Mercado Pago.
          </p>
        </header>

        <div className="max-w-md mx-auto bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-8">
          <label className="block text-sm font-bold text-gray-700 mb-2">Correo del titular (Para recibos)</label>
          <input 
            type="email" 
            required
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            placeholder="dueño@restaurante.com"
            className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 font-medium focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          
          {/* PLAN BÁSICO */}
          <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100 flex flex-col">
            <h2 className="text-2xl font-black text-gray-900 mb-2">Plan Esencial</h2>
            <p className="text-gray-500 mb-6 font-medium">Ideal para negocios que comienzan su digitalización.</p>
            <div className="mb-6">
              <span className="text-5xl font-black text-gray-900">$499</span>
              <span className="text-gray-500 font-bold"> MXN / mes</span>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-center gap-3 font-bold text-gray-700">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> Menú Digital / Catálogo Web
              </li>
              <li className="flex items-center gap-3 font-bold text-gray-700">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> Pedidos por WhatsApp
              </li>
              <li className="flex items-center gap-3 font-bold text-gray-700">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> Código QR de Alta Resolución
              </li>
            </ul>
            <button 
              onClick={() => handleSubscribe("Esencial", 499)}
              disabled={loadingPlan !== null}
              className="w-full py-4 bg-gray-900 text-white font-black rounded-xl hover:bg-black shadow-xl transition-all disabled:opacity-50"
            >
              {loadingPlan === "Esencial" ? "Procesando..." : "Suscribirme Ahora"}
            </button>
          </div>

          {/* PLAN ENTERPRISE */}
          <div className="bg-blue-600 p-8 rounded-3xl shadow-2xl border border-blue-500 flex flex-col relative transform md:-translate-y-4">
            <div className="absolute top-0 right-8 transform -translate-y-1/2">
              <span className="bg-gradient-to-r from-yellow-400 to-yellow-300 text-yellow-900 text-xs font-black px-4 py-1.5 rounded-full shadow-lg uppercase tracking-wider">Más Vendido</span>
            </div>
            <h2 className="text-2xl font-black text-white mb-2">Plan Enterprise</h2>
            <p className="text-blue-100 mb-6 font-medium">Ecosistema automatizado con Inteligencia Artificial.</p>
            <div className="mb-6">
              <span className="text-5xl font-black text-white">$999</span>
              <span className="text-blue-200 font-bold"> MXN / mes</span>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-center gap-3 font-bold text-white">
                <svg className="w-5 h-5 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> Todo lo del Plan Esencial
              </li>
              <li className="flex items-center gap-3 font-bold text-white">
                <svg className="w-5 h-5 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> Asistente Virtual Inteligente (IA)
              </li>
              <li className="flex items-center gap-3 font-bold text-white">
                <svg className="w-5 h-5 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> Programa de Lealtad (Billetera VIP)
              </li>
              <li className="flex items-center gap-3 font-bold text-white">
                <svg className="w-5 h-5 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> Terminal POS para Cajeros
              </li>
            </ul>
            <button 
              onClick={() => handleSubscribe("Enterprise", 999)}
              disabled={loadingPlan !== null}
              className="w-full py-4 bg-white text-blue-900 font-black rounded-xl hover:bg-gray-50 shadow-xl transition-all disabled:opacity-50"
            >
              {loadingPlan === "Enterprise" ? "Procesando..." : "Suscribirme Ahora"}
            </button>
          </div>

        </div>
        
        <div className="text-center mt-12">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
            Pagos procesados de forma segura por Mercado Pago
          </p>
        </div>
      </div>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-bold text-gray-500">Cargando módulos de pago...</div>}>
      <BillingContent />
    </Suspense>
  );
}