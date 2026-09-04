"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useParams } from "next/navigation";

export default function CustomerPublicPortal() {
  const params = useParams();
  const businessId = params.businessId as string;

  const [businessData, setBusinessData] = useState<any>(null);
  const [menuData, setMenuData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEcosystem = async () => {
      try {
        const docRef = doc(db, "businesses", businessId);
        const snap = await getDoc(docRef);
        if (snap.exists()) setBusinessData(snap.data());

        const menuRef = doc(db, "menus", businessId);
        const menuSnap = await getDoc(menuRef);
        if (menuSnap.exists()) setMenuData(menuSnap.data());
      } catch (error) {
        console.error("Error cargando ecosistema:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchEcosystem();
  }, [businessId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-gray-500">Cargando plataforma...</div>;
  if (!businessData) return <div className="min-h-screen flex items-center justify-center font-bold text-red-500">Establecimiento no encontrado.</div>;

  const { brandSettings, businessName, businessType } = businessData;
  const primaryColor = brandSettings?.primaryColor || '#3b82f6';

  return (
    <div className="min-h-screen flex flex-col relative pb-32" style={{ backgroundColor: brandSettings?.backgroundUrl ? 'transparent' : '#f9fafb' }}>
      
      {/* Fondo Dinámico con Overlay Premium */}
      {brandSettings?.backgroundUrl && (
        <div 
          className="fixed inset-0 z-0 bg-cover bg-center" 
          style={{ backgroundImage: `url(${brandSettings.backgroundUrl})` }}
        >
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm"></div>
        </div>
      )}

      <div className="relative z-10 w-full max-w-3xl mx-auto px-4 pt-12">
        
        {/* Cabecera / Identidad Corporativa (Logo Circular) */}
        <div className="flex flex-col items-center justify-center mb-12">
          {brandSettings?.logoUrl ? (
            <img 
              src={brandSettings.logoUrl} 
              alt={businessName} 
              className="w-32 h-32 object-cover rounded-full shadow-2xl border-4 border-white/10 mb-6" 
            />
          ) : (
            <div className="w-32 h-32 rounded-full bg-gray-800 border-4 border-white/10 flex items-center justify-center mb-6 shadow-2xl">
              <span className="text-white font-black text-xl">LOGO</span>
            </div>
          )}
          <h1 className="text-4xl font-black text-center mb-2 tracking-tight" style={{ color: brandSettings?.backgroundUrl ? '#ffffff' : '#111827' }}>
            {businessName}
          </h1>
          <p className="text-sm font-black uppercase tracking-widest" style={{ color: primaryColor }}>
            {businessType === 'gastronomia' ? 'Menú Digital' : 'Catálogo Virtual'}
          </p>
        </div>

        {/* Catálogo Renderizado (Prioridad 1) */}
        {menuData?.catalog && menuData.catalog.length > 0 ? (
          <div className="space-y-10">
            {menuData.catalog.map((cat: any, i: number) => (
              <div key={i} className="space-y-4">
                <h3 className="text-2xl font-black border-b-2 pb-2" style={{ color: brandSettings?.backgroundUrl ? '#ffffff' : '#111827', borderColor: primaryColor }}>
                  {cat.category}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {cat.items.map((item: any, j: number) => (
                    item.available !== false && (
                      <div key={j} className="bg-white/95 backdrop-blur-md p-5 rounded-2xl shadow-lg border border-gray-100 flex flex-col justify-between gap-3 hover:-translate-y-1 transition-transform">
                        <div>
                          <div className="flex justify-between items-start gap-4 mb-2">
                            <h4 className="font-black text-gray-900 text-lg leading-tight">{item.name}</h4>
                            <span className="text-lg font-black shrink-0" style={{ color: primaryColor }}>${item.price}</span>
                          </div>
                          {item.description && <p className="text-sm text-gray-500 font-medium leading-relaxed">{item.description}</p>}
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <p className="text-gray-400 font-bold">El catálogo se está actualizando...</p>
          </div>
        )}
      </div>

      {/* Módulo de IA Flotante (Botón Sticky) */}
      <div className="fixed bottom-6 right-6 z-50">
        <button 
          className="flex items-center gap-3 px-6 py-4 rounded-full shadow-2xl hover:scale-105 transition-transform group"
          style={{ backgroundColor: primaryColor }}
        >
          <svg className="w-7 h-7 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          <div className="text-left hidden sm:block">
            <p className="text-white font-black text-sm leading-tight">Asistente IA</p>
            <p className="text-white/80 text-xs font-medium">Consultar dudas</p>
          </div>
        </button>
      </div>

    </div>
  );
}