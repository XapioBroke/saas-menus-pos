"use client";

import { useState, useEffect, use } from "react";
import { motion } from "framer-motion";
import { User, Phone, CheckCircle2, Sparkles, Scissors } from "lucide-react";
import { doc, getDoc, collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function PublicBookingPage({ params }: { params: Promise<{ businessId: string }> }) {
  const resolvedParams = use(params);
  const businessId = resolvedParams.businessId;

  const [businessName, setBusinessName] = useState("");
  const [clientName, setClientName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceName, setServiceName] = useState("Corte Degradado + Barba");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Consultar el nombre real del negocio desde Firestore
  useEffect(() => {
    const fetchBusinessName = async () => {
      try {
        const docRef = doc(db, "businesses", businessId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().businessName) {
          setBusinessName(docSnap.data().businessName);
        } else {
          // Respaldo elegante si no existe en businesses, busca en concierge_portals
          const portalRef = doc(db, "concierge_portals", businessId);
          const portalSnap = await getDoc(portalRef);
          if (portalSnap.exists() && portalSnap.data().businessName) {
            setBusinessName(portalSnap.data().businessName);
          } else {
            // Último respaldo formateado del ID
            setBusinessName(businessId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
          }
        }
      } catch (error) {
        console.error("Error obteniendo nombre del negocio:", error);
      }
    };
    if (businessId) fetchBusinessName();
  }, [businessId]);

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !phone || !date || !time) {
      alert("Por favor completa todos los campos obligatorios.");
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, "appointments"), {
        businessId,
        clientName,
        phone,
        serviceName,
        date,
        time,
        status: "pending",
        createdAt: new Date().toISOString()
      });
      setSuccess(true);
    } catch (error) {
      console.error("Error al agendar cita:", error);
      alert("Hubo un error al procesar tu reserva.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#09090B] text-white flex items-center justify-center p-6 font-sans">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#18181B] border border-[#27272A] p-8 rounded-[32px] max-w-md w-full text-center space-y-4 shadow-2xl">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
          <h2 className="text-2xl font-bold tracking-tight">¡Cita Solicitada con Éxito!</h2>
          <p className="text-sm text-[#A1A1AA]">Tu solicitud para <strong className="text-white">{businessName}</strong> ha sido registrada.</p>
          <button onClick={() => { setSuccess(false); setClientName(""); setPhone(""); setDate(""); setTime(""); }} className="w-full mt-4 py-3 bg-white text-black font-bold rounded-2xl hover:bg-gray-200 transition-colors">
            Agendar otra cita
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] font-sans p-6 flex flex-col justify-center items-center selection:bg-[#009EE3]/30 relative overflow-hidden">
      <div className="absolute top-1/4 w-96 h-96 bg-[#009EE3] rounded-full mix-blend-screen filter blur-[140px] opacity-15 pointer-events-none"></div>

      <div className="w-full max-w-md space-y-6 relative z-10">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-[#009EE3]/10 px-3.5 py-1.5 rounded-full border border-[#009EE3]/20 text-[#06B6D4] text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Portal de Reservas Online
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">{businessName || "Cargando..."}</h1>
          <p className="text-xs text-[#A1A1AA]">Selecciona tu servicio y aparta tu espacio en segundos.</p>
        </div>

        <form onSubmit={handleBooking} className="bg-[#18181B]/80 backdrop-blur-xl border border-white/10 rounded-[32px] p-8 space-y-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">Tu Nombre Completo</label>
            <div className="relative">
              <User className="absolute left-4 top-3.5 w-5 h-5 text-[#A1A1AA]" />
              <input type="text" required value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Ej. Carlos Santana" className="w-full bg-[#27272A]/50 border border-[#27272A] rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white placeholder-[#71717A] outline-none focus:border-[#009EE3] font-medium" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">Teléfono / WhatsApp</label>
            <div className="relative">
              <Phone className="absolute left-4 top-3.5 w-5 h-5 text-[#A1A1AA]" />
              <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ej. 3312345678" className="w-full bg-[#27272A]/50 border border-[#27272A] rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white placeholder-[#71717A] outline-none focus:border-[#009EE3] font-medium" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">Servicio Deseado</label>
            <div className="relative">
              <Scissors className="absolute left-4 top-3.5 w-5 h-5 text-[#A1A1AA]" />
              <select value={serviceName} onChange={(e) => setServiceName(e.target.value)} className="w-full bg-[#27272A]/50 border border-[#27272A] rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white outline-none focus:border-[#009EE3] cursor-pointer font-medium">
                <option value="Corte Clásico / Estándar" className="bg-[#18181B]">Corte Clásico / Estándar</option>
                <option value="Corte Degradado + Barba" className="bg-[#18181B]">Corte Degradado + Barba</option>
                <option value="Perfilado de Barba" className="bg-[#18181B]">Perfilado de Barba</option>
                <option value="Tratamiento Capilar / Facial" className="bg-[#18181B]">Tratamiento Capilar / Facial</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">Fecha</label>
              <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-[#27272A]/50 border border-[#27272A] rounded-2xl py-3.5 px-4 text-sm text-white outline-none focus:border-[#009EE3] cursor-pointer font-medium" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">Hora</label>
              <input type="time" required value={time} onChange={(e) => setTime(e.target.value)} className="w-full bg-[#27272A]/50 border border-[#27272A] rounded-2xl py-3.5 px-4 text-sm text-white outline-none focus:border-[#009EE3] cursor-pointer font-medium" />
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full mt-4 py-4 bg-gradient-to-r from-[#009EE3] to-[#06B6D4] text-white font-bold rounded-2xl shadow-lg hover:opacity-95 transition-opacity disabled:opacity-50 text-base">
            {loading ? "Procesando reserva..." : "Confirmar Cita"}
          </button>
        </form>
      </div>
    </div>
  );
}