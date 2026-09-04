"use client";

import { useState, useEffect, Suspense } from "react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useRouter, useSearchParams } from "next/navigation";

const generateId = () => Math.random().toString(36).substr(2, 9);

// Galería Premium de Fondos Tier 1
const PRESET_BACKGROUNDS = [
  { id: "tech", label: "Malla Tecnológica", url: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1000&auto=format&fit=crop" },
  { id: "minimal", label: "Abstracto Oscuro", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop" },
  { id: "gastronomy", label: "Pizarra Rústica", url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=1000&auto=format&fit=crop" },
  { id: "marble", label: "Mármol Premium", url: "https://images.unsplash.com/photo-1539284347209-663863481232?q=80&w=1000&auto=format&fit=crop" }
];

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editBusinessId = searchParams.get("businessId");
  
  const [businessName, setBusinessName] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [businessType, setBusinessType] = useState("gastronomia");
  const [primaryColor, setPrimaryColor] = useState("#2563eb");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  
  // Fondos
  const [presetBg, setPresetBg] = useState("");
  const [bgFile, setBgFile] = useState<File | null>(null);
  
  const [aiPrompt, setAiPrompt] = useState("");
  const [catalog, setCatalog] = useState([
    { categoryId: generateId(), categoryName: "", items: [{ id: generateId(), name: "", price: "", description: "", available: true }] }
  ]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (editBusinessId) {
      setLoading(true);
      setBusinessId(editBusinessId);
      const fetchData = async () => {
        try {
          const businessSnap = await getDoc(doc(db, "businesses", editBusinessId));
          const menuSnap = await getDoc(doc(db, "menus", editBusinessId));
          
          if (businessSnap.exists()) {
            const data = businessSnap.data();
            setBusinessName(data.businessName || "");
            setBusinessType(data.businessType || "gastronomia");
            setPrimaryColor(data.brandSettings?.primaryColor || "#2563eb");
            setAiPrompt(data.aiPromptContext || "");
            
            // Rehidratar fondo
            const existingBgUrl = data.brandSettings?.backgroundUrl;
            if (existingBgUrl) {
              const isPreset = PRESET_BACKGROUNDS.find(p => p.url === existingBgUrl);
              if (isPreset) setPresetBg(existingBgUrl);
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
      setPresetBg(""); // Limpiamos el preset si el usuario sube un archivo propio
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
    setLoading(true);
    setMessage("Estructurando plataforma...");

    try {
      let logoUrl = "";
      let backgroundUrl = presetBg; // Iniciamos con el preset seleccionado
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

      const payload = {
        businessName, businessType,
        brandSettings: { primaryColor, ...(logoUrl && { logoUrl }), ...(backgroundUrl && { backgroundUrl }) },
        aiPromptContext: aiPrompt, updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, "businesses", businessId), payload, { merge: true });

      const cleanCatalog = catalog.map(sec => ({
        category: sec.categoryName || "Sin Categoría",
        items: sec.items.map(item => ({ ...item, price: Number(item.price) || 0 }))
      }));
      await setDoc(doc(db, "menus", businessId), { catalog: cleanCatalog }, { merge: true });

      setMessage("¡Ecosistema en línea!");
      setTimeout(() => router.push(`/admin/dashboard?businessId=${businessId}`), 2000);
    } catch (error) {
      console.error(error);
      setMessage("Error al guardar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="text-center space-y-2 mb-8">
          <h1 className="text-3xl font-black text-gray-900">{editBusinessId ? "Editar Plataforma" : "Configuración SaaS"}</h1>
          <p className="text-gray-500 font-medium">Diseña tu marca, el catálogo y las reglas de tu asistente virtual.</p>
        </header>

        <form onSubmit={handleSave} className="space-y-8">
          {message && <div className={`p-4 rounded-xl text-sm font-bold text-center ${message.includes("Error") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"} border`}>{message}</div>}

          {/* IDENTIDAD */}
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 space-y-6">
            <h2 className="text-xl font-black text-gray-900 border-b pb-2">1. Identidad Corporativa</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">Nombre del Negocio</label>
                <input type="text" required value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none font-medium" />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">ID Único (URL)</label>
                <input type="text" required value={businessId} onChange={handleIdChange} disabled={!!editBusinessId} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none font-mono text-blue-600 disabled:opacity-50" />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">Logotipo</label>
                <input type="file" accept="image/*" onChange={handleLogoChange} className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:font-bold file:bg-blue-50 file:text-blue-700" />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">Color Primario</label>
                <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-12 w-full rounded cursor-pointer border-0 p-0" />
              </div>
            </div>

            {/* FONDOS PREMIUM */}
            <div className="space-y-4 pt-4">
              <label className="block text-sm font-bold text-gray-700">Fondo de Pantalla (Selecciona un diseño premium o sube el tuyo)</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {PRESET_BACKGROUNDS.map(bg => (
                  <div 
                    key={bg.id} 
                    onClick={() => { setPresetBg(bg.url); setBgFile(null); }}
                    className={`h-24 rounded-xl cursor-pointer bg-cover bg-center border-4 flex items-end p-2 transition-all hover:scale-105 ${presetBg === bg.url ? 'border-blue-600 shadow-lg' : 'border-transparent shadow-sm'}`}
                    style={{ backgroundImage: `url(${bg.url})` }}
                  >
                    <span className="text-[10px] text-white font-black bg-black/60 px-2 py-1 rounded backdrop-blur-sm">{bg.label}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-2">
                <span className="text-xs font-bold text-gray-400 uppercase">O subir archivo personalizado:</span>
                <input type="file" accept="image/*" onChange={handleBgChange} className="flex-1 text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:font-bold file:bg-purple-50 file:text-purple-700" />
              </div>
            </div>
          </div>

          {/* IA */}
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 space-y-4">
            <h2 className="text-xl font-black text-gray-900 border-b pb-2">2. Inteligencia Artificial</h2>
            <textarea required value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} rows={3} placeholder="Define la personalidad de tu IA..." className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none font-medium resize-none" />
          </div>

          {/* CATÁLOGO */}
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 space-y-6">
            <h2 className="text-xl font-black text-gray-900 border-b pb-2">3. Constructor de Catálogo</h2>
            <div className="space-y-6">
              {catalog.map((cat, catIndex) => (
                <div key={cat.categoryId} className="p-6 bg-gray-50 border border-gray-200 rounded-2xl relative">
                  <button type="button" onClick={() => removeCategory(catIndex)} className="absolute top-4 right-4 text-red-500 text-sm font-black bg-red-50 px-3 py-1 rounded-lg">X Eliminar</button>
                  <input type="text" value={cat.categoryName} onChange={(e) => updateCategoryName(e.target.value, catIndex)} placeholder="Categoría (Ej. Bebidas)" className="mb-4 w-full md:w-1/2 bg-white border border-gray-300 rounded-xl px-4 py-2 font-black" />
                  
                  <div className="space-y-3">
                    {cat.items.map((item, itemIndex) => (
                      <div key={item.id} className="flex gap-3 bg-white p-4 rounded-xl border border-gray-100">
                        <div className="flex-1 space-y-3">
                          <div className="flex gap-3">
                            <input type="text" value={item.name} onChange={(e) => updateItem(catIndex, itemIndex, 'name', e.target.value)} placeholder="Producto" className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold" />
                            <input type="number" value={item.price} onChange={(e) => updateItem(catIndex, itemIndex, 'price', e.target.value)} placeholder="$ Precio" className="w-24 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-green-600" />
                          </div>
                          <input type="text" value={item.description} onChange={(e) => updateItem(catIndex, itemIndex, 'description', e.target.value)} placeholder="Descripción para el cliente y la IA" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600" />
                        </div>
                        <button type="button" onClick={() => removeItem(catIndex, itemIndex)} className="text-gray-300 hover:text-red-500 p-2"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={() => addItem(catIndex)} className="mt-4 text-blue-600 text-sm font-black">+ Producto</button>
                </div>
              ))}
              <button type="button" onClick={addCategory} className="w-full py-4 border-2 border-dashed border-gray-300 rounded-2xl text-gray-500 font-black hover:text-blue-600 hover:bg-blue-50">+ Nueva Categoría</button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-black text-white font-black py-5 rounded-2xl text-xl hover:bg-gray-800 shadow-2xl disabled:opacity-50">
            {loading ? "Estructurando..." : "Guardar y Desplegar Ecosistema"}
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