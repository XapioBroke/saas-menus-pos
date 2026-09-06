"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter, useSearchParams } from "next/navigation";

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const businessId = searchParams.get("businessId") || "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Estados de Configuración General
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("restaurant");
  const [primaryColor, setPrimaryColor] = useState("#3b82f6");
  const [logoUrl, setLogoUrl] = useState("");
  const [backgroundUrl, setBackgroundUrl] = useState("");
  const [aiPromptContext, setAiPromptContext] = useState("");

  // ESTADOS NUEVOS: CONTROL DE VENTAS Y PAGOS
  const [enableOnlineOrders, setEnableOnlineOrders] = useState(true);
  const [mpAccessToken, setMpAccessToken] = useState("");

  useEffect(() => {
    if (!businessId) return;
    const fetchData = async () => {
      try {
        const docRef = doc(db, "businesses", businessId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setBusinessName(data.businessName || "");
          setBusinessType(data.businessType || "restaurant");
          setPrimaryColor(data.brandSettings?.primaryColor || "#3b82f6");
          setLogoUrl(data.brandSettings?.logoUrl || "");
          setBackgroundUrl(data.brandSettings?.backgroundUrl || "");
          setAiPromptContext(data.aiPromptContext || "");
          
          // Carga de los nuevos campos (Si no existen, toman su valor por defecto)
          setEnableOnlineOrders(data.enableOnlineOrders !== false); 
          setMpAccessToken(data.mpAccessToken || "");
        }
      } catch (error) {
        console.error("Error cargando datos:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [businessId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const docRef = doc(db, "businesses", businessId);
      await setDoc(docRef, {
        businessName,
        businessType,
        aiPromptContext,
        enableOnlineOrders, // Se guarda el modo del catálogo
        mpAccessToken,      // Se guarda la llave bancaria del cliente
        brandSettings: {
          primaryColor,
          logoUrl,
          backgroundUrl
        },
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      alert("¡Configuración guardada con éxito!");
      router.push(`/admin/dashboard?businessId=${businessId}`);
    } catch (error) {
      console.error("Error guardando:", error);
      alert("Hubo un error al guardar los cambios.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-gray-500">Cargando panel de diseño...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 font-sans">
      <div className="max-w-3xl mx-auto">
        
        <header className="mb-10 text-center relative">
          <button onClick={() => router.push(`/admin/dashboard?businessId=${businessId}`)} className="absolute left-0 top-2 text-sm font-bold text-gray-500 hover:text-black transition-colors">
            &larr; Volver
          </button>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Diseño y Configuración</h1>
          <p className="text-gray-500 font-medium mt-2">Personaliza la experiencia de tus clientes.</p>
        </header>

        <form onSubmit={handleSave} className="space-y-8">
          
          {/* SECCIÓN 1: IDENTIDAD VISUAL */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">🎨</span>
              Identidad de Marca
            </h2>
            
            <div className="space-y-5">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block uppercase tracking-wider">Nombre del Negocio</label>
                <input type="text" required value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-purple-500 outline-none" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block uppercase tracking-wider">Tipo de Negocio</label>
                  <select value={businessType} onChange={(e) => setBusinessType(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-purple-500 outline-none">
                    <option value="restaurant">Restaurante / Comida</option>
                    <option value="retail">Tienda / Retail</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block uppercase tracking-wider">Color Principal</label>
                  <div className="flex gap-3 items-center">
                    <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-12 h-12 rounded-xl cursor-pointer border-0 p-0" />
                    <input type="text" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold uppercase" />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block uppercase tracking-wider">URL del Logotipo (Opcional)</label>
                <input type="url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://ejemplo.com/logo.png" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-purple-500 outline-none text-sm" />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block uppercase tracking-wider">URL de Fondo de Pantalla (Opcional)</label>
                <input type="url" value={backgroundUrl} onChange={(e) => setBackgroundUrl(e.target.value)} placeholder="https://ejemplo.com/fondo.jpg" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-purple-500 outline-none text-sm" />
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: OPERACIÓN Y VENTAS (NUEVO) */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">🛒</span>
              Operación y Ventas
            </h2>
            
            <div className="space-y-6">
              
              {/* Toggle de Modo Catálogo vs Modo Ecommerce */}
              <label className="flex items-start gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-colors border-gray-100 hover:border-gray-200 bg-gray-50">
                <div className="mt-1">
                  <input type="checkbox" checked={enableOnlineOrders} onChange={(e) => setEnableOnlineOrders(e.target.checked)} className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer" />
                </div>
                <div>
                  <p className="font-black text-gray-900">Habilitar Carrito de Compras</p>
                  <p className="text-sm text-gray-500 font-medium leading-snug mt-1">
                    Si desactivas esta opción, tu plataforma funcionará en <strong>Modo "Solo Vista"</strong>. Los clientes podrán ver tu menú/catálogo y chatear con la IA, pero no podrán agregar productos ni hacer pedidos.
                  </p>
                </div>
              </label>

              {/* Integración de Mercado Pago (Solo visible si el carrito está activo) */}
              <div className={`transition-opacity duration-300 ${enableOnlineOrders ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                <label className="text-xs font-bold text-gray-500 mb-1 block uppercase tracking-wider">Access Token de Mercado Pago (Opcional)</label>
                <input 
                  type="password" 
                  value={mpAccessToken} 
                  onChange={(e) => setMpAccessToken(e.target.value)} 
                  placeholder="APP_USR-..." 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm" 
                />
                <p className="text-xs text-gray-400 font-medium mt-2">
                  Pega aquí tu llave de producción para que el dinero de los clientes vaya <strong>directo a tu cuenta bancaria</strong>. Si lo dejas vacío, solo podrás cobrar en Efectivo o Terminal Física.
                </p>
              </div>

            </div>
          </div>

          {/* SECCIÓN 3: INTELIGENCIA ARTIFICIAL */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">🤖</span>
              Comportamiento del Asistente IA
            </h2>
            
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block uppercase tracking-wider">Instrucciones Especiales para el Chatbot</label>
              <textarea 
                rows={4} 
                value={aiPromptContext} 
                onChange={(e) => setAiPromptContext(e.target.value)} 
                placeholder="Ej. Saluda diciendo '¡Qué onda!'. Recomienda siempre probar la salsa de la casa. Menciona que cerramos a las 10 PM."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none" 
              />
              <p className="text-xs text-gray-400 font-medium mt-2">
                La IA ya conoce tu menú y precios automáticamente. Usa este espacio solo para darle "personalidad" o reglas extra.
              </p>
            </div>
          </div>

          <div className="pt-4 pb-12">
            <button 
              type="submit" 
              disabled={saving}
              className="w-full py-4 bg-gray-900 text-white font-black text-lg rounded-xl shadow-2xl hover:bg-black transition-all disabled:opacity-50"
            >
              {saving ? "Guardando Plataforma..." : "Guardar Configuración"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}