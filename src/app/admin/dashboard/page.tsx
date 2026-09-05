"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Suspense, useEffect, useState } from "react";

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const businessId = searchParams.get("businessId") || "";
  
  const [publicUrl, setPublicUrl] = useState("");

  useEffect(() => {
    // Genera la URL pública dinámicamente basada en el dominio actual
    if (typeof window !== "undefined" && businessId) {
      setPublicUrl(`${window.location.origin}/${businessId}`);
    }
  }, [businessId]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/admin/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <header className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Panel de Control</h1>
            <p className="text-gray-500 font-medium">Establecimiento: <span className="text-blue-600 font-bold uppercase">{businessId || "No definido"}</span></p>
          </div>
          <button 
            onClick={handleLogout}
            className="px-6 py-2 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors"
          >
            Cerrar Sesión
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Tarjeta 1: Terminal POS */}
          <div 
            onClick={() => router.push(`/admin/${businessId}/scanner`)}
            className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 cursor-pointer hover:-translate-y-2 transition-transform group flex flex-col"
          >
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors">
              <svg className="w-8 h-8 text-blue-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
            </div>
            <h2 className="text-xl font-black text-gray-900 mb-2">Terminal POS</h2>
            <p className="text-gray-500 font-medium text-sm flex-1">Caja registradora. Otorga puntos y escanea QRs.</p>
          </div>

          {/* Tarjeta 2: Marca Blanca */}
          <div 
            onClick={() => router.push(`/admin/onboarding?businessId=${businessId}`)}
            className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 cursor-pointer hover:-translate-y-2 transition-transform group flex flex-col"
          >
            <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-purple-600 transition-colors">
              <svg className="w-8 h-8 text-purple-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <h2 className="text-xl font-black text-gray-900 mb-2">Marca Blanca</h2>
            <p className="text-gray-500 font-medium text-sm flex-1">Catálogo, colores, logotipo e Inteligencia Artificial.</p>
          </div>

          {/* Tarjeta 3: Recompensas */}
          <div 
            onClick={() => router.push(`/admin/rewards?businessId=${businessId}`)}
            className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 cursor-pointer hover:-translate-y-2 transition-transform group flex flex-col"
          >
            <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-green-600 transition-colors">
              <svg className="w-8 h-8 text-green-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h2 className="text-xl font-black text-gray-900 mb-2">Lealtad VIP</h2>
            <p className="text-gray-500 font-medium text-sm flex-1">Configura el valor de puntos y recompensas.</p>
          </div>

          {/* Tarjeta 4: Comandas (KDS) */}
          <div 
            onClick={() => router.push(`/admin/${businessId}/kds`)}
            className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 cursor-pointer hover:-translate-y-2 transition-transform group flex flex-col"
          >
            <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-orange-600 transition-colors">
              <svg className="w-8 h-8 text-orange-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
            </div>
            <h2 className="text-xl font-black text-gray-900 mb-2">Comandas (KDS)</h2>
            <p className="text-gray-500 font-medium text-sm flex-1">Gestión interactiva de pedidos en tiempo real para cocina.</p>
          </div>

          {/* Tarjeta 5: Suscripción SaaS */}
          <div 
            onClick={() => router.push(`/admin/billing?businessId=${businessId}`)}
            className="bg-gradient-to-br from-gray-900 to-black p-8 rounded-3xl shadow-2xl border border-gray-800 cursor-pointer hover:-translate-y-2 transition-transform group flex flex-col relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[10px] font-black px-3 py-1 rounded-bl-xl shadow-sm z-10 uppercase tracking-widest">
              PRO
            </div>
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-white/20 transition-colors z-10">
              <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
            </div>
            <h2 className="text-xl font-black text-white mb-2 z-10">Facturación</h2>
            <p className="text-gray-400 font-medium text-sm flex-1 z-10">Activa tu plan y gestiona cobros recurrentes.</p>
          </div>

          {/* Tarjeta 6: Portal Público y QR */}
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 flex flex-col items-center text-center">
            <h2 className="text-xl font-black text-gray-900 mb-2">QR de Mesas</h2>
            {publicUrl ? (
              <div className="w-full mt-auto space-y-3">
                <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 flex justify-center mb-4">
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(publicUrl)}`} alt="QR" className="w-24 h-24 object-contain" />
                </div>
                <button onClick={() => window.open(publicUrl, "_blank")} className="w-full py-2 bg-black text-white text-sm font-bold rounded-xl hover:bg-gray-800">Ver Menú Vivo</button>
                <button onClick={() => window.open(`https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(publicUrl)}&margin=20`, "_blank")} className="w-full py-2 bg-blue-50 text-blue-600 text-sm font-bold rounded-xl hover:bg-blue-100">Descargar HD</button>
              </div>
            ) : (
              <div className="w-24 h-24 bg-gray-100 rounded-2xl mt-auto animate-pulse"></div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

// Envolvemos en Suspense por el uso de useSearchParams
export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-bold text-gray-500">Cargando panel...</div>}>
      <DashboardContent />
    </Suspense>
  );
}