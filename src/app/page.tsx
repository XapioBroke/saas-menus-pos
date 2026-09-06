"use client";

import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4 text-center">
      
      {/* Etiqueta de Promoción */}
      <div className="bg-blue-50 text-blue-700 font-bold px-6 py-2 rounded-full text-sm mb-8 inline-block shadow-sm">
        🔥 PRIMEROS 50 CLIENTES: 6 MESES DE IA GRATIS
      </div>

      {/* Titular Principal */}
      <h1 className="text-5xl md:text-7xl font-black text-gray-900 tracking-tight mb-4 max-w-4xl">
        El futuro de tu negocio con <br/>
        <span className="text-blue-600">Cobros y Menús Inteligentes</span>
      </h1>

      {/* Subtítulo */}
      <p className="text-gray-500 font-medium text-lg md:text-xl max-w-2xl mb-12">
        Adquiere tu terminal de cobro a un precio competitivo y desbloquea tu ecosistema digital: sitio web propio, menú con código QR y un Chatbot de IA disponible 24/7 para atender a tus clientes sin fricciones.
      </p>

      {/* Botones de Acción (Call To Actions) */}
      <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
        
        {/* BOTÓN 1: Lleva al panel de administración (El Onboarding/Dashboard) */}
        <button 
          onClick={() => router.push('/admin/dashboard?businessId=mi-negocio-nuevo')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-black text-lg px-10 py-4 rounded-full shadow-xl transition-transform hover:-translate-y-1"
        >
          Adquirir Paquete
        </button>

        {/* BOTÓN 2: Lleva al portal de un cliente demo para que vean cómo funciona */}
        <button 
          onClick={() => router.push('/gps-inteligente')} 
          className="bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-200 font-black text-lg px-10 py-4 rounded-full shadow-sm transition-transform hover:-translate-y-1"
        >
          Ver Demo en Vivo
        </button>

      </div>
      
      {/* Extra: Pequeño link de acceso si el dueño ya tiene cuenta */}
      <div className="mt-12">
        <p className="text-sm font-bold text-gray-400">
          ¿Ya tienes tu terminal? <button onClick={() => router.push('/admin/dashboard')} className="text-blue-600 hover:underline">Inicia Sesión aquí</button>
        </p>
      </div>

    </div>
  );
}