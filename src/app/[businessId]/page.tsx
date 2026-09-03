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

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-gray-500">Cargando ecosistema...</div>;
  if (!businessData) return <div className="min-h-screen flex items-center justify-center font-bold text-red-500">Negocio no encontrado.</div>;

  const { brandSettings, businessName, businessType } = businessData;
  const primaryColor = brandSettings?.primaryColor || '#3b82f6';

  return (
    <div className="min-h-screen flex flex-col relative pb-24" style={{ backgroundColor: brandSettings?.backgroundUrl ? 'transparent' : '#ffffff' }}>
      
      {brandSettings?.backgroundUrl && (
        <div 
          className="fixed inset-0 z-0 bg-cover bg-center" 
          style={{ backgroundImage: `url(${brandSettings.backgroundUrl})` }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
        </div>
      )}

      <div className="relative z-10 w-full max-w-2xl mx-auto px-4 pt-12">
        
        {/* Cabecera / Marca Blanca */}
        <div className="flex flex-col items-center justify-center mb-10">
          {brandSettings?.logoUrl && (
            <img src={brandSettings.logoUrl} alt={businessName} className="w-40 h-40 object-contain drop-shadow-xl mb-6" />
          )}
          <h1 className="text-4xl font-black text-center mb-2" style={{ color: brandSettings?.backgroundUrl ? '#ffffff' : '#111827' }}>
            {businessName}
          </h1>
          <p className="text-sm font-bold uppercase tracking-widest" style={{ color: primaryColor }}>
            {businessType === 'gastronomia' ? 'Menú Digital' : 'Catálogo Virtual'}
          </p>
        </div>

        {/* Módulo de IA */}
        <div className="w-full bg-white/95 backdrop-blur-md rounded-3xl p-6 shadow-2xl border border-white/20 mb-8">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center shadow-lg" style={{ backgroundColor: primaryColor }}>
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Asistente IA</h2>
            <p className="text-sm text-gray-500 font-medium">Pregúntame sobre nuestros productos o pide una recomendación.</p>
            <button className="w-full text-white font-black py-4 rounded-xl shadow-lg mt-4 hover:scale-105 transition-transform" style={{ backgroundColor: primaryColor }}>
              Iniciar Chat
            </button>
          </div>
        </div>

        {/* Catálogo Renderizado */}
        {menuData?.catalog && menuData.catalog.length > 0 && (
          <div className="space-y-8">
            {menuData.catalog.map((cat: any, i: number) => (
              <div key={i} className="space-y-4">
                <h3 className="text-2xl font-black border-b-2 pb-2" style={{ color: brandSettings?.backgroundUrl ? '#ffffff' : '#111827', borderColor: primaryColor }}>
                  {cat.category}
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  {cat.items.map((item: any, j: number) => (
                    item.available !== false && (
                      <div key={j} className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center gap-4">
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900">{item.name}</h4>
                          {item.description && <p className="text-sm text-gray-500 mt-1">{item.description}</p>}
                        </div>
                        <div className="text-lg font-black" style={{ color: primaryColor }}>
                          ${item.price}
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}