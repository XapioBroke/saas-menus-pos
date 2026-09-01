"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useParams } from "next/navigation";

export default function CustomerPublicPortal() {
  const params = useParams();
  const businessId = params.businessId as string;

  const [businessData, setBusinessData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBusiness = async () => {
      try {
        const docRef = doc(db, "businesses", businessId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setBusinessData(snap.data());
        }
      } catch (error) {
        console.error("Error cargando el negocio:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBusiness();
  }, [businessId]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center font-bold text-gray-500">Cargando ecosistema...</div>;
  }

  if (!businessData) {
    return <div className="min-h-screen flex items-center justify-center font-bold text-red-500">Negocio no encontrado.</div>;
  }

  const { brandSettings, businessName, businessType } = businessData;

  return (
    <div 
      className="min-h-screen flex flex-col relative"
      style={{ 
        backgroundColor: brandSettings?.backgroundUrl ? 'transparent' : '#ffffff',
        backgroundImage: brandSettings?.backgroundUrl ? `url(${brandSettings.backgroundUrl})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {brandSettings?.backgroundUrl && <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-0"></div>}

      <div className="relative z-10 flex flex-col items-center justify-center w-full px-6 pt-12 pb-6 flex-1">
        
        {/* Identidad de Marca Blanca */}
        {brandSettings?.logoUrl ? (
          <img src={brandSettings.logoUrl} alt={businessName} className="w-40 h-40 object-contain drop-shadow-xl mb-6" />
        ) : (
          <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center mb-6 shadow-inner">
            <span className="text-gray-400 font-black text-xl">LOGO</span>
          </div>
        )}

        <h1 className="text-3xl font-black text-center mb-2" style={{ color: brandSettings?.backgroundUrl ? '#ffffff' : '#111827' }}>
          {businessName}
        </h1>
        <p className="text-sm font-bold uppercase tracking-widest mb-10" style={{ color: brandSettings?.primaryColor || '#3b82f6' }}>
          {businessType === 'gastronomia' ? 'Menú Interactivo' : 'Catálogo Digital'}
        </p>

        {/* Módulo de Inteligencia Artificial (Placeholder) */}
        <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-3xl p-6 shadow-2xl border border-white/20">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center shadow-lg" style={{ backgroundColor: brandSettings?.primaryColor || '#3b82f6' }}>
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Asistente IA</h2>
            <p className="text-sm text-gray-500 font-medium">Pregúntame sobre nuestros productos, ingredientes o pide una recomendación personalizada.</p>
            
            <button className="w-full text-white font-black py-4 rounded-xl shadow-lg mt-4 transition-transform active:scale-95" style={{ backgroundColor: brandSettings?.primaryColor || '#3b82f6' }}>
              Iniciar Chat
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}