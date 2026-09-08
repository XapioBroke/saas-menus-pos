"use client";

import { useState, useEffect, Suspense } from "react";
import { doc, setDoc, getDoc, writeBatch } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Link as LinkIcon } from "lucide-react"; // Añadido para UI de éxito

const generateId = () => Math.random().toString(36).substr(2, 9);

// Galería Extendida Tier 1
const PRESET_BACKGROUNDS = [
  { id: "tech1", label: "Malla Cyber", url: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1000&auto=format&fit=crop" },
  { id: "tech2", label: "Circuitos", url: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1000&auto=format&fit=crop" },
  { id: "food1", label: "Madera Rústica", url: "https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=1000&auto=format&fit=crop" },
  { id: "food2", label: "Mármol Oscuro", url: "https://images.unsplash.com/photo-1616651181620-9906d6e43fc3?q=80&w=1000&auto=format&fit=crop" },
  { id: "market", label: "Abarrotes / Fresco", url: "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1000&auto=format&fit=crop" },
  { id: "retail", label: "Boutique Minimal", url: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1000&auto=format&fit=crop" },
  { id: "abs1", label: "Ondas Premium", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop" },
  { id: "abs2", label: "Acero Pulido", url: "https://images.unsplash.com/photo-1507722650058-005fa97f5466?q=80&w=1000&auto=format&fit=crop" }
];

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editBusinessId = searchParams.get("businessId");
  
  const [businessName, setBusinessName] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [businessPhone, setBusinessPhone] = useState(""); // NUEVO: Para el PIN temporal
  const [businessType, setBusinessType] = useState("gastronomia");
  const [primaryColor, setPrimaryColor] = useState("#2563eb");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  
  const [presetBg, setPresetBg] = useState("");
  const [bgFile, setBgFile] = useState<File | null>(null);
  
  const [aiPrompt, setAiPrompt] = useState("");
  const [catalog, setCatalog] = useState([
    { categoryId: generateId(), categoryName: "", items: [{ id: generateId(), name: "", price: "", description: "", available: true }] }
  ]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [successLink, setSuccessLink] = useState(""); // NUEVO: UI de Éxito Concierge

  useEffect(() => {
    if (editBusinessId) {
      setLoading(true);
      setBusinessId(editBusinessId);
      const fetchData = async () => {
        try {
          const businessSnap = await getDoc(doc(db, "businesses", editBusinessId));
          const menuSnap = await getDoc(doc(db, "menus", editBusinessId));
          // Consultar el teléfono guardado si existe (para edición)
          const conciergeSnap = await getDoc(doc(db, "concierge_portals", editBusinessId));
          
          if (businessSnap.exists()) {
            const data = businessSnap.data();
            setBusinessName(data.businessName || "");
            setBusinessType(data.businessType || "gastronomia");
            setPrimaryColor(data.brandSettings?.primaryColor || "#2563eb");
            setAiPrompt(data.aiPromptContext || "");
            
            const existingBgUrl = data.brandSettings?.backgroundUrl;
            if (existingBgUrl) {
              const isPreset = PRESET_BACKGROUNDS.find(p => p.url === existingBgUrl);
              setPresetBg(existingBgUrl);
            }
          }
          if (menuSnap.exists()) {
            const menuData = menuSnap.data();
            if (menuData.catalog && menuData.catalog.length > 0) {
              setCatalog(menuData.catalog.map((cat: any) => ({
                categoryId: generateId(), categoryName: cat.category,
                items: cat.items.map((item: any) => ({ ...item, id: item.id || generateId() }))
              })));
            }
          }
          // Recuperar el teléfono guardado solo para visualización
          if (conciergeSnap.exists() && conciergeSnap.data().originalPhone) {
              setBusinessPhone(conciergeSnap.data().originalPhone);
          }
        } catch (error) {
          console.error("Error cargando datos:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [editBusinessId]);

  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    setBusinessId(formatted);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setLogoFile(e.target.files[0]);
  };
  const handleBgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setBgFile(e.target.files[0]);
      setPresetBg(""); 
    }
  };

  const addCategory = () => setCatalog([...catalog, { categoryId: generateId(), categoryName: "", items: [] }]);
  const removeCategory = (index: number) => { const n = [...catalog]; n.splice(index, 1); setCatalog(n); };
  const updateCategoryName = (txt: string, i: number) => { const n = [...catalog]; n[i].categoryName = txt; setCatalog(n); };
  const addItem = (i: number) => { const n = [...catalog]; n[i].items.push({ id: generateId(), name: "", price: "", description: "", available: true }); setCatalog(n); };
  const removeItem = (cIdx: number, iIdx: number) => { const n = [...catalog]; n[cIdx].items.splice(iIdx, 1); setCatalog(n); };
  const updateItem = (cIdx: number, iIdx: number, field: string, val: any) => { const n = [...catalog]; n[cIdx].items[iIdx] = { ...n[cIdx].items[iIdx], [field]: val }; setCatalog(n); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId.trim() || !businessName.trim()) {
      setMessage("Error: Nombre e ID son obligatorios.");
      return;
    }
    
    // Validación crucial para Concierge: Necesitamos el teléfono para el PIN de acceso nuevo
    if (!editBusinessId && (!businessPhone || businessPhone.length < 4)) {
        setMessage("Error: Se requiere un teléfono de mínimo 4 dígitos para crear el PIN temporal.");
        return;
    }

    setLoading(true);
    setMessage("Desplegando ecosistema y generando portal seguro...");

    try {
      let logoUrl = "";
      let backgroundUrl = presetBg; 
      const uploadPromises = [];
      
      if (logoFile) {
        const logoRef = ref(storage, `logos/${businessId}_${logoFile.name}`);
        uploadPromises.push(uploadBytes(logoRef, logoFile).then(s => getDownloadURL(s.ref)).then(url => { logoUrl = url; }));
      }
      if (bgFile) {
        const bgRef = ref(storage, `backgrounds/${businessId}_${bgFile.name}`);
        uploadPromises.push(uploadBytes(bgRef, bgFile).then(s => getDownloadURL(s.ref)).then(url => { backgroundUrl = url; }));
      }
      if (uploadPromises.length > 0) await Promise.all(uploadPromises);

      // Usamos writeBatch para hacer las 3 escrituras (negocio, menu, portal) de forma atómica y segura
      const batch = writeBatch(db);

      // 1. Guardado de Configuración Principal
      const businessRef = doc(db, "businesses", businessId);
      const payload = {
        businessName, businessType,
        brandSettings: { primaryColor, ...(logoUrl && { logoUrl }), ...(backgroundUrl && { backgroundUrl }) },
        aiPromptContext: aiPrompt, updatedAt: new Date().toISOString(),
      };
      batch.set(businessRef, payload, { merge: true });

      // 2. Guardado de Catálogo
      const menuRef = doc(db, "menus", businessId);
      const cleanCatalog = catalog.map(sec => ({
        category: sec.categoryName || "Sin Categoría",
        items: sec.items.map(item => ({ ...item, price: Number(item.price) || 0 }))
      }));
      batch.set(menuRef, { catalog: cleanCatalog }, { merge: true });

      // 3. INYECCIÓN DEL PORTAL CONCIERGE LITE
      // Si estamos creando un negocio nuevo (no editando), creamos su bóveda
      if (!editBusinessId) {
        const tempPin = businessPhone.slice(-4);
        const conciergeRef = doc(db, "concierge_portals", businessId);
        batch.set(conciergeRef, {
            businessName: businessName,
            pin: tempPin,
            originalPhone: businessPhone,
            isActive: true,
            requiresPinChange: true // Forzamos a que el cliente cambie el PIN al entrar
        });
      }

      // Ejecutar todo
      await batch.commit();

      if (!editBusinessId) {
          // Si es nuevo, mostramos la pantalla de éxito con el enlace
          setSuccessLink(`${window.location.origin}/portal/${businessId}`);
      } else {
          // Si solo editó, lo regresamos a su dashboard normal
          setMessage("¡Ecosistema actualizado!");
          setTimeout(() => router.push(`/admin/dashboard?businessId=${businessId}`), 1500);
      }

    } catch (error) {
      console.error(error);
      setMessage("Error al guardar en base de datos.");
    } finally {
      setLoading(false);
    }
  };

  // PANTALLA DE ÉXITO CONCIERGE
  if (successLink) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white p-10 rounded-3xl shadow-xl max-w-lg w-full text-center border border-gray-100">
          <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-6" />
          <h2 className="text-3xl font-black text-gray-900 mb-2">¡Plataforma Generada!</h2>
          <p className="text-gray-500 mb-8">El negocio y el portal del cliente han sido creados.</p>
          
          <div className="bg-gray-50 p-4 rounded-2xl mb-8 border border-gray-200">
            <p className="text-sm font-bold text-gray-700 mb-2">Enlace Directo para el Cliente:</p>
            <div className="flex items-center gap-2 bg-white p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50" onClick={() => window.open(successLink, "_blank")}>
              <LinkIcon className="w-5 h-5 text-blue-500 shrink-0" />
              <input readOnly value={successLink} className="flex-1 text-sm outline-none bg-transparent font-medium text-gray-900 cursor-pointer" />
            </div>
            <p className="text-xs text-gray-500 mt-3">PIN Temporal generado: <strong className="text-gray-900 text-lg ml-1">{businessPhone.slice(-4)}</strong></p>
          </div>

          <div className="flex gap-4">
            <button onClick={() => router.push(`/admin/dashboard?businessId=${businessId}`)} className="flex-1 py-3 bg-gray-200 text-gray-800 font-bold rounded-xl hover:bg-gray-300 transition-colors">
              Ir al Admin
            </button>
            <button onClick={() => { 
              setSuccessLink(""); setBusinessName(""); setBusinessId(""); setBusinessPhone(""); 
              setCatalog([{ categoryId: generateId(), categoryName: "", items: [{ id: generateId(), name: "", price: "", description: "", available: true }] }]);
            }} className="flex-1 py-3 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-colors">
              Crear Otro
            </button>
          </div>
        </div>
      </div>
    );
  }

  // RENDERIZADO DEL FORMULARIO ORIGINAL MEJORADO
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="text-center space-y-2 mb-8">
          <h1 className="text-3xl font-black text-gray-900">{editBusinessId ? "Editar Plataforma" : "Constructor de Plataforma"}</h1>
          <p className="text-gray-500 font-medium">Diseña tu marca, el catálogo y las reglas de IA del negocio.</p>
        </header>

        <form onSubmit={handleSave} className="space-y-8">
          {message && <div className={`p-4 rounded-xl text-sm font-bold text-center ${message.includes("Error") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"} border`}>{message}</div>}

          {/* IDENTIDAD */}
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 space-y-6">
            <h2 className="text-xl font-black text-gray-900 border-b pb-2">1. Identidad Corporativa y Accesos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">Nombre del Negocio</label>
                <input type="text" required value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="w-full text-gray-900 placeholder-gray-400 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 font-medium bg-gray-50" />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">ID Único (URL Autogenerada)</label>
                <input type="text" required value={businessId} onChange={handleIdChange} disabled={!!editBusinessId} className="w-full text-gray-900 placeholder-gray-400 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none font-mono text-blue-600 disabled:opacity-50 bg-gray-100" />
              </div>
              
              {/* NUEVO CAMPO: TELÉFONO PARA PIN */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">WhatsApp del Negocio <span className="text-blue-500 text-xs">(Genera PIN)</span></label>
                <input 
                  type="text" 
                  required={!editBusinessId} 
                  value={businessPhone} 
                  onChange={(e) => setBusinessPhone(e.target.value)} 
                  disabled={!!editBusinessId}
                  placeholder="Ej. 3312345678" 
                  className="w-full text-gray-900 placeholder-gray-400 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 font-medium bg-gray-50 disabled:opacity-50" 
                />
                {!editBusinessId && <p className="text-xs text-gray-500 mt-1">Los últimos 4 dígitos serán la contraseña del cliente.</p>}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">Giro Comercial (Cambia el diseño final)</label>
                <select 
                  value={businessType} 
                  onChange={(e) => setBusinessType(e.target.value)} 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-purple-500 outline-none text-gray-900"
                >
                  <option value="gastronomia">Alimentos / Menú Vertical</option>
                  <option value="retail">Tienda / Catálogo en Cuadrícula</option>
                </select>
              </div>
              <div className="space-y-2 flex gap-4 md:col-span-2">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Logotipo</label>
                  <input type="file" accept="image/*" onChange={handleLogoChange} className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:font-bold file:bg-blue-50 file:text-blue-700 border border-gray-200 p-2 rounded-xl" />
                </div>
                <div className="w-24">
                  <label className="block text-sm font-bold text-gray-700 text-center mb-2">Color Marca</label>
                  <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-10 w-full rounded cursor-pointer border-0 p-0 shadow-sm" />
                </div>
              </div>
            </div>

            {/* FONDOS PREMIUM SCROLLABLES */}
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <label className="block text-sm font-bold text-gray-700">Fondo de Pantalla Premium</label>
              <div className="flex overflow-x-auto gap-4 pb-4 snap-x hide-scrollbar">
                {PRESET_BACKGROUNDS.map(bg => (
                  <div 
                    key={bg.id} 
                    onClick={() => { setPresetBg(bg.url); setBgFile(null); }}
                    className={`shrink-0 w-40 h-28 rounded-xl cursor-pointer bg-cover bg-center border-4 flex items-end p-2 transition-transform hover:scale-105 snap-center ${presetBg === bg.url ? 'border-blue-600 shadow-lg' : 'border-transparent shadow-sm'}`}
                    style={{ backgroundImage: `url(${bg.url})` }}
                  >
                    <span className="text-[10px] text-white font-black bg-black/70 px-2 py-1 rounded backdrop-blur-sm w-full text-center truncate">{bg.label}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-2">
                <span className="text-xs font-bold text-gray-400 uppercase">O sube tu imagen:</span>
                <input type="file" accept="image/*" onChange={handleBgChange} className="text-gray-900 placeholder-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:font-bold file:bg-purple-50 file:text-purple-700 border border-gray-200 p-2 rounded-xl text-sm" />
              </div>
            </div>
          </div>

          {/* IA */}
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 space-y-4">
            <h2 className="text-xl font-black text-gray-900 border-b pb-2">2. Inteligencia Artificial</h2>
            <textarea required value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} rows={3} placeholder="Define la personalidad de tu IA..." className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-blue-500 outline-none resize-none text-gray-900 placeholder-gray-400" 
            />
          </div>

          {/* CATÁLOGO */}
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 space-y-6">
            <h2 className="text-xl font-black text-gray-900 border-b pb-2">3. Constructor de Catálogo</h2>
            <div className="space-y-6">
              {catalog.map((cat, catIndex) => (
                <div key={cat.categoryId} className="p-6 bg-gray-50 border border-gray-200 rounded-2xl relative">
                  <button type="button" onClick={() => removeCategory(catIndex)} className="absolute top-4 right-4 text-red-500 text-sm font-black bg-red-50 px-3 py-1 rounded-lg">X Eliminar</button>
                  <input type="text" value={cat.categoryName} onChange={(e) => updateCategoryName(e.target.value, catIndex)} placeholder="Categoría (Ej. Bebidas, Celulares)" className="text-gray-900 placeholder-gray-400 bg-transparent font-bold text-lg outline-none mb-4 w-3/4 border-b border-gray-300 pb-1 focus:border-blue-500" />
                  
                  <div className="space-y-3">
                    {cat.items.map((item, itemIndex) => (
                      <div key={item.id} className="flex flex-col md:flex-row gap-3 bg-white p-4 rounded-xl border border-gray-100 items-center">
                        <div className="flex-1 space-y-3 w-full">
                          <div className="flex items-center gap-3 w-full">
                            <input 
                              type="text" 
                              value={item.name} 
                              onChange={(e) => updateItem(catIndex, itemIndex, 'name', e.target.value)} 
                              placeholder="Producto" 
                              className="text-gray-900 placeholder-gray-400 flex-1 p-2 bg-gray-50 rounded-lg outline-none focus:ring-2 focus:ring-green-100 font-medium" 
                            />
                            
                            {/* CONTENEDOR DE PRECIO */}
                            <div className="relative ml-auto shrink-0">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-green-600 font-sans font-black text-lg">$</span>
                              <input
                                type="number"
                                value={item.price}
                                onChange={(e) => updateItem(catIndex, itemIndex, 'price', e.target.value)}
                                placeholder="0"
                                className="w-32 bg-green-50 border border-green-100 rounded-full pl-10 pr-6 py-2.5 text-right text-lg font-black font-sans text-green-700 tracking-tight placeholder:text-green-200 focus:ring-1 focus:ring-green-400 focus:border-green-400 outline-none transition-all shadow-inner-sm"
                              />
                            </div>
                          </div>
                          <input type="text" value={item.description} onChange={(e) => updateItem(catIndex, itemIndex, 'description', e.target.value)} placeholder="Descripción para el cliente y la IA" className="text-gray-900 placeholder-gray-400 w-full p-2 bg-gray-50 rounded-lg outline-none text-sm" />
                        </div>
                        <button type="button" onClick={() => removeItem(catIndex, itemIndex)} className="text-gray-300 hover:text-red-500 p-2 shrink-0 self-start md:self-center">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={() => addItem(catIndex)} className="mt-4 text-blue-600 text-sm font-black bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors">+ Producto</button>
                </div>
              ))}
              <button type="button" onClick={addCategory} className="w-full py-4 border-2 border-dashed border-gray-300 rounded-2xl text-gray-500 font-black hover:text-blue-600 hover:bg-blue-50 transition-colors">+ Nueva Categoría</button>
            </div>
          </div>

          {/* DESPLIEGUE FINAL */}
          <button type="submit" disabled={loading} className="w-full bg-black text-white font-black py-5 rounded-2xl text-xl hover:bg-gray-800 shadow-2xl disabled:opacity-50 transition-all flex justify-center gap-3">
            {loading ? "Estructurando Bóveda y Catálogo..." : "Guardar y Desplegar Ecosistema"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-bold text-gray-500">Cargando constructor...</div>}>
      <OnboardingContent />
    </Suspense>
  );
}