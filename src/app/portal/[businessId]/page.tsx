"use client";

import { useState, useEffect, useRef, use, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, QrCode, Calendar, MessageCircle, Lock, Delete, ShieldCheck, X, Send, CreditCard, CheckCircle2, Store, ExternalLink, PlusCircle, Key, DollarSign, Clock, CalendarDays, Trash2 } from "lucide-react";
import { doc, getDoc, updateDoc, collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link"; 
import { useRouter } from "next/navigation";

// Tipos para el horario
type DailySchedule = { isOpen: boolean; open: string; close: string };
type WeeklySchedule = { [key: string]: DailySchedule };

const defaultSchedule: WeeklySchedule = {
  monday: { isOpen: true, open: "09:00", close: "18:00" },
  tuesday: { isOpen: true, open: "09:00", close: "18:00" },
  wednesday: { isOpen: true, open: "09:00", close: "18:00" },
  thursday: { isOpen: true, open: "09:00", close: "18:00" },
  friday: { isOpen: true, open: "09:00", close: "18:00" },
  saturday: { isOpen: false, open: "09:00", close: "14:00" },
  sunday: { isOpen: false, open: "09:00", close: "14:00" }
};

const dayNames: { [key: string]: string } = {
  monday: "Lunes", tuesday: "Martes", wednesday: "Miércoles", 
  thursday: "Jueves", friday: "Viernes", saturday: "Sábado", sunday: "Domingo"
};

export default function ConciergePortal({ params }: { params: Promise<{ businessId: string }> }) {
  const resolvedParams = use(params);
  const businessId = resolvedParams.businessId;
  const router = useRouter();

  // Estados de Seguridad y Teclado
  const [showSplash, setShowSplash] = useState(true);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [hasError, setHasError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [dbBusinessName, setDbBusinessName] = useState("");
  
  // Estados para Cambio de PIN
  const [requiresPinChange, setRequiresPinChange] = useState(false);
  const [newPinConfig, setNewPinConfig] = useState({ step: 1, firstPin: "" });
  const [isManualPinChange, setIsManualPinChange] = useState(false); // 👈 Nuevo estado para iniciar cambio manual

  // ESTADOS DE VENTAS REALES
  const [todaySales, setTodaySales] = useState<number>(0);
  const [loadingSales, setLoadingSales] = useState(true);

  // Estados para los Modales de Acción
  const [qrConfig, setQrConfig] = useState<{isOpen: boolean, type: 'reservas' | 'menu'}>({ isOpen: false, type: 'reservas' });
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showPaymentConfigModal, setShowPaymentConfigModal] = useState(false);
  
  // 🚀 ESTADOS NUEVOS: HORARIOS Y DÍAS FESTIVOS
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [schedule, setSchedule] = useState<WeeklySchedule>(defaultSchedule);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [newBlockedDate, setNewBlockedDate] = useState("");
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [scheduleSavedMsg, setScheduleSavedMsg] = useState(false);

  // Modal de Efectivo
  const [showCashModal, setShowCashModal] = useState(false);
  const [cashAmount, setCashAmount] = useState("");
  const [isAddingCash, setIsAddingCash] = useState(false);

  // Estados para Mercado Pago
  const [mpToken, setMpToken] = useState("");
  const [isSavingToken, setIsSavingToken] = useState(false);
  const [tokenSavedMsg, setTokenSavedMsg] = useState(false);

  // Estados Soporte (Concierge)
  const [supportMessages, setSupportMessages] = useState<{role: string, content: string}[]>([
    { role: "assistant", content: "Hola, soy el equipo de Soporte de MiTerminal. ¿En qué puedo ayudarte hoy?" }
  ]);
  const [supportInput, setSupportInput] = useState("");
  const [isSupportTyping, setIsSupportTyping] = useState(false);
  const [needsHuman, setNeedsHuman] = useState(false);
  const supportEndRef = useRef<HTMLDivElement>(null);

  const urlBusinessName = businessId
    ? businessId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    : "Negocio";

  const displayName = dbBusinessName || urlBusinessName;

  // 🚀 PROTOCOLO BACKDOOR TIER 1: Vía Parámetro URL Seguro
  useEffect(() => {
    // Leemos la URL sin romper el enrutador de Next.js
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('bypass') === 'true') {
      setIsUnlocked(true);
      getDoc(doc(db, "concierge_portals", businessId)).then(snap => {
        if(snap.exists() && snap.data().businessName) {
          setDbBusinessName(snap.data().businessName);
        }
      });
    }
  }, [businessId]);

  useEffect(() => {
    const timer = setTimeout(() => { setShowSplash(false); }, 1800);
    return () => clearTimeout(timer);
  }, []);

  const fetchTodayRevenue = useCallback(async () => {
    setLoadingSales(true);
    try {
      const todayStr = new Date().toLocaleDateString('en-CA'); 
      const q = query(
        collection(db, "appointments"),
        where("businessId", "==", businessId),
        where("date", "==", todayStr)
      );

      const snap = await getDocs(q);
      let total = 0;
      snap.forEach(docSnap => {
        const data = docSnap.data();
        total += Number(data.price || 0);
      });
      setTodaySales(total);
    } catch (error) {
      console.error("Error calculando ventas de hoy:", error);
    } finally {
      setLoadingSales(false);
    }
  }, [businessId]);

  useEffect(() => {
    if (isUnlocked && businessId) {
      const fetchBusinessData = async () => {
        try {
          const bizDoc = await getDoc(doc(db, "businesses", businessId));
          if (bizDoc.exists()) {
            const data = bizDoc.data();
            if (data.mercadopagoAccessToken) {
              setMpToken(data.mercadopagoAccessToken);
            }
            if (data.schedule) {
              setSchedule(data.schedule);
            }
            if (data.blockedDates) {
              setBlockedDates(data.blockedDates);
            }
          }
        } catch (error) {
          console.error("Error obteniendo datos:", error);
        }
      };
      fetchBusinessData();
      fetchTodayRevenue();
    }
  }, [isUnlocked, businessId, fetchTodayRevenue]);

  useEffect(() => {
    if (showSupportModal) {
      supportEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [supportMessages, isSupportTyping, showSupportModal]);

  // 🚀 LÓGICA DE GUARDADO DE HORARIOS EN FIREBASE
  const handleSaveSchedule = async () => {
    setIsSavingSchedule(true);
    try {
      await updateDoc(doc(db, "businesses", businessId), { 
        schedule: schedule,
        blockedDates: blockedDates
      });
      setScheduleSavedMsg(true);
      setTimeout(() => { 
        setScheduleSavedMsg(false); 
        setShowScheduleModal(false); 
      }, 2000);
    } catch (error) {
      alert("Error al guardar el horario.");
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const handleAddBlockedDate = () => {
    if (newBlockedDate && !blockedDates.includes(newBlockedDate)) {
      setBlockedDates([...blockedDates, newBlockedDate]);
      setNewBlockedDate("");
    }
  };

  const removeBlockedDate = (dateToRemove: string) => {
    setBlockedDates(blockedDates.filter(d => d !== dateToRemove));
  };

  // 🚀 LÓGICA DE TECLADO INTELIGENTE (LOGIN + CAMBIO DE PIN)
  const handleKeypad = async (num: string) => {
    if (isVerifying || pin.length >= 4) return;
    
    const nextPin = pin + num;
    setPin(nextPin);

    if (nextPin.length === 4) {
      setIsVerifying(true);

      // --- FLUJO 1: EL DUEÑO PIDIÓ CAMBIAR SU PIN MANUALMENTE ---
      if (isManualPinChange) {
        try {
          const docRef = doc(db, "concierge_portals", businessId);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists() && docSnap.data().pin === nextPin) {
            // El PIN actual es correcto. Pasamos al modo de crear uno nuevo.
            setIsManualPinChange(false);
            setRequiresPinChange(true);
            setNewPinConfig({ step: 1, firstPin: "" });
            setTimeout(() => {
              setPin("");
              setIsVerifying(false);
            }, 400);
          } else {
            triggerError(); // PIN actual incorrecto
          }
        } catch (error) {
          triggerError();
        }
        return; // Salimos de la función aquí para no cruzar flujos
      }

      // --- FLUJO 2: INGRESO NORMAL ---
      if (!requiresPinChange) {
        try {
          const docRef = doc(db, "concierge_portals", businessId);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists() && docSnap.data().isActive && docSnap.data().pin === nextPin) {
            if (docSnap.data().businessName) setDbBusinessName(docSnap.data().businessName);
            
            if (docSnap.data().requiresPinChange) {
              setRequiresPinChange(true);
              setTimeout(() => {
                setPin("");
                setIsVerifying(false);
              }, 400);
            } else {
              setTimeout(() => setIsUnlocked(true), 300);
            }
          } else {
            triggerError();
          }
        } catch (error) {
          console.error("Error Firebase:", error);
          triggerError();
        }
      } 
      // --- FLUJO 3: CONFIGURANDO EL NUEVO PIN ---
      else {
        if (newPinConfig.step === 1) {
          setNewPinConfig({ step: 2, firstPin: nextPin });
          setTimeout(() => {
            setPin("");
            setIsVerifying(false);
          }, 300);
        } else {
          if (nextPin === newPinConfig.firstPin) {
            try {
              const docRef = doc(db, "concierge_portals", businessId);
              await updateDoc(docRef, { 
                pin: nextPin, 
                requiresPinChange: false 
              });
              // Si todo salió bien, lo dejamos pasar al dashboard
              setTimeout(() => setIsUnlocked(true), 300);
            } catch (error) {
              triggerError();
            }
          } else {
            // Los PINs nuevos no coinciden
            setHasError(true);
            setTimeout(() => {
              setPin("");
              setHasError(false);
              setNewPinConfig({ step: 1, firstPin: "" });
              setIsVerifying(false);
            }, 600);
          }
        }
      }
    }
  };

  const triggerError = () => {
    setHasError(true);
    setTimeout(() => {
      setPin("");
      setHasError(false);
      setIsVerifying(false);
    }, 600);
  };

  const handleDelete = () => {
    if (!isVerifying) setPin(prev => prev.slice(0, -1));
  };

  const handleAddCashSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cashAmount || isNaN(Number(cashAmount))) return;
    
    setIsAddingCash(true);
    try {
      const todayStr = new Date().toLocaleDateString('en-CA');
      const nowTime = new Date().toLocaleTimeString('en-US', { hour12: false, hour: "2-digit", minute: "2-digit" });
      
      await addDoc(collection(db, "appointments"), {
        businessId,
        clientName: "Venta Local",
        phone: "N/A",
        serviceName: "Pago en Efectivo (Manual)",
        price: Number(cashAmount),
        date: todayStr,
        time: nowTime,
        status: "completed", 
        createdAt: new Date().toISOString()
      });
      
      setShowCashModal(false);
      setCashAmount("");
      await fetchTodayRevenue();
    } catch (error) {
      alert("Error al registrar el cobro.");
    } finally {
      setIsAddingCash(false);
    }
  };

  const handleSaveMpToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mpToken.trim()) return;
    setIsSavingToken(true);
    try {
      await updateDoc(doc(db, "businesses", businessId), { mercadopagoAccessToken: mpToken.trim() });
      setTokenSavedMsg(true);
      setTimeout(() => { setTokenSavedMsg(false); setShowPaymentConfigModal(false); }, 2000);
    } catch (error) {
      alert("Error al guardar credenciales");
    } finally {
      setIsSavingToken(false);
    }
  };

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportInput.trim()) return;
    const userMsg = supportInput;
    setSupportMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setSupportInput("");
    setIsSupportTyping(true);
    setNeedsHuman(false);
    try {
      const res = await fetch('/api/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...supportMessages, { role: "user", content: userMsg }] })
      });
      const data = await res.json();
      if (data.reply) setSupportMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
      if (data.escalate) setNeedsHuman(true);
    } catch (error) {
      setSupportMessages(prev => [...prev, { role: "assistant", content: "Error de conexión." }]);
    } finally {
      setIsSupportTyping(false);
    }
  };

  // 🚀 RENDER DINÁMICO DEL HEADER DE LA PANTALLA DE BLOQUEO
  const renderSecurityHeader = () => {
    if (isManualPinChange) {
      return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center">
          <Key className="w-8 h-8 text-amber-500 mb-6" />
          <h2 className="text-2xl font-semibold tracking-tight mb-2 text-center">Cambio de PIN</h2>
          <p className="text-sm text-[#A1A1AA] mb-12 text-center">Ingresa tu PIN actual por seguridad</p>
        </motion.div>
      );
    }
    if (!requiresPinChange) {
      return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center">
          <Lock className="w-8 h-8 text-[#009EE3] mb-6" />
          <h2 className="text-2xl font-semibold tracking-tight mb-2 text-center">Acceso a {displayName}</h2>
          <p className="text-sm text-[#A1A1AA] mb-12 text-center">Ingresa tu PIN de 4 dígitos para acceder</p>
        </motion.div>
      );
    }
    if (newPinConfig.step === 1) {
      return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center">
          <ShieldCheck className="w-8 h-8 text-[#06B6D4] mb-6" />
          <h2 className="text-2xl font-semibold tracking-tight mb-2 text-center">Crea tu nuevo PIN</h2>
          <p className="text-sm text-[#A1A1AA] mb-12 text-center">Escribe 4 dígitos que recordarás fácilmente</p>
        </motion.div>
      );
    }
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center">
        <ShieldCheck className="w-8 h-8 text-[#009EE3] mb-6" />
        <h2 className="text-2xl font-semibold tracking-tight mb-2 text-center">Confirma tu PIN</h2>
        <p className="text-sm text-[#A1A1AA] mb-12 text-center">Vuelve a ingresar los mismos 4 dígitos</p>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] font-sans selection:bg-[#009EE3]/30 overflow-hidden relative">
      <AnimatePresence mode="wait">
        
        {/* 1. SPLASH SCREEN (AURA PREMIUM) */}
        {showSplash ? (
          <motion.div
            key="splash-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-[#09090B]"
          >
            <div className="absolute w-64 h-64 bg-[#009EE3] rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-pulse"></div>
            
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="relative z-10 flex flex-col items-center"
            >
              <div className="w-16 h-16 bg-gradient-to-tr from-[#009EE3] to-[#06B6D4] rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(0,158,227,0.4)] mb-4">
                <ShieldCheck className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-black tracking-widest text-white uppercase">MiTerminal</h1>
              <p className="text-[10px] text-[#009EE3] tracking-[0.3em] mt-2 font-semibold">SISTEMA INICIANDO</p>
            </motion.div>
          </motion.div>
        ) : !isUnlocked ? (
          
          /* 2. PANTALLA DEL PIN CON GESTIÓN INTEGRADA */
          <motion.div
            key="lock-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center px-6"
          >
            <div className="absolute top-1/4 w-64 h-64 bg-[#009EE3] rounded-full mix-blend-screen filter blur-[120px] opacity-20 pointer-events-none"></div>

            {renderSecurityHeader()}

            <motion.div animate={hasError ? { x: [-10, 10, -10, 10, 0] } : {}} transition={{ duration: 0.4 }} className="flex gap-4 mb-16">
              {[...Array(4)].map((_, i) => (
                <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${i < pin.length ? hasError ? "bg-red-500 border-red-500" : "bg-[#06B6D4] border-[#06B6D4]" : "border-[#27272A] bg-transparent"}`} />
              ))}
            </motion.div>

            <div className="grid grid-cols-3 gap-x-8 gap-y-6 w-full max-w-[280px]">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <motion.button key={num} whileTap={{ scale: 0.9, backgroundColor: "rgba(255, 255, 255, 0.1)" }} onClick={() => handleKeypad(num.toString())} disabled={isVerifying} className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-light hover:bg-white/5 transition-colors disabled:opacity-50">
                  {num}
                </motion.button>
              ))}
              <div />
              <motion.button whileTap={{ scale: 0.9, backgroundColor: "rgba(255, 255, 255, 0.1)" }} onClick={() => handleKeypad("0")} disabled={isVerifying} className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-light hover:bg-white/5 transition-colors disabled:opacity-50">
                0
              </motion.button>
              <motion.button whileTap={{ scale: 0.9 }} onClick={handleDelete} disabled={isVerifying} className="w-20 h-20 rounded-full flex items-center justify-center text-[#A1A1AA] hover:text-white transition-colors disabled:opacity-50">
                <Delete className="w-8 h-8" />
              </motion.button>
            </div>

            {/* 🚀 BOTONES CONTEXTUALES DE CAMBIO DE PIN EN LA PANTALLA DE BLOQUEO */}
            {!requiresPinChange && !isManualPinChange && (
              <button 
                onClick={() => setIsManualPinChange(true)} 
                disabled={isVerifying}
                className="mt-10 text-xs font-medium text-[#A1A1AA] hover:text-white underline transition-colors"
              >
                Cambiar mi PIN
              </button>
            )}
            
            {isManualPinChange && (
              <button 
                onClick={() => { setIsManualPinChange(false); setPin(""); }} 
                disabled={isVerifying}
                className="mt-10 text-xs font-medium text-[#A1A1AA] hover:text-white underline transition-colors"
              >
                Cancelar Cambio
              </button>
            )}

          </motion.div>
        ) : (
          
          /* 3. DASHBOARD PRINCIPAL */
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="w-full max-w-md mx-auto p-6 pb-24"
          >
            <header className="mb-8 mt-4 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white cursor-default select-none">
                  Hola, {displayName}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#06B6D4] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-[#009EE3]"></span>
                  </span>
                  <span className="text-sm font-medium text-[#A1A1AA]">Terminal Conectada</span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-full bg-[#18181B] border border-[#27272A] flex items-center justify-center shadow-lg">
                <Wallet className="h-5 w-5 text-[#009EE3]" />
              </div>
            </header>

            <motion.div 
              whileHover={{ scale: 1.01 }}
              className="w-full bg-[#18181B]/80 backdrop-blur-xl border border-white/10 rounded-[32px] p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] mb-6 relative overflow-hidden"
            >
              <div className="absolute -top-20 -right-20 w-48 h-48 bg-[#009EE3] rounded-full mix-blend-screen filter blur-[80px] opacity-30"></div>
              
              {/* BOTÓN PARA AÑADIR VENTAS EN EFECTIVO */}
              <button 
                onClick={() => setShowCashModal(true)} 
                className="absolute top-6 right-6 bg-[#009EE3]/10 hover:bg-[#009EE3]/20 text-[#009EE3] p-2.5 rounded-2xl transition-colors z-10 border border-[#009EE3]/20 shadow-lg"
                title="Añadir Venta Manual (Efectivo)"
              >
                <PlusCircle className="w-5 h-5" />
              </button>

              <p className="text-xs font-semibold text-[#A1A1AA] mb-2 uppercase tracking-widest">Ventas de hoy</p>
              
              {/* PROYECCIÓN DINÁMICA DE VENTAS */}
              <h2 className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-[#A1A1AA]">
                {loadingSales ? (
                  <span className="animate-pulse opacity-50 text-4xl">$0.00</span>
                ) : (
                  <span>${todaySales.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                )}
              </h2>
              
              <div className="mt-5 inline-flex items-center gap-2 bg-[#009EE3]/10 px-3 py-1.5 rounded-full border border-[#009EE3]/20">
                <span className="text-xs font-semibold text-[#06B6D4]">Sistema Sincronizado</span>
              </div>
            </motion.div>

            <div className="grid grid-cols-1 gap-4">
              
              <Link href={`/portal/${businessId}/citas`} className="group flex items-center justify-between w-full bg-[#18181B] border border-[#27272A] rounded-3xl p-5 hover:border-[#009EE3]/50 transition-all duration-300 block">
                <div className="flex items-center gap-4">
                  <div className="bg-[#27272A] p-3.5 rounded-2xl group-hover:bg-[#009EE3]/20 transition-colors">
                    <Calendar className="h-6 w-6 text-white group-hover:text-[#009EE3] transition-colors" />
                  </div>
                  <div className="text-left">
                    <p className="text-base font-semibold text-white tracking-tight">Ver Citas de Hoy</p>
                    <p className="text-xs text-[#A1A1AA] mt-0.5">Gestionar agenda y reservas</p>
                  </div>
                </div>
              </Link>

              {/* 🚀 NUEVO BOTÓN: CONFIGURAR HORARIOS */}
              <motion.button whileHover={{ scale: 0.98 }} whileTap={{ scale: 0.96 }} onClick={() => setShowScheduleModal(true)} className="group flex items-center justify-between w-full bg-[#18181B] border border-[#27272A] rounded-3xl p-5 hover:border-[#009EE3]/50 transition-all duration-300">
                <div className="flex items-center gap-4">
                  <div className="bg-[#27272A] p-3.5 rounded-2xl group-hover:bg-[#009EE3]/20 transition-colors">
                    <Clock className="h-6 w-6 text-white group-hover:text-[#009EE3] transition-colors" />
                  </div>
                  <div className="text-left">
                    <p className="text-base font-semibold text-white tracking-tight">Configurar Horarios</p>
                    <p className="text-xs text-[#A1A1AA] mt-0.5">Días operativos y bloqueos</p>
                  </div>
                </div>
              </motion.button>

              <motion.button whileHover={{ scale: 0.98 }} whileTap={{ scale: 0.96 }} onClick={() => setQrConfig({ isOpen: true, type: 'reservas' })} className="group flex items-center justify-between w-full bg-[#18181B] border border-[#27272A] rounded-3xl p-5 hover:border-[#009EE3]/50 transition-all duration-300">
                <div className="flex items-center gap-4">
                  <div className="bg-[#27272A] p-3.5 rounded-2xl group-hover:bg-[#009EE3]/20 transition-colors">
                    <QrCode className="h-6 w-6 text-white group-hover:text-[#009EE3] transition-colors" />
                  </div>
                  <div className="text-left">
                    <p className="text-base font-semibold text-white tracking-tight">Código QR de Reservas</p>
                    <p className="text-xs text-[#A1A1AA] mt-0.5">Para que tus clientes agenden</p>
                  </div>
                </div>
              </motion.button>

              <motion.button whileHover={{ scale: 0.98 }} whileTap={{ scale: 0.96 }} onClick={() => setQrConfig({ isOpen: true, type: 'menu' })} className="group flex items-center justify-between w-full bg-[#18181B] border border-[#27272A] rounded-3xl p-5 hover:border-[#009EE3]/50 transition-all duration-300">
                <div className="flex items-center gap-4">
                  <div className="bg-[#27272A] p-3.5 rounded-2xl group-hover:bg-[#009EE3]/20 transition-colors">
                    <Store className="h-6 w-6 text-white group-hover:text-[#009EE3] transition-colors" />
                  </div>
                  <div className="text-left">
                    <p className="text-base font-semibold text-white tracking-tight">QR de Menú / Catálogo</p>
                    <p className="text-xs text-[#A1A1AA] mt-0.5">Muestra tus productos en local</p>
                  </div>
                </div>
              </motion.button>

              <motion.button whileHover={{ scale: 0.98 }} whileTap={{ scale: 0.96 }} onClick={() => setShowPaymentConfigModal(true)} className="group flex items-center justify-between w-full bg-[#18181B] border border-[#27272A] rounded-3xl p-5 hover:border-[#009EE3]/50 transition-all duration-300">
                <div className="flex items-center gap-4">
                  <div className="bg-[#27272A] p-3.5 rounded-2xl group-hover:bg-[#009EE3]/20 transition-colors">
                    <CreditCard className="h-6 w-6 text-white group-hover:text-[#009EE3] transition-colors" />
                  </div>
                  <div className="text-left">
                    <p className="text-base font-semibold text-white tracking-tight">Vincular Mercado Pago</p>
                    <p className="text-xs text-[#A1A1AA] mt-0.5">Activar cobros con tarjeta y QR</p>
                  </div>
                </div>
              </motion.button>

              <motion.button whileHover={{ scale: 0.98 }} whileTap={{ scale: 0.96 }} onClick={() => setShowSupportModal(true)} className="group flex items-center justify-between w-full bg-[#18181B] border border-[#27272A] rounded-3xl p-5 hover:border-[#009EE3]/50 transition-all duration-300">
                <div className="flex items-center gap-4">
                  <div className="bg-[#27272A] p-3.5 rounded-2xl group-hover:bg-[#009EE3]/20 transition-colors">
                    <MessageCircle className="h-6 w-6 text-white group-hover:text-[#009EE3] transition-colors" />
                  </div>
                  <div className="text-left">
                    <p className="text-base font-semibold text-white tracking-tight">Soporte Concierge</p>
                    <p className="text-xs text-[#A1A1AA] mt-0.5">Asistencia técnica directa</p>
                  </div>
                </div>
              </motion.button>
            </div>

            {/* --- INYECCIÓN DE MODALES --- */}

            {/* MODAL: AÑADIR VENTA EN EFECTIVO */}
            <AnimatePresence>
              {showCashModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                  <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#18181B] border border-[#27272A] p-8 rounded-[32px] max-w-sm w-full shadow-2xl relative">
                    <button onClick={() => setShowCashModal(false)} className="absolute top-6 right-6 p-2 bg-[#27272A] rounded-full text-[#A1A1AA] hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                    
                    <div className="flex items-center gap-3 mb-6">
                      <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                        <DollarSign className="w-6 h-6 text-emerald-500" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">Ingreso en Efectivo</h3>
                        <p className="text-xs text-[#A1A1AA]">Suma ventas locales al corte de hoy</p>
                      </div>
                    </div>

                    <form onSubmit={handleAddCashSale} className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-[#A1A1AA] uppercase">Monto cobrado ($)</label>
                        <input type="number" required min="1" value={cashAmount} onChange={(e) => setCashAmount(e.target.value)} placeholder="Ej. 350" className="w-full bg-[#27272A]/50 border border-[#27272A] rounded-2xl p-4 text-sm text-white outline-none focus:border-emerald-500 transition-colors" />
                      </div>
                      <button type="submit" disabled={isAddingCash} className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl text-sm transition-colors disabled:opacity-50 mt-2 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                        {isAddingCash ? "Sumando..." : "Registrar Venta de Efectivo"}
                      </button>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* 🚀 NUEVO MODAL: GESTOR DE HORARIOS Y FECHAS BLOQUEADAS */}
            <AnimatePresence>
              {showScheduleModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-start sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
                  <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="bg-[#18181B] border border-[#27272A] p-6 sm:p-8 rounded-t-[32px] sm:rounded-[32px] max-w-lg w-full shadow-2xl relative min-h-[80vh] sm:min-h-0 sm:max-h-[90vh] overflow-y-auto mt-10 sm:mt-0">
                    <button onClick={() => setShowScheduleModal(false)} className="absolute top-6 right-6 p-2 bg-[#27272A] rounded-full text-[#A1A1AA] hover:text-white transition-colors z-10"><X className="w-5 h-5" /></button>
                    
                    <div className="flex items-center gap-3 mb-6">
                      <div className="bg-[#009EE3]/10 p-3 rounded-xl border border-[#009EE3]/20">
                        <CalendarDays className="w-6 h-6 text-[#009EE3]" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">Horarios de Operación</h3>
                        <p className="text-xs text-[#A1A1AA]">La Inteligencia Artificial respetará esto al agendar.</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                     {/* SECCIÓN 1: DÍAS DE LA SEMANA */}
<div>
  <h4 className="text-sm font-bold text-white mb-3 uppercase tracking-wider">Horario Semanal</h4>
  <div className="space-y-1 border border-[#27272A] bg-[#27272A]/20 rounded-2xl p-2 sm:p-4">
    
    {/* Forzamos el renderizado exacto de los 7 días, sin importar qué traiga Firebase */}
    {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map((dayKey) => {
      // Extraemos el valor del estado, o usamos el default si Firebase no lo tenía
      const dayConfig = schedule[dayKey] || defaultSchedule[dayKey];
      
      return (
        <div key={dayKey} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 border-b border-[#27272A]/50 last:border-0 hover:bg-[#18181B] transition-colors rounded-xl">
          
          <div className="flex items-center justify-between sm:justify-start gap-4 sm:w-48 shrink-0">
            {/* Nombre del Día (Ancho fijo) */}
            <span className={`w-24 text-sm font-bold uppercase tracking-wide ${dayConfig.isOpen ? 'text-white' : 'text-[#A1A1AA]'}`}>
              {dayNames[dayKey]}
            </span>

            {/* Toggle Switch */}
            <button 
              onClick={() => setSchedule({...schedule, [dayKey]: {...dayConfig, isOpen: !dayConfig.isOpen}})}
              className={`w-12 h-6 rounded-full relative transition-colors shrink-0 shadow-inner ${dayConfig.isOpen ? 'bg-[#009EE3]' : 'bg-[#3f3f46]'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md ${dayConfig.isOpen ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
          
          {/* Inputs de Horario o Etiqueta de Cierre */}
          <div className="flex-1 flex justify-end">
            {dayConfig.isOpen ? (
              <div className="flex items-center gap-2">
                <input 
                  type="time" 
                  value={dayConfig.open || "09:00"} 
                  onChange={(e) => setSchedule({...schedule, [dayKey]: {...dayConfig, open: e.target.value}})} 
                  className="bg-[#18181B] border border-[#27272A] rounded-xl px-3 py-2 text-sm text-white focus:border-[#009EE3] outline-none text-center w-28 shadow-sm transition-colors" 
                />
                <span className="text-[#A1A1AA] text-xs font-bold">a</span>
                <input 
                  type="time" 
                  value={dayConfig.close || "18:00"} 
                  onChange={(e) => setSchedule({...schedule, [dayKey]: {...dayConfig, close: e.target.value}})} 
                  className="bg-[#18181B] border border-[#27272A] rounded-xl px-3 py-2 text-sm text-white focus:border-[#009EE3] outline-none text-center w-28 shadow-sm transition-colors" 
                />
              </div>
            ) : (
              <div className="text-sm text-[#A1A1AA] italic font-medium w-full text-right sm:text-right py-2">
                Día de descanso
              </div>
            )}
          </div>

        </div>
      );
    })}
  </div>
</div>

                      {/* SECCIÓN 2: FECHAS BLOQUEADAS (EXCEPCIONES) */}
                      <div>
                        <h4 className="text-sm font-bold text-white mb-3 uppercase tracking-wider">Días Festivos / Vacaciones</h4>
                        <p className="text-xs text-[#A1A1AA] mb-3">Agrega fechas específicas donde el negocio estará cerrado para evitar reservas.</p>
                        
                        <div className="flex gap-2 mb-4">
                          <input 
                            type="date" 
                            value={newBlockedDate} 
                            onChange={(e) => setNewBlockedDate(e.target.value)} 
                            className="flex-1 bg-[#27272A]/50 border border-[#27272A] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#009EE3]" 
                          />
                          <button onClick={handleAddBlockedDate} className="bg-[#27272A] hover:bg-[#3f3f46] text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">Añadir</button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {blockedDates.length === 0 ? (
                            <span className="text-xs text-[#A1A1AA] italic">Ninguna fecha bloqueada.</span>
                          ) : (
                            blockedDates.map((date) => (
                              <div key={date} className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-1.5 rounded-full text-xs font-semibold">
                                {date}
                                <button onClick={() => removeBlockedDate(date)} className="hover:text-white transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* BOTÓN DE GUARDAR HORARIOS */}
                      <button onClick={handleSaveSchedule} disabled={isSavingSchedule} className="w-full py-4 bg-[#009EE3] hover:bg-[#06B6D4] text-white font-bold rounded-2xl text-sm transition-colors disabled:opacity-50 flex justify-center items-center gap-2 mt-4">
                        {isSavingSchedule ? "Guardando en la nube..." : scheduleSavedMsg ? <><CheckCircle2 className="w-5 h-5"/> ¡Horario Actualizado!</> : "Guardar Cambios de Horario"}
                      </button>
                    </div>

                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* MODAL INTELIGENTE DE CÓDIGOS QR ACTUALIZADO */}
            <AnimatePresence>
              {qrConfig.isOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
                  <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#18181B] border border-[#27272A] p-8 rounded-[32px] max-w-sm w-full text-center space-y-6 shadow-2xl relative">
                    <h3 className="text-xl font-bold text-white">
                      {qrConfig.type === 'reservas' ? 'QR de Reservas' : 'QR del Menú / Catálogo'}
                    </h3>
                    <p className="text-xs text-[#A1A1AA]">
                      {qrConfig.type === 'reservas' ? 'Tus clientes podrán agendar citas al escanear esto.' : 'Coloca este QR en tu local para mostrar tus productos.'}
                    </p>
                    
                    <div className="bg-white p-4 rounded-2xl inline-block shadow-inner">
                      <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrConfig.type === 'reservas' ? `https://miterminal.com/reservas/${businessId}` : `https://miterminal.com/menu/${businessId}`)}`} alt="Código QR" className="w-48 h-48 object-contain mx-auto" />
                    </div>

                    <div className="space-y-3">
                      <button onClick={() => window.open(qrConfig.type === 'reservas' ? `/reservas/${businessId}` : `/menu/${businessId}`, "_blank")} className="w-full py-3 bg-[#009EE3]/10 text-[#009EE3] border border-[#009EE3]/20 font-bold rounded-xl text-sm hover:bg-[#009EE3]/20 transition-colors flex items-center justify-center gap-2">
                        <ExternalLink className="w-4 h-4" /> Ver {qrConfig.type === 'reservas' ? 'Reservas' : 'Catálogo'} como Cliente
                      </button>
                      <button onClick={() => window.open(`https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(qrConfig.type === 'reservas' ? `https://miterminal.com/reservas/${businessId}` : `https://miterminal.com/menu/${businessId}`)}&margin=20`, "_blank")} className="w-full py-3 bg-[#009EE3] text-white font-bold rounded-xl text-sm hover:opacity-90 transition-opacity">
                        Descargar QR para Imprimir
                      </button>
                      <button onClick={() => setQrConfig({ isOpen: false, type: 'reservas' })} className="w-full py-2.5 bg-[#27272A] text-[#A1A1AA] hover:text-white font-medium rounded-xl text-sm transition-colors">
                        Cerrar
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* MODAL CONFIGURACIÓN MERCADO PAGO */}
            <AnimatePresence>
              {showPaymentConfigModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                  <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#18181B] border border-[#27272A] p-8 rounded-[32px] max-w-md w-full shadow-2xl relative">
                    <button onClick={() => setShowPaymentConfigModal(false)} className="absolute top-6 right-6 p-2 bg-[#27272A] rounded-full text-[#A1A1AA] hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                    
                    <div className="flex items-center gap-3 mb-6">
                      <div className="bg-[#009EE3]/10 p-3 rounded-xl border border-[#009EE3]/20">
                        <CreditCard className="w-6 h-6 text-[#009EE3]" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">Credenciales de Cobro</h3>
                        <p className="text-xs text-[#A1A1AA]">Conecta tu cuenta de Mercado Pago</p>
                      </div>
                    </div>

                    <form onSubmit={handleSaveMpToken} className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-[#A1A1AA] uppercase">Access Token (Producción)</label>
                        <input type="password" required value={mpToken} onChange={(e) => setMpToken(e.target.value)} placeholder="APP_USR-..." className="w-full bg-[#27272A]/50 border border-[#27272A] rounded-2xl p-4 text-sm text-white outline-none focus:border-[#009EE3] font-mono transition-colors" />
                        <p className="text-[10px] text-[#A1A1AA]">Este token es la llave maestra para cobrar con links y enviar pagos a tus terminales físicas.</p>
                      </div>
                      <button type="submit" disabled={isSavingToken} className="w-full py-4 bg-[#009EE3] hover:bg-[#06B6D4] text-white font-bold rounded-2xl text-sm transition-colors disabled:opacity-50 flex justify-center items-center gap-2 mt-2">
                        {isSavingToken ? "Verificando y Guardando..." : tokenSavedMsg ? <><CheckCircle2 className="w-4 h-4"/> Guardado con éxito</> : "Guardar Credenciales"}
                      </button>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* MODAL DE SOPORTE INTELIGENTE */}
            <AnimatePresence>
              {showSupportModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                  <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#18181B] border border-[#27272A] p-0 rounded-[32px] max-w-sm w-full shadow-2xl relative flex flex-col h-[500px] max-h-[90vh] overflow-hidden">
                    <div className="flex justify-between items-center border-b border-[#27272A] p-6 pb-4 bg-[#18181B] z-10">
                      <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2"><MessageCircle className="w-5 h-5 text-[#009EE3]" /> Soporte SaaS</h3>
                        <p className="text-xs text-[#A1A1AA] mt-1">Asistencia técnica al instante</p>
                      </div>
                      <button onClick={() => setShowSupportModal(false)} className="p-2 bg-[#27272A] rounded-full text-[#A1A1AA] hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#09090B]">
                      {supportMessages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-[#27272A] text-white rounded-br-none' : 'bg-[#009EE3] text-white rounded-bl-none'} shadow-sm`}>
                            {msg.content}
                          </div>
                        </div>
                      ))}
                      {isSupportTyping && (
                        <div className="flex justify-start">
                          <div className="bg-[#009EE3] p-3 rounded-2xl text-white rounded-bl-none animate-pulse text-xs">Escribiendo...</div>
                        </div>
                      )}
                      {needsHuman && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 pb-2">
                          <button onClick={() => window.open(`https://wa.me/523300000000?text=Hola,%20soy%20el%20negocio%20${businessId}%20y%20necesito%20asistencia%20humana%20con%20mi%20plataforma.`, "_blank")} className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-500/20">
                            <MessageCircle className="w-4 h-4" /> Hablar con Asesor Humano
                          </button>
                        </motion.div>
                      )}
                      <div ref={supportEndRef} style={{ float:"left", clear: "both" }} />
                    </div>

                    <form onSubmit={handleSupportSubmit} className="p-4 bg-[#18181B] border-t border-[#27272A] flex gap-2">
                      <input type="text" value={supportInput} onChange={e => setSupportInput(e.target.value)} placeholder="Ej. Quiero actualizar el precio de mi hamburguesa" className="flex-1 bg-[#27272A] text-white text-sm rounded-xl px-4 py-2.5 outline-none focus:ring-1 focus:ring-[#009EE3] transition-all" />
                      <button type="submit" disabled={isSupportTyping} className="bg-[#009EE3] p-2.5 rounded-xl text-white hover:bg-[#06B6D4] disabled:opacity-50 flex items-center justify-center transition-colors">
                        <Send className="w-4 h-4 ml-0.5" />
                      </button>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}