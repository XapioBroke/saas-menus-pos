"use client";

import { useState, useEffect, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar as CalendarIcon, Clock, User, CheckCircle2, XCircle, ArrowLeft, PhoneCall } from "lucide-react";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
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

  // Fecha actual por defecto en formato YYYY-MM-DD
  const todayStr = new Date().toISOString().split("T")[0];
  
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar citas desde Firestore basadas en el negocio y la fecha seleccionada
  useEffect(() => {
    const fetchAppointments = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, "appointments"),
          where("businessId", "==", businessId),
          where("date", "==", selectedDate)
        );
        const querySnapshot = await getDocs(q);
        const data: Appointment[] = [];
        querySnapshot.forEach((docSnap) => {
          data.push({ id: docSnap.id, ...docSnap.data() } as Appointment);
        });
        
        // Ordenar por hora de forma ascendente
        data.sort((a, b) => a.time.localeCompare(b.time));
        setAppointments(data);
      } catch (error) {
        console.error("Error obteniendo citas:", error);
      } finally {
        setLoading(false);
      }
    };

    if (businessId) {
      fetchAppointments();
    }
  }, [businessId, selectedDate]);

  // Cambiar estatus de la cita (Confirmar / Cancelar)
  const handleUpdateStatus = async (appointmentId: string, newStatus: "confirmed" | "cancelled") => {
    try {
      const docRef = doc(db, "appointments", appointmentId);
      await updateDoc(docRef, { status: newStatus });
      
      // Actualizar estado localmente para respuesta instantánea
      setAppointments(prev => 
        prev.map(app => app.id === appointmentId ? { ...app, status: newStatus } : app)
      );
    } catch (error) {
      console.error("Error actualizando estatus:", error);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] font-sans p-6 selection:bg-[#009EE3]/30">
      <div className="max-w-md mx-auto space-y-6">
        
        {/* Header con Botón de Regreso */}
        <header className="flex items-center justify-between pt-2">
          <Link 
            href={`/portal/${businessId}`}
            className="w-10 h-10 rounded-full bg-[#18181B] border border-[#27272A] flex items-center justify-center text-[#A1A1AA] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-bold tracking-tight text-white">Agenda del Día</h1>
          <div className="w-10" /> {/* Espaciador simétrico */}
        </header>

        {/* Selector de Fecha Rápido */}
        <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <div className="bg-[#009EE3]/10 p-2.5 rounded-xl border border-[#009EE3]/20">
              <CalendarIcon className="w-5 h-5 text-[#009EE3]" />
            </div>
            <div>
              <p className="text-xs text-[#A1A1AA] uppercase tracking-wider font-semibold">Fecha Seleccionada</p>
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-white font-bold text-sm outline-none cursor-pointer mt-0.5"
              />
            </div>
          </div>
          <span className="text-xs bg-[#27272A] text-[#FAFAFA] px-2.5 py-1 rounded-full font-medium">
            {appointments.length} citas
          </span>
        </div>

        {/* Lista de Reservas del Día */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-20 text-[#A1A1AA] animate-pulse text-sm">
              Sincronizando agenda...
            </div>
          ) : appointments.length === 0 ? (
            <div className="bg-[#18181B]/50 border border-[#27272A] rounded-3xl p-10 text-center space-y-3">
              <Clock className="w-10 h-10 text-[#A1A1AA] mx-auto opacity-40" />
              <p className="text-white font-semibold">Sin reservas para este día</p>
              <p className="text-xs text-[#A1A1AA]">Las citas que agenden tus clientes aparecerán aquí automáticamente.</p>
            </div>
          ) : (
            <AnimatePresence>
              {appointments.map((app) => (
                <motion.div 
                  key={app.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-[#18181B] border border-[#27272A] rounded-3xl p-5 shadow-xl relative overflow-hidden flex flex-col gap-4"
                >
                  {/* Barra lateral indicadora de estatus */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                    app.status === 'confirmed' ? 'bg-emerald-500' :
                    app.status === 'pending' ? 'bg-amber-500' : 'bg-red-500'
                  }`} />

                  <div className="flex items-start justify-between pl-2">
                    <div>
                      <span className="text-xs font-mono font-bold text-[#009EE3] bg-[#009EE3]/10 px-2.5 py-1 rounded-full border border-[#009EE3]/20">
                        {app.time} hrs
                      </span>
                      <h3 className="text-base font-bold text-white mt-2 tracking-tight flex items-center gap-2">
                        <User className="w-4 h-4 text-[#A1A1AA]" /> {app.clientName}
                      </h3>
                      <p className="text-xs text-[#A1A1AA] mt-0.5 font-medium">{app.serviceName}</p>
                    </div>

                    <a 
                      href={`tel:${app.phone}`}
                      className="w-10 h-10 rounded-2xl bg-[#27272A] hover:bg-[#009EE3]/20 hover:text-[#009EE3] text-[#A1A1AA] flex items-center justify-center transition-colors"
                      title="Llamar al cliente"
                    >
                      <PhoneCall className="w-4 h-4" />
                    </a>
                  </div>

                  {/* Acciones de Estatus */}
                  <div className="flex items-center justify-between pt-3 border-t border-[#27272A] pl-2">
                    <span className={`text-xs font-bold uppercase tracking-wider ${
                      app.status === 'confirmed' ? 'text-emerald-400' :
                      app.status === 'pending' ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      ● {app.status === 'confirmed' ? 'Confirmada' : app.status === 'pending' ? 'Pendiente' : 'Cancelada'}
                    </span>

                    <div className="flex items-center gap-2">
                      {app.status !== 'confirmed' && (
                        <button 
                          onClick={() => handleUpdateStatus(app.id, 'confirmed')}
                          className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl border border-emerald-500/20 transition-colors flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Confirmar
                        </button>
                      )}
                      {app.status !== 'cancelled' && (
                        <button 
                          onClick={() => handleUpdateStatus(app.id, 'cancelled')}
                          className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold rounded-xl border border-red-500/20 transition-colors flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Cancelar
                        </button>
                      )}
                    </div>
                  </div>

                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

      </div>
    </div>
  );
}