"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, Plus, Trash2, Smartphone, Bot, LayoutTemplate, Link as LinkIcon, CheckCircle2 } from "lucide-react";
import { doc, setDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function SuperAdminOnboarding() {
  const [isSaving, setIsSaving] = useState(false);
  const [successLink, setSuccessLink] = useState("");

  // 1. ESTADO: Identidad Corporativa y Seguridad Concierge
  const [identity, setIdentity] = useState({
    businessName: "",
    businessId: "", // Se autogenera
    phone: "", // Para extraer los últimos 4 dígitos como PIN temporal
    giro: "Alimentos / Menú Vertical",
    color: "#2563eb",
    background: "Malla Cyber"
  });

  // 2. ESTADO: Inteligencia Artificial
  const [aiPersonality, setAiPersonality] = useState("");

  // 3. ESTADO: Constructor de Catálogo
  const [catalog, setCatalog] = useState([
    {
      id: crypto.randomUUID(),
      categoryName: "",
      products: [{ id: crypto.randomUUID(), name: "", price: 0, description: "" }]
    }
  ]);

  // Manejadores de Catálogo Dinámico
  const addCategory = () => {
    setCatalog([...catalog, { id: crypto.randomUUID(), categoryName: "", products: [{ id: crypto.randomUUID(), name: "", price: 0, description: "" }] }]);
  };

  const removeCategory = (catId: string) => {
    setCatalog(catalog.filter(cat => cat.id !== catId));
  };

  const addProduct = (catId: string) => {
    setCatalog(catalog.map(cat => {
      if (cat.id === catId) {
        return { ...cat, products: [...cat.products, { id: crypto.randomUUID(), name: "", price: 0, description: "" }] };
      }
      return cat;
    }));
  };

  const removeProduct = (catId: string, prodId: string) => {
    setCatalog(catalog.map(cat => {
      if (cat.id === catId) {
        return { ...cat, products: cat.products.filter(p => p.id !== prodId) };
      }
      return cat;
    }));
  };

  // Autogenerar Slug (ID Único)
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setIdentity({
      ...identity,
      businessName: name,
      businessId: name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "")
    });
  };

  // GUARDADO MAESTRO EN FIREBASE (Batch Write)
  const handleSavePlatform = async () => {
    if (!identity.businessId || !identity.phone || identity.phone.length < 4) {
      alert("Se requiere el Nombre del Negocio y un Teléfono válido (mínimo 4 dígitos) para generar el PIN.");
      return;
    }

    setIsSaving(true);
    try {
      const batch = writeBatch(db);

      // 1. Guardar Configuración Pública/Admin de la Plataforma
      const platformRef = doc(db, "businesses", identity.businessId);
      batch.set(platformRef, {
        identity,
        aiPersonality,
        catalog,
        createdAt: new Date().toISOString()
      });

      // 2. Guardar Bóveda de Seguridad Concierge (El Portal Cliente)
      const tempPin = identity.phone.slice(-4); // Últimos 4 dígitos
      const conciergeRef = doc(db, "concierge_portals", identity.businessId);
      batch.set(conciergeRef, {
        businessName: identity.businessName,
        pin: tempPin,
        isActive: true,
        requiresPinChange: true // Obliga al cliente a cambiar el PIN 1234 o el de su teléfono
      });

      // Ejecutar ambas escrituras atómicamente
      await batch.commit();

      // Mostrar link de éxito
      setSuccessLink(`${window.location.origin}/portal/${identity.businessId}`);
    } catch (error) {
      console.error("Error creando plataforma:", error);
      alert("Hubo un error al guardar. Revisa la consola.");
    } finally {
      setIsSaving(false);
    }
  };

  const backgrounds = ["Malla Cyber", "Circuitos", "Madera Rústica", "Mármol Oscuro", "Abarrotes / Fresco"];

  if (successLink) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white p-10 rounded-3xl shadow-xl max-w-lg w-full text-center border border-gray-100">
          <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-6" />
          <h2 className="text-3xl font-black text-gray-900 mb-2">¡Plataforma Generada!</h2>
          <p className="text-gray-500 mb-8">El negocio y su portal de cliente han sido creados con éxito.</p>
          
          <div className="bg-gray-50 p-4 rounded-2xl mb-8 border border-gray-200">
            <p className="text-sm font-bold text-gray-700 mb-2">Enlace Concierge para WhatsApp:</p>
            <div className="flex items-center gap-2 bg-white p-3 rounded-xl border border-gray-200">
              <LinkIcon className="w-5 h-5 text-blue-500" />
              <input readOnly value={successLink} className="flex-1 text-sm outline-none bg-transparent font-medium text-gray-900" />
            </div>
            <p className="text-xs text-gray-500 mt-3">PIN Temporal: <strong className="text-gray-900">{identity.phone.slice(-4)}</strong></p>
          </div>

          <button onClick={() => { setSuccessLink(""); setIdentity({...identity, businessName: "", businessId: "", phone: ""}); }} className="w-full py-3 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-colors">
            Crear Otro Negocio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 font-sans text-gray-900">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <header className="text-center mb-10">
          <h1 className="text-3xl font-black mb-2">Constructor de Plataforma</h1>
          <p className="text-gray-500 font-medium">Diseña la marca, el catálogo, las reglas de IA y genera el acceso de cliente.</p>
        </header>

        {/* --- SECCIÓN 1: IDENTIDAD Y SEGURIDAD --- */}
        <section className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
            <LayoutTemplate className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold">1. Identidad y Acceso</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Nombre del Negocio</label>
              <input type="text" value={identity.businessName} onChange={handleNameChange} placeholder="Ej. Barbería Central" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">ID Único (URL Autogenerada)</label>
              <input type="text" readOnly value={identity.businessId} className="w-full p-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 font-mono text-sm outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">WhatsApp / Teléfono (Para generar PIN)</label>
              <input type="text" value={identity.phone} onChange={e => setIdentity({...identity, phone: e.target.value})} placeholder="Ej. 3312345678" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all" />
              <p className="text-xs text-gray-400 mt-1">Los últimos 4 dígitos serán su PIN temporal de acceso.</p>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Giro Comercial</label>
              <select value={identity.giro} onChange={e => setIdentity({...identity, giro: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 transition-all">
                <option>Alimentos / Menú Vertical</option>
                <option>Servicios / Barberías</option>
                <option>Retail / Productos</option>
              </select>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-4">Fondo de Pantalla Premium</label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {backgrounds.map(bg => (
                <div 
                  key={bg} 
                  onClick={() => setIdentity({...identity, background: bg})}
                  className={`h-24 rounded-2xl cursor-pointer border-4 flex items-end p-2 transition-all ${identity.background === bg ? 'border-blue-500 shadow-md scale-105' : 'border-transparent bg-gray-100 hover:bg-gray-200'}`}
                >
                  <span className={`text-xs font-bold w-full text-center ${identity.background === bg ? 'text-blue-700' : 'text-gray-500'}`}>{bg}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- SECCIÓN 2: IA --- */}
        <section className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
            <Bot className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-bold">2. Inteligencia Artificial</h2>
          </div>
          <textarea 
            value={aiPersonality} 
            onChange={e => setAiPersonality(e.target.value)}
            placeholder="Define la personalidad de tu IA. Ej: Eres un mesero amable de una pizzería napolitana..." 
            className="w-full h-32 p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all resize-none"
          />
        </section>

        {/* --- SECCIÓN 3: CATÁLOGO --- */}
        <section className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3">
              <Smartphone className="w-6 h-6 text-green-600" />
              <h2 className="text-xl font-bold">3. Constructor de Catálogo</h2>
            </div>
            <button onClick={addCategory} className="flex items-center gap-2 text-sm font-bold text-green-600 hover:bg-green-50 px-4 py-2 rounded-lg transition-colors">
              <Plus className="w-4 h-4" /> Agregar Categoría
            </button>
          </div>

          <div className="space-y-6">
            <AnimatePresence>
              {catalog.map((cat, catIndex) => (
                <motion.div key={cat.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="border border-gray-200 rounded-2xl p-6 bg-gray-50/50">
                  
                  {/* Cabecera de Categoría */}
                  <div className="flex items-center gap-4 mb-6">
                    <input 
                      type="text" 
                      placeholder="Nombre de la Categoría (Ej. Bebidas)" 
                      value={cat.categoryName}
                      onChange={(e) => {
                        const newCat = [...catalog];
                        newCat[catIndex].categoryName = e.target.value;
                        setCatalog(newCat);
                      }}
                      className="flex-1 p-3 bg-white border border-gray-200 rounded-xl outline-none font-bold focus:border-green-500 transition-all"
                    />
                    <button onClick={() => removeCategory(cat.id)} className="text-red-500 hover:bg-red-50 p-3 rounded-xl transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Lista de Productos */}
                  <div className="space-y-4 pl-4 md:pl-8 border-l-2 border-gray-200">
                    {cat.products.map((prod, prodIndex) => (
                      <div key={prod.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex gap-4">
                            <input 
                              type="text" 
                              placeholder="Nombre del Producto" 
                              value={prod.name}
                              onChange={(e) => {
                                const newCat = [...catalog];
                                newCat[catIndex].products[prodIndex].name = e.target.value;
                                setCatalog(newCat);
                              }}
                              className="flex-1 p-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-green-500 text-sm font-medium"
                            />
                            <div className="relative w-32">
                              <span className="absolute left-3 top-2.5 text-green-600 font-bold">$</span>
                              <input 
                                type="number" 
                                placeholder="0.00" 
                                value={prod.price || ""}
                                onChange={(e) => {
                                  const newCat = [...catalog];
                                  newCat[catIndex].products[prodIndex].price = Number(e.target.value);
                                  setCatalog(newCat);
                                }}
                                className="w-full p-2 pl-7 bg-green-50 border border-green-200 rounded-lg outline-none focus:border-green-500 text-sm font-bold text-green-700"
                              />
                            </div>
                          </div>
                          <input 
                            type="text" 
                            placeholder="Descripción para el cliente y la IA" 
                            value={prod.description}
                            onChange={(e) => {
                              const newCat = [...catalog];
                              newCat[catIndex].products[prodIndex].description = e.target.value;
                              setCatalog(newCat);
                            }}
                            className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-green-500 text-sm text-gray-500"
                          />
                        </div>
                        <button onClick={() => removeProduct(cat.id, prod.id)} className="text-gray-400 hover:text-red-500 self-start md:self-center p-2">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                    
                    <button onClick={() => addProduct(cat.id)} className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-1 mt-2">
                      <Plus className="w-4 h-4" /> Agregar Producto
                    </button>
                  </div>

                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>

        {/* --- BOTÓN DE GUARDADO MAESTRO --- */}
        <div className="sticky bottom-6 mt-12 flex justify-end">
          <button 
            onClick={handleSavePlatform}
            disabled={isSaving}
            className="flex items-center gap-3 bg-black hover:bg-gray-800 text-white px-8 py-4 rounded-2xl font-black text-lg shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <span className="animate-pulse">Generando Plataforma...</span>
            ) : (
              <>
                <Save className="w-6 h-6" />
                Finalizar y Generar Accesos
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}