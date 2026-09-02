"use client";

import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const router = useRouter();
  
  const [businessId, setBusinessId] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("gastronomia");
  const [primaryColor, setPrimaryColor] = useState("#2563eb");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bgFile, setBgFile] = useState<File | null>(null); // Estado para el fondo
  const [aiPrompt, setAiPrompt] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLogoFile(e.target.files[0]);
    }
  };

  const handleBgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setBgFile(e.target.files[0]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId.trim()) {
      setMessage("El ID del negocio es obligatorio (ej. mi-tienda).");
      return;
    }

    setLoading(true);
    setMessage("Subiendo archivos y configurando ecosistema en la nube...");

    try {
      let logoUrl = "";
      let backgroundUrl = "";

      // 1. Subida paralela de archivos para optimizar tiempos de respuesta
      const uploadPromises = [];

      if (logoFile) {
        const logoRef = ref(storage, `logos/${businessId}_${logoFile.name}`);
        const logoPromise = uploadBytes(logoRef, logoFile)
          .then(snap => getDownloadURL(snap.ref))
          .then(url => { logoUrl = url; });
        uploadPromises.push(logoPromise);
      }

      if (bgFile) {
        const bgRef = ref(storage, `backgrounds/${businessId}_${bgFile.name}`);
        const bgPromise = uploadBytes(bgRef, bgFile)
          .then(snap => getDownloadURL(snap.ref))
          .then(url => { backgroundUrl = url; });
        uploadPromises.push(bgPromise);
      }

      // Esperamos a que todas las imágenes terminen de subir simultáneamente
      if (uploadPromises.length > 0) {
        await Promise.all(uploadPromises);
      }

      // 2. Estructuramos el payload de la Base de Datos
      const payload = {
        businessName,
        businessType,
        brandSettings: {
          primaryColor,
          ...(logoUrl && { logoUrl }), // Solo se actualiza si hay un logo nuevo
          ...(backgroundUrl && { backgroundUrl }) // Solo se actualiza si hay un fondo nuevo
        },
        aiPromptContext: aiPrompt,
        updatedAt: new Date().toISOString(),
      };

      // 3. Guardamos/Actualizamos el documento en Firestore
      await setDoc(doc(db, "businesses", businessId.toLowerCase().trim()), payload, { merge: true });

      setMessage("¡Configuración exitosa! Ecosistema listo.");
      setTimeout(() => {
        router.push(`/admin/${businessId}`);
      }, 2000);

    } catch (error) {
      console.error("Error en Onboarding:", error);
      setMessage("Ocurrió un error al guardar la configuración.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-black text-gray-900">Configuración de Plataforma</h1>
          <p className="text-gray-500 font-medium">Personaliza la experiencia visual y la Inteligencia Artificial de tu negocio.</p>
        </header>

        <form onSubmit={handleSave} className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 space-y-8">
          
          {message && (
            <div className={`p-4 rounded-xl text-sm font-bold text-center ${message.includes("error") ? "bg-red-50 text-red-700 border-red-200" : "bg-green-50 text-green-700 border-green-200"} border`}>
              {message}
            </div>
          )}

          {/* SECCIÓN 1: IDENTIDAD BÁSICA */}
          <section className="space-y-4">
            <h2 className="text-lg font-black text-gray-900 border-b pb-2">1. Identidad del Negocio</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">Nombre del Negocio</label>
                <input type="text" required value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Ej. Licores del Valle" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 font-medium" />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">ID Único (URL)</label>
                <input type="text" required value={businessId} onChange={(e) => setBusinessId(e.target.value)} placeholder="ej. licores-valle" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 font-medium lowercase" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">Giro Comercial (Define la interfaz del cliente)</label>
              <select value={businessType} onChange={(e) => setBusinessType(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 font-medium">
                <option value="gastronomia">Restaurante / Alimentos (Muestra: Menú, Platillos)</option>
                <option value="retail">Tienda / Retail (Muestra: Catálogo, Stock, Almacén)</option>
                <option value="servicios">Servicios (Muestra: Catálogo de Servicios, Citas)</option>
              </select>
            </div>
          </section>

          {/* SECCIÓN 2: MARCA BLANCA (WHITE-LABEL) */}
          <section className="space-y-4">
            <h2 className="text-lg font-black text-gray-900 border-b pb-2">2. Diseño y Marca Blanca</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">Color Primario</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-12 w-full rounded cursor-pointer border-0 p-0" />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">Logotipo Oficial</label>
                <input type="file" accept="image/*" onChange={handleLogoChange} className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:font-bold file:bg-blue-50 file:text-blue-700 cursor-pointer hover:file:bg-blue-100" />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">Fondo (Opcional)</label>
                <input type="file" accept="image/*" onChange={handleBgChange} className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:font-bold file:bg-purple-50 file:text-purple-700 cursor-pointer hover:file:bg-purple-100" />
              </div>
            </div>
          </section>

          {/* SECCIÓN 3: INTELIGENCIA ARTIFICIAL */}
          <section className="space-y-4">
            <h2 className="text-lg font-black text-gray-900 border-b pb-2">3. Contexto para la Inteligencia Artificial</h2>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">Instrucciones Maestras (Prompt)</label>
              <p className="text-xs text-gray-500 mb-2 font-medium">Dile a la IA cómo comportarse con tus clientes. Sé tan específico como desees con tus productos.</p>
              <textarea 
                required 
                value={aiPrompt} 
                onChange={(e) => setAiPrompt(e.target.value)} 
                rows={5}
                placeholder="Ej. Actúa como un sommelier experto. Recomiéndale a los clientes maridajes para nuestros licores de capulín y tuna. Nuestro tono es amable y elegante..." 
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 font-medium resize-none" 
              />
            </div>
          </section>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-black text-white font-black py-4 rounded-xl text-lg hover:bg-gray-800 shadow-xl transition-all"
          >
            {loading ? "Guardando e integrando ecosistema..." : "Guardar y Desplegar Plataforma"}
          </button>
        </form>

      </div>
    </div>
  );
}