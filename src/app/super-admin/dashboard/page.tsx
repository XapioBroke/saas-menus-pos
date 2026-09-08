"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Building2, PlusCircle, Trash2, Edit3, ExternalLink, ShieldCheck, LogOut, Search, Palette, Image as ImageIcon } from "lucide-react";
import { collection, getDocs, doc, deleteDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Business {
  id: string;
  businessName: string;
  businessType: string;
  createdAt?: string;
}

const PREMIUM_BACKGROUNDS = [
  { id: "bg-cyber", name: "Malla Cyber", src: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=300&q=80" },
  { id: "bg-circuit", name: "Circuitos", src: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=300&q=80" },
  { id: "bg-wood", name: "Madera Rústica", src: "https://images.unsplash.com/photo-1551269901-5c5e14c25df7?auto=format&fit=crop&w=300&q=80" },
  { id: "bg-marble", name: "Mármol Oscuro", src: "https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?auto=format&fit=crop&w=300&q=80" },
  { id: "bg-fresh", name: "Abarrotes / Fresco", src: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=300&q=80" }
];

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"list" | "create">("list");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Estado completo de la Fábrica (Infraestructura + Diseño)
  const [form, setForm] = useState({
    businessName: "",
    businessId: "",
    phone: "",
    businessType: "gastronomia",
    aiPrompt: "Eres un experto asesor y recepcionista...",
    primaryColor: "#009EE3",
    backgroundUrl: PREMIUM_BACKGROUNDS[0].src,
    logoUrl: ""
  });
  const [creating, setCreating] = useState(false);

  // Validación Super-Admin
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

  // Lógica de Fábrica Completa (Con diseño inyectado)
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

      // 1. Colección Businesses (Ahora incluye el diseño visual de forma nativa)
      const bizRef = doc(db, "businesses", form.businessId);
      batch.set(bizRef, {
        businessName: form.businessName,
        businessType: form.businessType,
        aiPromptContext: form.aiPrompt,
        brandSettings: { 
          primaryColor: form.primaryColor, 
          backgroundUrl: form.backgroundUrl,
          logoUrl: form.logoUrl // En un entorno real se subiría a Storage, aquí guardamos la referencia
        },
        createdAt: new Date().toISOString()
      });

      // 2. Bóveda Concierge
      const conciergeRef = doc(db, "concierge_portals", form.businessId);
      batch.set(conciergeRef, {
        businessName: form.businessName,
        pin: tempPin,
        originalPhone: form.phone,
        isActive: true,
        requiresPinChange: true
      });

      // 3. Catálogo base
      const menuRef = doc(db, "menus", form.businessId);
      batch.set(menuRef, { catalog: [] });

      await batch.commit();
      
      alert(`¡Plataforma desplegada con éxito!\nID: ${form.businessId}\nPIN Temporal: ${tempPin}`);
      setForm({ ...form, businessName: "", businessId: "", phone: "" }); // Reset parcial
      setActiveTab("list");
      fetchBusinesses();
    } catch (error) {
      console.error("Error creando negocio:", error);
      alert("Error al guardar en la base de datos.");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteBusiness = async (id: string, name: string) => {
    if (confirm(`Alerta Crítica: ¿Eliminar permanentemente "${name}" y todos sus datos?`)) {
      try {
        await deleteDoc(doc(db, "businesses", id));
        await deleteDoc(doc(db, "concierge_portals", id));
        await deleteDoc(doc(db, "menus", id));
        setBusinesses(prev => prev.filter(b => b.id !== id));
      } catch (error) {
        console.error("Error eliminando:", error);
        alert("Fallo en la eliminación.");
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

          <button onClick={handleLogout} className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold rounded-xl text-xs border border-red-500/20 transition-colors flex items-center gap-1.5">
            <LogOut className="w-4 h-4" /> Salir
          </button>
        </header>

        {/* Pestañas Híbridas */}
        <div className="flex gap-3 border-b border-[#27272A] pb-4">
          <button onClick={() => setActiveTab("list")} className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === "list" ? "bg-[#009EE3] text-white shadow-lg" : "bg-[#18181B] text-[#A1A1AA] hover:text-white border border-[#27272A]"}`}>
            <Building2 className="w-4 h-4" /> Historial de Negocios ({businesses.length})
          </button>
          <button onClick={() => setActiveTab("create")} className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === "create" ? "bg-[#009EE3] text-white shadow-lg" : "bg-[#18181B] text-[#A1A1AA] hover:text-white border border-[#27272A]"}`}>
            <PlusCircle className="w-4 h-4" /> Fábrica de Ecosistemas
          </button>
        </div>

        {/* --- PESTAÑA 1: HISTORIAL --- */}
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
                <p className="text-white font-semibold">No hay negocios registrados.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredBusinesses.map((biz) => (
                  <motion.div key={biz.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#18181B] border border-[#27272A] p-6 rounded-3xl shadow-xl flex flex-col justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-[#009EE3] bg-[#009EE3]/10 px-2.5 py-1 rounded-full border border-[#009EE3]/20">{biz.id}</span>
                      <h3 className="text-lg font-bold text-white mt-2">{biz.businessName}</h3>
                      <p className="text-xs text-[#A1A1AA] capitalize">Giro: {biz.businessType}</p>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-[#27272A]">
                      <div className="flex items-center gap-2">
                        <button onClick={() => window.open(`/portal/${biz.id}`, "_blank")} className="px-3 py-2 bg-[#27272A] hover:bg-[#009EE3]/20 hover:text-[#009EE3] text-[#A1A1AA] text-xs font-bold rounded-xl transition-colors flex items-center gap-1"><ExternalLink className="w-3.5 h-3.5" /> Portal</button>
                        <button onClick={() => window.open(`/reservas/${biz.id}`, "_blank")} className="px-3 py-2 bg-[#27272A] hover:bg-[#009EE3]/20 hover:text-[#009EE3] text-[#A1A1AA] text-xs font-bold rounded-xl transition-colors flex items-center gap-1"><ExternalLink className="w-3.5 h-3.5" /> Reservas</button>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => router.push(`/admin/onboarding?businessId=${biz.id}`)} className="p-2 bg-[#27272A] hover:bg-amber-500/20 text-amber-400 rounded-xl transition-colors" title="Editar Catálogo"><Edit3 className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteBusiness(biz.id, biz.businessName)} className="p-2 bg-[#27272A] hover:bg-red-500/20 text-red-400 rounded-xl transition-colors" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- PESTAÑA 2: FÁBRICA COMPLETA --- */}
        {activeTab === "create" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <form onSubmit={handleCreateBusiness} className="space-y-6">
              
              {/* Bloque 1: Identidad Corporativa */}
              <div className="bg-[#18181B] border border-[#27272A] p-8 rounded-[32px] shadow-2xl space-y-6">
                <h2 className="text-xl font-bold text-white border-b border-[#27272A] pb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#009EE3]" /> 1. Identidad Corporativa y Accesos
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#A1A1AA] uppercase">Nombre Comercial</label>
                    <input type="text" required value={form.businessName} onChange={(e) => handleNameChange(e.target.value)} className="w-full bg-[#27272A]/50 border border-[#27272A] rounded-2xl p-3.5 text-sm text-white outline-none focus:border-[#009EE3]" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#A1A1AA] uppercase">ID (URL Autogenerada)</label>
                    <input type="text" required readOnly value={form.businessId} className="w-full bg-[#27272A]/20 border border-[#27272A] rounded-2xl p-3.5 text-sm text-[#009EE3] font-mono outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#A1A1AA] uppercase">WhatsApp (Genera PIN)</label>
                    <input type="tel" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full bg-[#27272A]/50 border border-[#27272A] rounded-2xl p-3.5 text-sm text-white outline-none focus:border-[#009EE3]" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#A1A1AA] uppercase">Giro Operativo</label>
                    <select value={form.businessType} onChange={(e) => setForm({ ...form, businessType: e.target.value })} className="w-full bg-[#27272A]/50 border border-[#27272A] rounded-2xl p-3.5 text-sm text-white outline-none focus:border-[#009EE3] cursor-pointer">
                      <option value="gastronomia" className="bg-[#18181B]">Alimentos / Menú Vertical</option>
                      <option value="servicios" className="bg-[#18181B]">Servicios / Barberías (Citas)</option>
                      <option value="retail" className="bg-[#18181B]">Retail / Tienda Cuadrícula</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Bloque 2: Diseño Visual */}
              <div className="bg-[#18181B] border border-[#27272A] p-8 rounded-[32px] shadow-2xl space-y-6">
                <h2 className="text-xl font-bold text-white border-b border-[#27272A] pb-4 flex items-center gap-2">
                  <Palette className="w-5 h-5 text-[#009EE3]" /> 2. Diseño Visual
                </h2>
                
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1 space-y-2">
                    <label className="text-xs font-semibold text-[#A1A1AA] uppercase">Logotipo</label>
                    <div className="w-full bg-[#27272A]/50 border border-[#27272A] border-dashed rounded-2xl p-4 flex items-center justify-center cursor-pointer hover:bg-[#27272A] transition-colors">
                      <div className="text-center">
                        <ImageIcon className="w-6 h-6 text-[#A1A1AA] mx-auto mb-2" />
                        <span className="text-sm text-white font-medium bg-[#009EE3]/20 text-[#009EE3] px-3 py-1 rounded-lg">Browse...</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-[#A1A1AA] uppercase">Color de Marca</label>
                    <div className="flex items-center gap-4">
                      <input type="color" value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} className="w-16 h-16 rounded-2xl cursor-pointer bg-transparent border-0 outline-none p-0" />
                      <span className="text-sm text-white font-mono">{form.primaryColor}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-4">
                  <label className="text-xs font-semibold text-[#A1A1AA] uppercase">Fondo de Pantalla Premium</label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {PREMIUM_BACKGROUNDS.map((bg) => (
                      <div 
                        key={bg.id} 
                        onClick={() => setForm({ ...form, backgroundUrl: bg.src })}
                        className={`relative rounded-xl overflow-hidden h-24 cursor-pointer border-2 transition-all ${form.backgroundUrl === bg.src ? "border-[#009EE3] scale-105 shadow-[0_0_15px_rgba(0,158,227,0.5)]" : "border-transparent opacity-60 hover:opacity-100"}`}
                      >
                        <img src={bg.src} alt={bg.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-sm p-1.5 text-center text-[10px] font-bold text-white">{bg.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bloque 3: Inteligencia Artificial */}
              <div className="bg-[#18181B] border border-[#27272A] p-8 rounded-[32px] shadow-2xl space-y-4">
                <h2 className="text-xl font-bold text-white border-b border-[#27272A] pb-4 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#009EE3]" /> 3. Inteligencia Artificial
                </h2>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#A1A1AA] uppercase">Instrucciones Base para el Bot</label>
                  <textarea rows={4} value={form.aiPrompt} onChange={(e) => setForm({ ...form, aiPrompt: e.target.value })} className="w-full bg-[#27272A]/50 border border-[#27272A] rounded-2xl p-4 text-sm text-white outline-none focus:border-[#009EE3] resize-none leading-relaxed" />
                </div>
              </div>

              <button type="submit" disabled={creating} className="w-full py-5 bg-gradient-to-r from-[#009EE3] to-[#06B6D4] text-white font-black text-lg rounded-2xl shadow-lg hover:opacity-95 transition-opacity disabled:opacity-50">
                {creating ? "Construyendo Ecosistema..." : "Desplegar Plataforma Completa"}
              </button>
            </form>
          </motion.div>
        )}

      </div>
    </div>
  );
}