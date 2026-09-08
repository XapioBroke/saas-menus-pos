"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Building2, PlusCircle, Trash2, Edit3, ExternalLink, ShieldCheck, LogOut, Search } from "lucide-react";
import { collection, getDocs, doc, deleteDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Business {
  id: string;
  businessName: string;
  businessType: string;
  createdAt?: string;
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"list" | "create">("list");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Estado para el formulario de Creación Rápida
  const [form, setForm] = useState({
    businessName: "",
    businessId: "",
    phone: "",
    businessType: "gastronomia",
    aiPrompt: "Eres un asistente amable y directo..."
  });
  const [creating, setCreating] = useState(false);

  // Validar sesión de Super Admin
  useEffect(() => {
    const isSuper = localStorage.getItem("is_super_admin");
    if (!isSuper) {
      router.push("/super-admin/login");
    } else {
      fetchBusinesses();
    }
  }, [router]);

  const fetchBusinesses = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "businesses"));
      const list: Business[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          businessName: data.businessName || docSnap.id,
          businessType: data.businessType || "gastronomia",
          createdAt: data.createdAt || "N/A"
        });
      });
      setBusinesses(list);
    } catch (error) {
      console.error("Error obteniendo negocios:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNameChange = (name: string) => {
    const slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
    setForm({ ...form, businessName: name, businessId: slug });
  };

  // Lógica de Fábrica Rápida (Alta en segundos sin pasar por Onboarding)
  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.businessId || !form.businessName || !form.phone) {
      alert("Completa todos los campos obligatorios.");
      return;
    }

    setCreating(true);
    try {
      const batch = writeBatch(db);
      const tempPin = form.phone.slice(-4);

      // 1. Colección principal (Businesses) con colores por defecto
      const bizRef = doc(db, "businesses", form.businessId);
      batch.set(bizRef, {
        businessName: form.businessName,
        businessType: form.businessType,
        aiPromptContext: form.aiPrompt,
        brandSettings: { primaryColor: "#009EE3", backgroundUrl: "" },
        createdAt: new Date().toISOString()
      });

      // 2. Bóveda Concierge (Seguridad)
      const conciergeRef = doc(db, "concierge_portals", form.businessId);
      batch.set(conciergeRef, {
        businessName: form.businessName,
        pin: tempPin,
        originalPhone: form.phone,
        isActive: true,
        requiresPinChange: true
      });

      // 3. Catálogo vacío inicial para evitar errores al cargar el portal
      const menuRef = doc(db, "menus", form.businessId);
      batch.set(menuRef, { catalog: [] });

      await batch.commit();
      
      alert(`¡Negocio creado! PIN temporal: ${tempPin}`);
      setForm({ businessName: "", businessId: "", phone: "", businessType: "gastronomia", aiPrompt: "Eres un asistente amable..." });
      setActiveTab("list");
      fetchBusinesses();
    } catch (error) {
      console.error("Error creando negocio:", error);
      alert("Error al guardar en base de datos.");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteBusiness = async (id: string, name: string) => {
    if (confirm(`¿Eliminar permanentemente "${name}" y toda su infraestructura?`)) {
      try {
        await deleteDoc(doc(db, "businesses", id));
        await deleteDoc(doc(db, "concierge_portals", id));
        await deleteDoc(doc(db, "menus", id));
        await deleteDoc(doc(db, "appointments", id)); // Por si tuviera citas sueltas
        setBusinesses(prev => prev.filter(b => b.id !== id));
      } catch (error) {
        console.error("Error eliminando:", error);
        alert("No se pudo eliminar el negocio.");
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("is_super_admin");
    router.push("/super-admin/login");
  };

  const filteredBusinesses = businesses.filter(b => 
    b.businessName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    b.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] font-sans p-6 lg:p-12">
      <div className="max-w-5xl mx-auto space-y-8">
        
        <header className="flex flex-col md:flex-row items-center justify-between gap-4 bg-[#18181B] border border-[#27272A] p-6 rounded-[28px] shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#009EE3]/10 border border-[#009EE3]/20 rounded-2xl flex items-center justify-center text-[#009EE3]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Centro de Mando Super-Admin</h1>
              <p className="text-xs text-[#A1A1AA]">Control centralizado de infraestructura SaaS miterminal.com</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={handleLogout} className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold rounded-xl text-xs border border-red-500/20 transition-colors flex items-center gap-1.5">
              <LogOut className="w-4 h-4" /> Salir
            </button>
          </div>
        </header>

        {/* Pestañas de Navegación Híbrida */}
        <div className="flex gap-3 border-b border-[#27272A] pb-4">
          <button 
            onClick={() => setActiveTab("list")}
            className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === "list" ? "bg-[#009EE3] text-white shadow-lg" : "bg-[#18181B] text-[#A1A1AA] hover:text-white border border-[#27272A]"
            }`}
          >
            <Building2 className="w-4 h-4" /> Historial de Negocios ({businesses.length})
          </button>
          <button 
            onClick={() => setActiveTab("create")}
            className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === "create" ? "bg-[#009EE3] text-white shadow-lg" : "bg-[#18181B] text-[#A1A1AA] hover:text-white border border-[#27272A]"
            }`}
          >
            <PlusCircle className="w-4 h-4" /> Alta Rápida (Fábrica)
          </button>
        </div>

        {/* --- PESTAÑA 1: LISTADO Y GESTIÓN --- */}
        {activeTab === "list" && (
          <div className="space-y-6">
            <div className="relative">
              <Search className="absolute left-4 top-3.5 w-5 h-5 text-[#A1A1AA]" />
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar negocio por nombre o ID..." className="w-full bg-[#18181B] border border-[#27272A] rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white placeholder-[#71717A] outline-none focus:border-[#009EE3] transition-colors" />
            </div>

            {loading ? (
              <div className="text-center py-20 text-[#A1A1AA] animate-pulse text-sm">Cargando base de datos...</div>
            ) : filteredBusinesses.length === 0 ? (
              <div className="bg-[#18181B] border border-[#27272A] rounded-3xl p-12 text-center space-y-3">
                <Building2 className="w-10 h-10 text-[#A1A1AA] mx-auto opacity-40" />
                <p className="text-white font-semibold">No se encontraron negocios</p>
                <p className="text-xs text-[#A1A1AA]">Usa la pestaña "Alta Rápida" para dar de alta al primer cliente.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredBusinesses.map((biz) => (
                  <motion.div key={biz.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#18181B] border border-[#27272A] p-6 rounded-3xl shadow-xl flex flex-col justify-between gap-4 relative overflow-hidden">
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-mono font-bold text-[#009EE3] bg-[#009EE3]/10 px-2.5 py-1 rounded-full border border-[#009EE3]/20">{biz.id}</span>
                          <h3 className="text-lg font-bold text-white mt-2">{biz.businessName}</h3>
                          <p className="text-xs text-[#A1A1AA] capitalize">Giro: {biz.businessType}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-[#27272A]">
                      <div className="flex items-center gap-2">
                        <button onClick={() => window.open(`/portal/${biz.id}`, "_blank")} className="px-3 py-2 bg-[#27272A] hover:bg-[#009EE3]/20 hover:text-[#009EE3] text-[#A1A1AA] text-xs font-bold rounded-xl transition-colors flex items-center gap-1" title="Abrir Portal Concierge">
                          <ExternalLink className="w-3.5 h-3.5" /> Portal
                        </button>
                        <button onClick={() => window.open(`/reservas/${biz.id}`, "_blank")} className="px-3 py-2 bg-[#27272A] hover:bg-[#009EE3]/20 hover:text-[#009EE3] text-[#A1A1AA] text-xs font-bold rounded-xl transition-colors flex items-center gap-1" title="Abrir Reservas">
                          <ExternalLink className="w-3.5 h-3.5" /> Reservas
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* El botón de edición abre el Constructor Completo */}
                        <button onClick={() => router.push(`/admin/onboarding?businessId=${biz.id}`)} className="p-2 bg-[#27272A] hover:bg-amber-500/20 text-amber-400 rounded-xl transition-colors" title="Editar Diseño y Catálogo Completo">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteBusiness(biz.id, biz.businessName)} className="p-2 bg-[#27272A] hover:bg-red-500/20 text-red-400 rounded-xl transition-colors" title="Eliminar Negocio">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- PESTAÑA 2: FÁBRICA RÁPIDA --- */}
        {activeTab === "create" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#18181B] border border-[#27272A] p-8 rounded-[32px] shadow-2xl space-y-6">
            <div className="border-b border-[#27272A] pb-4">
              <h2 className="text-xl font-bold text-white">Alta Rápida de Infraestructura</h2>
              <p className="text-xs text-[#A1A1AA] mt-1">Crea el portal de seguridad y la base de datos base al instante. Podrás editar el catálogo más tarde.</p>
            </div>
            
            <form onSubmit={handleCreateBusiness} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#A1A1AA] uppercase">Nombre Comercial</label>
                  <input type="text" required value={form.businessName} onChange={(e) => handleNameChange(e.target.value)} placeholder="Ej. Barbería Central" className="w-full bg-[#27272A]/50 border border-[#27272A] rounded-2xl p-3.5 text-sm text-white outline-none focus:border-[#009EE3]" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#A1A1AA] uppercase">ID (URL Autogenerada)</label>
                  <input type="text" required readOnly value={form.businessId} placeholder="barberia-central" className="w-full bg-[#27272A]/20 border border-[#27272A] rounded-2xl p-3.5 text-sm text-[#009EE3] font-mono outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#A1A1AA] uppercase">WhatsApp (PIN de acceso)</label>
                  <input type="tel" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Ej. 3312345678" className="w-full bg-[#27272A]/50 border border-[#27272A] rounded-2xl p-3.5 text-sm text-white outline-none focus:border-[#009EE3]" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#A1A1AA] uppercase">Giro Operativo</label>
                  <select value={form.businessType} onChange={(e) => setForm({ ...form, businessType: e.target.value })} className="w-full bg-[#27272A]/50 border border-[#27272A] rounded-2xl p-3.5 text-sm text-white outline-none focus:border-[#009EE3] cursor-pointer">
                    <option value="gastronomia" className="bg-[#18181B]">Alimentos / Restaurante</option>
                    <option value="servicios" className="bg-[#18181B]">Servicios / Barberías (Citas)</option>
                    <option value="retail" className="bg-[#18181B]">Retail / Tienda</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-semibold text-[#A1A1AA] uppercase">Instrucciones Básicas para la IA</label>
                <textarea rows={3} value={form.aiPrompt} onChange={(e) => setForm({ ...form, aiPrompt: e.target.value })} className="w-full bg-[#27272A]/50 border border-[#27272A] rounded-2xl p-3.5 text-sm text-white outline-none focus:border-[#009EE3] resize-none" />
              </div>

              <button type="submit" disabled={creating} className="w-full mt-4 py-4 bg-gradient-to-r from-[#009EE3] to-[#06B6D4] text-white font-bold rounded-2xl shadow-lg hover:opacity-95 transition-opacity disabled:opacity-50 text-base">
                {creating ? "Generando infraestructura..." : "Crear Negocio e Inicializar Bóveda"}
              </button>
            </form>
          </motion.div>
        )}

      </div>
    </div>
  );
}