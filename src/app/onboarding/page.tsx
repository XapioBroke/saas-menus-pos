"use client";

import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

// Utilidad rápida para generar IDs únicos para los platillos
const generateId = () => Math.random().toString(36).substr(2, 9);

export default function OnboardingPage() {
  const router = useRouter();
  
  const [businessName, setBusinessName] = useState("");
  const [businessSlug, setBusinessSlug] = useState("");
  const [category, setCategory] = useState("Restaurante / Cafetería");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ESTADO DINÁMICO DEL CONSTRUCTOR DE MENÚS
  const [catalog, setCatalog] = useState([
    {
      categoryId: generateId(),
      categoryName: "",
      items: [
        { id: generateId(), name: "", price: "", description: "", available: true }
      ]
    }
  ]);

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = e.target.value
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    setBusinessSlug(formatted);
  };

  // FUNCIONES DEL CONSTRUCTOR DINÁMICO
  const addCategory = () => {
    setCatalog([...catalog, { categoryId: generateId(), categoryName: "", items: [] }]);
  };

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

  const saveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName || !businessSlug) {
      setError("Por favor completa los campos obligatorios del negocio.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. Guardar Datos del Negocio
      const businessRef = doc(db, "businesses", businessSlug);
      await setDoc(businessRef, {
        businessName,
        category,
        createdAt: new Date().toISOString()
      });

      // 2. Guardar Catálogo Dinámico (Asegurando que los precios sean números)
      const menuRef = doc(db, "menus", businessSlug);
      const cleanCatalog = catalog.map(sec => ({
        category: sec.categoryName || "Sin Categoría",
        items: sec.items.map(item => ({
          ...item,
          price: Number(item.price) || 0
        }))
      }));

      await setDoc(menuRef, { catalog: cleanCatalog });

      // 3. Redirección al Menú en Vivo
      router.push(`/admin/${businessSlug}`);
      
    } catch (err) {
      console.error("Error al guardar en Firebase:", err);
      setError("Hubo un error al registrar el negocio. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* SECCIÓN 1: DATOS DEL NEGOCIO */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-extrabold text-gray-900">Configuración del Negocio</h1>
            <p className="text-sm text-gray-500 mt-1">Define la identidad de tu ecosistema digital.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre del Establecimiento</label>
              <input 
                type="text" 
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Ej. Vinos Ancestrales"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Enlace Web Único</label>
              <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                <span className="text-gray-400 text-sm mr-1">tudominio.com/menu/</span>
                <input 
                  type="text" 
                  required
                  value={businessSlug}
                  onChange={handleSlugChange}
                  placeholder="vinos-ancestrales"
                  className="w-full bg-transparent text-sm focus:outline-none text-gray-800 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Giro Comercial</label>
              <select 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
              >
                <option value="Restaurante / Cafetería">Restaurante / Cafetería / Bar</option>
                <option value="Comercio / Minisúper">Minisúper / Abarrotes</option>
                <option value="Ferretería / Tlapalería">Ferretería / Tlapalería</option>
                <option value="Servicios / Otro">Otro Establecimiento Comercial</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECCIÓN 2: CONSTRUCTOR DEL MENÚ */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-extrabold text-gray-900">Constructor de Catálogo</h2>
              <p className="text-sm text-gray-500 mt-1">Crea tus categorías y añade productos. La IA leerá esto al instante.</p>
            </div>
          </div>

          <div className="space-y-8">
            {catalog.map((cat, catIndex) => (
              <div key={cat.categoryId} className="p-6 bg-gray-50 border border-gray-200 rounded-xl relative">
                <button 
                  onClick={() => removeCategory(catIndex)}
                  className="absolute top-4 right-4 text-red-500 hover:text-red-700 text-sm font-semibold"
                >
                  Eliminar Categoría
                </button>

                <div className="mb-4 pr-32">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nombre de la Categoría</label>
                  <input 
                    type="text" 
                    value={cat.categoryName}
                    onChange={(e) => updateCategoryName(e.target.value, catIndex)}
                    placeholder="Ej. Licores Artesanales, Entradas, Bebidas..."
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 font-bold text-gray-900"
                  />
                </div>

                <div className="space-y-3 mt-4">
                  {cat.items.map((item, itemIndex) => (
                    <div key={item.id} className="flex gap-3 items-start bg-white p-4 rounded-lg shadow-sm border border-gray-100 relative group">
                      <div className="flex-1 space-y-3">
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <input 
                              type="text" 
                              value={item.name}
                              onChange={(e) => updateItem(catIndex, itemIndex, 'name', e.target.value)}
                              placeholder="Nombre del producto"
                              className="w-full bg-gray-50 border border-gray-200 rounded text-sm px-3 py-2 text-gray-900 focus:outline-none"
                            />
                          </div>
                          <div className="w-24">
                            <input 
                              type="number" 
                              value={item.price}
                              onChange={(e) => updateItem(catIndex, itemIndex, 'price', e.target.value)}
                              placeholder="$ Precio"
                              className="w-full bg-gray-50 border border-gray-200 rounded text-sm px-3 py-2 text-gray-900 focus:outline-none font-bold"
                            />
                          </div>
                        </div>
                        <div>
                          <input 
                            type="text" 
                            value={item.description}
                            onChange={(e) => updateItem(catIndex, itemIndex, 'description', e.target.value)}
                            placeholder="Descripción breve o ingredientes (Ayuda mucho a la IA)"
                            className="w-full bg-gray-50 border border-gray-200 rounded text-sm px-3 py-2 text-gray-900 focus:outline-none"
                          />
                        </div>
                      </div>
                      <button 
                        onClick={() => removeItem(catIndex, itemIndex)}
                        className="text-gray-400 hover:text-red-500 pt-2"
                        title="Borrar producto"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => addItem(catIndex)}
                  className="mt-4 text-blue-600 text-sm font-semibold hover:text-blue-800 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Agregar producto a esta categoría
                </button>
              </div>
            ))}

            <button 
              onClick={addCategory}
              className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-semibold hover:border-blue-500 hover:text-blue-600 transition-colors"
            >
              + Agregar Nueva Categoría
            </button>
          </div>
        </div>

        <button 
          onClick={saveBusiness}
          disabled={loading}
          className="w-full bg-blue-600 text-white font-bold text-lg py-5 px-6 rounded-2xl hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
        >
          {loading ? "Creando Plataforma..." : "Publicar Menú y Activar IA"}
        </button>

      </div>
    </div>
  );
}