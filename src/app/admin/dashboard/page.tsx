"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Suspense } from "react";

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Rescatamos el ID del negocio de la URL que nos mandó el Login
  const businessId = searchParams.get("businessId") || "";

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/admin/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Tarjeta 1: Autopista del Cajero */}
          <div 
            onClick={() => router.push(`/admin/${businessId}/scanner`)}
            className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 cursor-pointer hover:-translate-y-2 transition-transform group"
          >
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors">
              <svg className="w-8 h-8 text-blue-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Terminal POS</h2>
            <p className="text-gray-500 font-medium">Escanea códigos QR, otorga puntos y canjea recompensas. Acceso diseñado para cajeros y staff operativo.</p>
          </div>

          {/* Tarjeta 2: Autopista del Dueño */}
          <div 
            onClick={() => router.push(`/admin/onboarding`)}
            className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 cursor-pointer hover:-translate-y-2 transition-transform group"
          >
            <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-purple-600 transition-colors">
              <svg className="w-8 h-8 text-purple-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Configuración Marca Blanca</h2>
            <p className="text-gray-500 font-medium">Personaliza colores, sube logotipos e inyecta instrucciones a la Inteligencia Artificial de tu negocio.</p>
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