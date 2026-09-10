"use client";

import { useState, useEffect, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar as CalendarIcon, Clock, User, CheckCircle2, XCircle, ArrowLeft, PhoneCall, Plus, X, Phone, Scissors, Utensils, ShoppingBag, Briefcase, CreditCard, QrCode, ExternalLink } from "lucide-react";
import { collection, query, where, getDocs, doc, updateDoc, addDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
  const router = useRouter();

  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados para el Modal de Cita Manual
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newService, setNewService] = useState(""); 
  const [businessType, setBusinessType] = useState("servicios"); 
  const [newTime, setNewTime] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // --- ESTADOS PARA COBROS CON MERCADO PAGO ---
  const [apptToCharge, setApptToCharge] = useState<Appointment | null>(null);
  const [chargeAmount, setChargeAmount] = useState("");
  const [isGeneratingPayment, setIsGeneratingPayment] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState("");

  useEffect(() => {
    fetchAppointments();
  }, [businessId, selectedDate]);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const bizSnap = await getDoc(doc(db, "businesses", businessId));
      if (bizSnap.exists()) {
        setBusinessType(bizSnap.data().businessType || "servicios");
      }

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

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName || !newTime || !newService) return;

    setIsAdding(true);
    try {
      const newAppt = {
        businessId,
        clientName: newClientName,
        phone: newPhone || "No proporcionado",
        serviceName: newService,
        date: selectedDate,
        time: newTime,
        status: "confirmed",
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, "appointments"), newAppt);
      const addedAppt = { id: docRef.id, ...newAppt } as Appointment;
      setAppointments(prev => [...prev, addedAppt].sort((a, b) => a.time.localeCompare(b.time)));
      
      setShowAddModal(false);
      setNewClientName(""); setNewPhone(""); setNewService(""); setNewTime("");
    } catch (error) {
      console.error("Error agregando cita:", error);
    } finally {
      setIsAdding(false);
    }
  };

  // LÓGICA DE COBRO
  const handleGenerateCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apptToCharge || !chargeAmount) return;

    setIsGeneratingPayment(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          referenceId: apptToCharge.id,
          items: [{
            name: `Servicio: ${apptToCharge.serviceName} - ${apptToCharge.clientName}`,
            price: parseFloat(chargeAmount),
            quantity: 1
          }]
        })
      });

      const data = await res.json();
      
      if (data.init_point) {
        setPaymentUrl(data.init_point);
      } else {
        alert(data.error || "Error al generar el link. ¿Configuraste el Token de Mercado Pago en el portal?");
      }
    } catch (error) {
      console.error("Error de cobro:", error);
      alert("Error de conexión al cobrar.");
    } finally {
      setIsGeneratingPayment(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] font-sans p-6 selection:bg-[#009EE3]/30 relative">
      <div className="max-w-md mx-auto space-y-6 pb-24">
        
        <header className="flex items-center justify-between pt-2">
          <Link href={`/portal/${businessId}`} className="w-10 h-10 rounded-full bg-[#18181B] border border-[#27272A] flex items-center justify-center text-[#A1A1AA] hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          {/* PROTOCOLO FANTASMA: Triple clic aquí lleva al Super Admin */}
          <h1 
            onClick={(e) => e.detail === 3 && router.push('/super-admin/dashboard')}
            className="text-lg font-bold tracking-tight text-white cursor-default select-none"
          >
            Agenda del Día
          </h1>
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
              <p className="text-xs text-[#A1A1AA]">Usa el botón "+" abajo para agregar citas manualmente.</p>
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
                    <div className="flex gap-2">
                      <button 
                        onClick={() => { setApptToCharge(app); setPaymentUrl(""); setChargeAmount(""); }} 
                        className="w-10 h-10 rounded-2xl bg-[#009EE3]/10 border border-[#009EE3]/20 hover:bg-[#009EE3]/20 text-[#009EE3] flex items-center justify-center transition-colors"
                        title="Cobrar Servicio"
                      >
                        <CreditCard className="w-4 h-4" />
                      </button>
                      {app.phone !== "No proporcionado" && (
                        <a href={`tel:${app.phone}`} className="w-10 h-10 rounded-2xl bg-[#27272A] hover:bg-[#A1A1AA]/20 text-[#A1A1AA] flex items-center justify-center transition-colors"><PhoneCall className="w-4 h-4" /></a>
                      )}
                    </div>
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

        {/* MODAL COBRO MERCADO PAGO */}
        <AnimatePresence>
          {apptToCharge && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6">
              <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className="bg-[#18181B] border border-[#27272A] p-6 rounded-t-[32px] sm:rounded-[32px] w-full max-w-md shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2"><CreditCard className="w-5 h-5 text-[#009EE3]" /> Cobrar Servicio</h3>
                  <button onClick={() => setApptToCharge(null)} className="p-2 bg-[#27272A] rounded-full text-[#A1A1AA] hover:text-white"><X className="w-5 h-5" /></button>
                </div>

                {!paymentUrl ? (
                  <form onSubmit={handleGenerateCharge} className="space-y-6">
                    <div className="bg-[#27272A]/30 p-4 rounded-2xl border border-[#27272A]">
                      <p className="text-sm text-[#A1A1AA]">Cliente: <span className="text-white font-semibold">{apptToCharge.clientName}</span></p>
                      <p className="text-sm text-[#A1A1AA]">Servicio: <span className="text-white font-semibold">{apptToCharge.serviceName}</span></p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#A1A1AA] uppercase">Monto a Cobrar ($ MXN)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        required 
                        autoFocus
                        value={chargeAmount} 
                        onChange={e => setChargeAmount(e.target.value)} 
                        placeholder="Ej. 450.00" 
                        className="w-full bg-[#27272A]/50 border border-[#27272A] rounded-2xl py-4 px-4 text-xl font-bold text-center text-white outline-none focus:border-[#009EE3]" 
                      />
                    </div>

                    <button type="submit" disabled={isGeneratingPayment} className="w-full py-4 bg-[#009EE3] text-white font-bold rounded-2xl shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
                      {isGeneratingPayment ? "Conectando con Mercado Pago..." : <><QrCode className="w-5 h-5"/> Generar Link / QR</>}
                    </button>
                  </form>
                ) : (
                  <div className="space-y-6 text-center">
                    <div className="bg-white p-4 rounded-2xl inline-block shadow-inner mx-auto">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(paymentUrl)}`} 
                        alt="QR de Pago" 
                        className="w-48 h-48 object-contain" 
                      />
                    </div>
                    <p className="text-xs text-[#A1A1AA]">El cliente puede escanear este código para pagar, o puedes compartirle el link directo.</p>
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={() => window.open(paymentUrl, "_blank")}
                        className="flex-1 py-3 bg-[#27272A] text-white font-bold rounded-xl text-sm hover:bg-[#3f3f46] transition-colors flex items-center justify-center gap-2"
                      >
                        <ExternalLink className="w-4 h-4" /> Abrir Link
                      </button>
                      <button 
                        onClick={() => {
                          const msg = `Hola ${apptToCharge.clientName}, aquí tienes el link de pago seguro por tu servicio de ${apptToCharge.serviceName}: ${paymentUrl}`;
                          window.open(`https://wa.me/${apptToCharge.phone !== 'No proporcionado' ? apptToCharge.phone : ''}?text=${encodeURIComponent(msg)}`, "_blank");
                        }}
                        className="flex-1 py-3 bg-green-500 text-white font-bold rounded-xl text-sm hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                      >
                        Enviar por WA
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

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
                    <input type="text" required value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder="Ej. Juan Pérez" className="w-full bg-[#27272A]/50 border border-[#27272A] rounded-2xl py-3 pl-12 pr-4 text-sm text-white outline-none focus:border-[#009EE3]" />
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#A1A1AA] uppercase">Teléfono (Opcional)</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-3.5 w-5 h-5 text-[#A1A1AA]" />
                    <input type="tel" value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="Ej. 3312345678" className="w-full bg-[#27272A]/50 border border-[#27272A] rounded-2xl py-3 pl-12 pr-4 text-sm text-white outline-none focus:border-[#009EE3]" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#A1A1AA] uppercase">Servicio / Motivo</label>
                    <div className="relative">
                      {businessType === 'gastronomia' ? <Utensils className="absolute left-3 top-3.5 w-4 h-4 text-[#A1A1AA]" /> : 
                       businessType === 'retail' ? <ShoppingBag className="absolute left-3 top-3.5 w-4 h-4 text-[#A1A1AA]" /> : 
                       businessType === 'servicios' ? <Scissors className="absolute left-3 top-3.5 w-4 h-4 text-[#A1A1AA]" /> : 
                       <Briefcase className="absolute left-3 top-3.5 w-4 h-4 text-[#A1A1AA]" />}
                      <input type="text" required value={newService} onChange={e => setNewService(e.target.value)} placeholder={businessType === 'gastronomia' ? "Ej. Mesa para 2" : "Ej. Corte Clásico"} className="w-full bg-[#27272A]/50 border border-[#27272A] rounded-2xl py-3 pl-9 pr-2 text-sm text-white outline-none focus:border-[#009EE3]" />
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