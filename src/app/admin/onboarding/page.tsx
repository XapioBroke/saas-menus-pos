"use client";

import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useRouter } from "next/navigation";

// Utilidad para generar IDs únicos para categorías y platillos
const generateId = () => Math.random().toString(36).substr(2, 9);

export default function OnboardingPage() {
  const router = useRouter();
  
  // 1. ESTADOS DE IDENTIDAD Y MARCA BLANCA
  const [businessName, setBusinessName] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [businessType, setBusinessType] = useState("gastronomia");
  const [primaryColor, setPrimaryColor] = useState("#2563eb");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bgFile, setBgFile] = useState<File | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  
  // 2. ESTADOS DEL CONSTRUCTOR DE MENÚ/CATÁLOGO
  const [catalog, setCatalog] = useState([
    {
      categoryId: generateId(),
      categoryName: "",
      items: [
        { id: generateId(), name: "", price: "", description: "", available: true }
      ]
    }
  ]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // FORMATO DE URL SEGURA
  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = e.target.value
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    setBusinessId(formatted);
  };

  // FUNCIONES DE ARCHIVOS
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setLogoFile(e.target.files[0]);
  };
  const handleBgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setBgFile(e.target.files[0]);
  };

  // FUNCIONES DEL CONSTRUCTOR DINÁMICO
  const addCategory = () => setCatalog([...catalog, { categoryId: generateId(), categoryName: "", items: [] }]);
  const removeCategory = (catIndex: number) => {
    const newCatalog = [...catalog];
    newCatalog.splice(catIndex, 1);
    setCatalog(newCatalog);
  };
  const updateCategoryName = (text: string, catIndex: number) => {
    const newCatalog = [...catalog];
    newCatalog[catIndex].categoryName = text;
    setCatalog(newCatalog);
  };
  const addItem = (catIndex: number) => {
    const newCatalog = [...catalog];
    newCatalog[catIndex].items.push({ id: generateId(), name: "", price: "", description: "", available: true });
    setCatalog(newCatalog);
  };
  const removeItem = (catIndex: number, itemIndex: number) => {
    const newCatalog = [...catalog];
    newCatalog[catIndex].items.splice(itemIndex, 1);
    setCatalog(newCatalog);
  };
  const updateItem = (catIndex: number, itemIndex: number, field: string, value: any) => {
    const newCatalog = [...catalog];
    newCatalog[catIndex].items[itemIndex] = { ...newCatalog[catIndex].items[itemIndex], [field]: value };
    setCatalog(newCatalog);
  };

  // GUARDADO MAESTRO
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId.trim() || !businessName.trim()) {
      setMessage("Error: El nombre y el ID del negocio son obligatorios.");
      return;
    }

    setLoading(true);
    setMessage("Subiendo archivos, estructurando menú y configurando IA...");

    try {
      let logoUrl = "";
      let backgroundUrl = "";

      // 1. Subida paralela de archivos
      const uploadPromises = [];
      if (logoFile) {
        const logoRef = ref(storage, `logos/${businessId}_${logoFile.name}`);
        uploadPromises.push(uploadBytes(logoRef, logoFile).then(snap => getDownloadURL(snap.ref)).then(url => { logoUrl = url; }));
      }
      if (bgFile) {
        const bgRef = ref(storage, `backgrounds/${businessId}_${bgFile.name}`);
        uploadPromises.push(uploadBytes(bgRef, bgFile).then(snap => getDownloadURL(snap.ref)).then(url => { backgroundUrl = url; }));
      }
      if (uploadPromises.length > 0) await Promise.all(uploadPromises);

      // 2. Guardar Configuración de Marca (businesses)
      const businessPayload = {
        businessName,
        businessType,
        brandSettings: {
          primaryColor,
          ...(logoUrl && { logoUrl }),
          ...(backgroundUrl && { backgroundUrl })
        },
        aiPromptContext: aiPrompt,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, "businesses", businessId), businessPayload, { merge: true });

      // 3. Guardar Catálogo Dinámico (menus)
      const cleanCatalog = catalog.map(sec => ({
        category: sec.categoryName || "Sin Categoría",
        items: sec.items.map(item => ({
          ...item,
          price: Number(item.price) || 0
        }))
      }));
      await setDoc(doc(db, "menus", businessId), { catalog: cleanCatalog }, { merge: true });

      setMessage("¡Ecosistema creado exitosamente!");
      setTimeout(() => {
        router.push(`/admin/dashboard?businessId=${businessId}`);
      }, 2000);

    } catch (error) {
      console.error("Error en Guardado Maestro:", error);
      setMessage("Error crítico al guardar la plataforma.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <header className="text-center space-y-2 mb-8">
          <h1 className="text-3xl font-black text-gray-900">Configuración de Plataforma</h1>
          <p className="text-gray-500 font-medium">Personaliza tu marca, define las reglas de tu IA y crea tu catálogo.</p>
        </header>

        <form onSubmit={handleSave} className="space-y-8">
          
          {message && (
            <div className={`p-4 rounded-xl text-sm font-bold text-center ${message.includes("Error") ? "bg-red-50 text-red-700 border-red-200" : "bg-green-50 text-green-700 border-green-200"} border`}>
              {message}
            </div>
          )}

          {/* SECCIÓN 1 Y 2: MARCA BLANCA */}
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 space-y-8">
            <section className="space-y-4">
              <h2 className="text-xl font-black text-gray-900 border-b pb-2">1. Identidad y Marca Blanca</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">Nombre del Negocio</label>
                  <input type="text" required value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Ej. Licores del Valle" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 font-medium" />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">ID Único (URL Segura)</label>
                  <input type="text" required value={businessId} onChange={handleIdChange} placeholder="licores-valle" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 font-mono text-blue-600" />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">Logotipo Oficial</label>
                  <input type="file" accept="image/*" onChange={handleLogoChange} className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:font-bold file:bg-blue-50 file:text-blue-700 cursor-pointer" />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">Fondo (Opcional)</label>
                  <input type="file" accept="image/*" onChange={handleBgChange} className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:font-bold file:bg-purple-50 file:text-purple-700 cursor-pointer" />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">Color Corporativo</label>
                  <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-12 w-full rounded cursor-pointer border-0 p-0" />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">Giro Comercial</label>
                  <select value={businessType} onChange={(e) => setBusinessType(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 font-medium">
                    <option value="gastronomia">Restaurante / Alimentos</option>
                    <option value="retail">Tienda / Retail</option>
                  </select>
                </div>
              </div>
            </section>
          </div>

          {/* SECCIÓN 3: INTELIGENCIA ARTIFICIAL */}
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 space-y-4">
            <h2 className="text-xl font-black text-gray-900 border-b pb-2">2. Inteligencia Artificial</h2>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">Instrucciones Maestras (Prompt)</label>
              <textarea required value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} rows={3} placeholder="Ej. Actúa como sommelier experto, sé amable y recomienda maridajes..." className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 font-medium resize-none" />
            </div>
          </div>

          {/* SECCIÓN 4: CONSTRUCTOR DE CATÁLOGO */}
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 space-y-6">
            <h2 className="text-xl font-black text-gray-900 border-b pb-2">3. Catálogo de Productos</h2>
            <p className="text-sm text-gray-500">Añade los productos que tu Inteligencia Artificial podrá vender o recomendar.</p>
            
            <div className="space-y-6">
              {catalog.map((cat, catIndex) => (
                <div key={cat.categoryId} className="p-6 bg-gray-50 border border-gray-200 rounded-2xl relative">
                  <button type="button" onClick={() => removeCategory(catIndex)} className="absolute top-4 right-4 text-red-500 hover:text-red-700 text-sm font-black bg-red-50 px-3 py-1 rounded-lg">
                    X Eliminar Categoría
                  </button>

                  <div className="mb-4 pr-40">
                    <input type="text" value={cat.categoryName} onChange={(e) => updateCategoryName(e.target.value, catIndex)} placeholder="Nombre de Categoría (Ej. Entradas, Licores...)" className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 font-black text-gray-900 text-lg" />
                  </div>

                  <div className="space-y-3">
                    {cat.items.map((item, itemIndex) => (
                      <div key={item.id} className="flex gap-3 bg-white p-4 rounded-xl shadow-sm border border-gray-100 items-start">
                        <div className="flex-1 space-y-3">
                          <div className="flex gap-3">
                            <input type="text" value={item.name} onChange={(e) => updateItem(catIndex, itemIndex, 'name', e.target.value)} placeholder="Nombre del producto" className="flex-1 bg-gray-50 border border-gray-200 rounded-lg text-sm px-3 py-2 font-bold focus:outline-none" />
                            <input type="number" value={item.price} onChange={(e) => updateItem(catIndex, itemIndex, 'price', e.target.value)} placeholder="$ Precio" className="w-28 bg-gray-50 border border-gray-200 rounded-lg text-sm px-3 py-2 font-bold text-green-600 focus:outline-none" />
                          </div>
                          <input type="text" value={item.description} onChange={(e) => updateItem(catIndex, itemIndex, 'description', e.target.value)} placeholder="Descripción breve o ingredientes para la IA" className="w-full bg-gray-50 border border-gray-200 rounded-lg text-sm px-3 py-2 text-gray-600 focus:outline-none" />
                        </div>
                        <button type="button" onClick={() => removeItem(catIndex, itemIndex)} className="text-gray-300 hover:text-red-500 p-2">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>

                  <button type="button" onClick={() => addItem(catIndex)} className="mt-4 text-blue-600 text-sm font-black hover:text-blue-800 flex items-center gap-1">
                    + Agregar producto a esta categoría
                  </button>
                </div>
              ))}

              <button type="button" onClick={addCategory} className="w-full py-4 border-2 border-dashed border-gray-300 rounded-2xl text-gray-500 font-black hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                + Agregar Nueva Categoría
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-black text-white font-black py-5 rounded-2xl text-xl hover:bg-gray-800 shadow-2xl transition-all disabled:opacity-50">
            {loading ? "Desplegando Infraestructura..." : "Guardar Ecosistema y Desplegar"}
          </button>
        </form>
      </div>
    </div>
  );
}