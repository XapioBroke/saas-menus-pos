"use client";

import { useState, useEffect, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar as CalendarIcon, Clock, User, CheckCircle2, XCircle, ArrowLeft, PhoneCall, Plus, X, Phone, Scissors } from "lucide-react";
import { collection, query, where, getDocs, doc, updateDoc, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";

interface Appointment {
  id: string;
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
  status: "pending" | "confirmed" | "cancelled";
  phone: string;
}

export default function ConciergeAppointments({ params }: { params: Promise<{ businessId: string }> }) {
  const resolvedParams = use(params);
  const businessId = resolvedParams.businessId;

  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados para el Modal de Cita Manual
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newService, setNewService] = useState("Corte Clásico");
  const [newTime, setNewTime] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, [businessId, selectedDate]);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "appointments"), where("businessId", "==", businessId), where("date", "==", selectedDate));
      const querySnapshot = await getDocs(q);
      const data: Appointment[] = [];
      querySnapshot.forEach((docSnap) => data.push({ id: docSnap.id, ...docSnap.data() } as Appointment));
      data.sort((a, b) => a.time.localeCompare(b.time));
      setAppointments(data);
    } catch (error) {
      console.error("Error obteniendo citas:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (appointmentId: string, newStatus: "confirmed" | "cancelled") => {
    try {
      await updateDoc(doc(db, "appointments", appointmentId), { status: newStatus });
      setAppointments(prev => prev.map(app => app.id === appointmentId ? { ...app, status: newStatus } : app));
    } catch (error) {
      console.error("Error actualizando estatus:", error);
    }
  };

  // Lógica para agregar cita manualmente (Dueño)
  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName || !newTime) return;

    setIsAdding(true);
    try {
      const newAppt = {
        businessId,
        clientName: newClientName,
        phone: newPhone || "No proporcionado",
        serviceName: newService,
        date: selectedDate, // Se agenda en la fecha que está viendo
        time: newTime,
        status: "confirmed", // Como la agrega el dueño, ya entra confirmada
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, "appointments"), newAppt);
      
      // Actualizar UI instantáneamente
      const addedAppt = { id: docRef.id, ...newAppt } as Appointment;
      setAppointments(prev => [...prev, addedAppt].sort((a, b) => a.time.localeCompare(b.time)));
      
      // Limpiar y cerrar
      setShowAddModal(false);
      setNewClientName(""); setNewPhone(""); setNewTime("");
    } catch (error) {
      console.error("Error agregando cita:", error);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] font-sans p-6 selection:bg-[#009EE3]/30 relative">
      <div className="max-w-md mx-auto space-y-6 pb-24">
        
        <header className="flex items-center justify-between pt-2">
          <Link href={`/portal/${businessId}`} className="w-10 h-10 rounded-full bg-[#18181B] border border-[#27272A] flex items-center justify-center text-[#A1A1AA] hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-bold tracking-tight text-white">Agenda del Día</h1>
          <div className="w-10" /> 
        </header>

        <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <div className="bg-[#009EE3]/10 p-2.5 rounded-xl border border-[#009EE3]/20"><CalendarIcon className="w-5 h-5 text-[#009EE3]" /></div>
            <div>
              <p className="text-xs text-[#A1A1AA] uppercase tracking-wider font-semibold">Fecha Seleccionada</p>
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent text-white font-bold text-sm outline-none cursor-pointer mt-0.5" />
            </div>
          </div>
          <span className="text-xs bg-[#27272A] text-[#FAFAFA] px-2.5 py-1 rounded-full font-medium">{appointments.length} citas</span>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-20 text-[#A1A1AA] animate-pulse text-sm">Sincronizando agenda...</div>
          ) : appointments.length === 0 ? (
            <div className="bg-[#18181B]/50 border border-[#27272A] rounded-3xl p-10 text-center space-y-3">
              <Clock className="w-10 h-10 text-[#A1A1AA] mx-auto opacity-40" />
              <p className="text-white font-semibold">Sin reservas para este día</p>
              <p className="text-xs text-[#A1A1AA]">Usa el botón "+" abajo para agregar citas manualmente si un cliente te llama.</p>
            </div>
          ) : (
            <AnimatePresence>
              {appointments.map((app) => (
                <motion.div key={app.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[#18181B] border border-[#27272A] rounded-3xl p-5 shadow-xl relative overflow-hidden flex flex-col gap-4">
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${app.status === 'confirmed' ? 'bg-emerald-500' : app.status === 'pending' ? 'bg-amber-500' : 'bg-red-500'}`} />
                  <div className="flex items-start justify-between pl-2">
                    <div>
                      <span className="text-xs font-mono font-bold text-[#009EE3] bg-[#009EE3]/10 px-2.5 py-1 rounded-full border border-[#009EE3]/20">{app.time} hrs</span>
                      <h3 className="text-base font-bold text-white mt-2 tracking-tight flex items-center gap-2"><User className="w-4 h-4 text-[#A1A1AA]" /> {app.clientName}</h3>
                      <p className="text-xs text-[#A1A1AA] mt-0.5 font-medium">{app.serviceName}</p>
                    </div>
                    {app.phone !== "No proporcionado" && (
                      <a href={`tel:${app.phone}`} className="w-10 h-10 rounded-2xl bg-[#27272A] hover:bg-[#009EE3]/20 hover:text-[#009EE3] text-[#A1A1AA] flex items-center justify-center transition-colors"><PhoneCall className="w-4 h-4" /></a>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-[#27272A] pl-2">
                    <span className={`text-xs font-bold uppercase tracking-wider ${app.status === 'confirmed' ? 'text-emerald-400' : app.status === 'pending' ? 'text-amber-400' : 'text-red-400'}`}>
                      ● {app.status === 'confirmed' ? 'Confirmada' : app.status === 'pending' ? 'Pendiente' : 'Cancelada'}
                    </span>
                    <div className="flex items-center gap-2">
                      {app.status !== 'confirmed' && <button onClick={() => handleUpdateStatus(app.id, 'confirmed')} className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl border border-emerald-500/20 transition-colors flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Confirmar</button>}
                      {app.status !== 'cancelled' && <button onClick={() => handleUpdateStatus(app.id, 'cancelled')} className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold rounded-xl border border-red-500/20 transition-colors flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Cancelar</button>}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* BOTÓN FLOTANTE PARA AGREGAR CITA */}
        <button onClick={() => setShowAddModal(true)} className="fixed bottom-6 right-6 md:right-1/3 lg:right-1/3 w-14 h-14 bg-[#009EE3] hover:bg-[#06B6D4] text-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(0,158,227,0.4)] transition-transform hover:scale-105 z-40">
          <Plus className="w-6 h-6" />
        </button>

        {/* MODAL DE CITA MANUAL */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6">
            <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-[#18181B] border border-[#27272A] p-6 rounded-t-[32px] sm:rounded-[32px] w-full max-w-md shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Agregar Cita Manual</h3>
                <button onClick={() => setShowAddModal(false)} className="p-2 bg-[#27272A] rounded-full text-[#A1A1AA] hover:text-white"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleManualAdd} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#A1A1AA] uppercase">Nombre del Cliente</label>
                  <div className="relative">
                    <User className="absolute left-4 top-3.5 w-5 h-5 text-[#A1A1AA]" />
                    <input type="text" required value={newClientName} onChange={e => setNewClientName(e.target.value)} className="w-full bg-[#27272A]/50 border border-[#27272A] rounded-2xl py-3 pl-12 pr-4 text-sm text-white outline-none focus:border-[#009EE3]" />
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#A1A1AA] uppercase">Teléfono (Opcional)</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-3.5 w-5 h-5 text-[#A1A1AA]" />
                    <input type="tel" value={newPhone} onChange={e => setNewPhone(e.target.value)} className="w-full bg-[#27272A]/50 border border-[#27272A] rounded-2xl py-3 pl-12 pr-4 text-sm text-white outline-none focus:border-[#009EE3]" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#A1A1AA] uppercase">Servicio</label>
                    <div className="relative">
                      <Scissors className="absolute left-3 top-3.5 w-4 h-4 text-[#A1A1AA]" />
                      <input type="text" value={newService} onChange={e => setNewService(e.target.value)} className="w-full bg-[#27272A]/50 border border-[#27272A] rounded-2xl py-3 pl-9 pr-2 text-sm text-white outline-none focus:border-[#009EE3]" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#A1A1AA] uppercase">Hora Asignada</label>
                    <input type="time" required value={newTime} onChange={e => setNewTime(e.target.value)} className="w-full bg-[#27272A]/50 border border-[#27272A] rounded-2xl py-3 px-4 text-sm text-white outline-none focus:border-[#009EE3] cursor-pointer" />
                  </div>
                </div>

                <button type="submit" disabled={isAdding} className="w-full mt-4 py-4 bg-[#009EE3] text-white font-bold rounded-2xl shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50">
                  {isAdding ? "Guardando..." : "Guardar en Agenda"}
                </button>
              </form>
            </motion.div>
          </div>
        )}

      </div>
    </div>
  );
}