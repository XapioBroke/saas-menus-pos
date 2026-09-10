"use client";

import { useState, useEffect, useRef, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, QrCode, Calendar, MessageCircle, Lock, Delete, ShieldCheck, X, Send, CreditCard, CheckCircle2 } from "lucide-react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link"; 

export default function ConciergePortal({ params }: { params: Promise<{ businessId: string }> }) {
  const resolvedParams = use(params);
  const businessId = resolvedParams.businessId;

  // Estados de Seguridad y Teclado
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [hasError, setHasError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [dbBusinessName, setDbBusinessName] = useState("");
  const [requiresPinChange, setRequiresPinChange] = useState(false);
  const [newPinConfig, setNewPinConfig] = useState({ step: 1, firstPin: "" });

  // Estados para los Modales de Acción
  const [showQrModal, setShowQrModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showPaymentConfigModal, setShowPaymentConfigModal] = useState(false);

  // Estados para Mercado Pago
  const [mpToken, setMpToken] = useState("");
  const [isSavingToken, setIsSavingToken] = useState(false);
  const [tokenSavedMsg, setTokenSavedMsg] = useState(false);

  // Estados para el Chat Inteligente de Soporte (Concierge)
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

  // Cargar Token de Mercado Pago al desbloquear
  useEffect(() => {
    if (isUnlocked) {
      const fetchBusinessData = async () => {
        try {
          const bizDoc = await getDoc(doc(db, "businesses", businessId));
          if (bizDoc.exists() && bizDoc.data().mercadopagoAccessToken) {
            setMpToken(bizDoc.data().mercadopagoAccessToken);
          }
        } catch (error) {
          console.error("Error obteniendo datos del negocio:", error);
        }
      };
      fetchBusinessData();
    }
  }, [isUnlocked, businessId]);

  // Auto-scroll del chat de soporte
  useEffect(() => {
    if (showSupportModal) {
      supportEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [supportMessages, isSupportTyping, showSupportModal]);

  // Lógica del Teclado Numérico de Seguridad
  const handleKeypad = async (num: string) => {
    if (isVerifying || pin.length >= 4) return;
    
    const nextPin = pin + num;
    setPin(nextPin);

    if (nextPin.length === 4) {
      setIsVerifying(true);

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
      } else {
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
              setTimeout(() => setIsUnlocked(true), 300);
            } catch (error) {
              console.error("Error actualizando PIN:", error);
              triggerError();
            }
          } else {
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

  // Guardar Token de Mercado Pago
  const handleSaveMpToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mpToken.trim()) return;
    
    setIsSavingToken(true);
    try {
      await updateDoc(doc(db, "businesses", businessId), {
        mercadopagoAccessToken: mpToken.trim()
      });
      setTokenSavedMsg(true);
      setTimeout(() => {
        setTokenSavedMsg(false);
        setShowPaymentConfigModal(false);
      }, 2000);
    } catch (error) {
      console.error("Error guardando token:", error);
      alert("Error al guardar credenciales");
    } finally {
      setIsSavingToken(false);
    }
  };

  // Lógica del Envío del Chat de Soporte
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
        body: JSON.stringify({
          messages: [...supportMessages, { role: "user", content: userMsg }]
        })
      });
      const data = await res.json();
      
      if (data.reply) {
        setSupportMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
      }
      if (data.escalate) {
        setNeedsHuman(true); // Muestra botón de WhatsApp
      }
    } catch (error) {
      setSupportMessages(prev => [...prev, { role: "assistant", content: "Error de conexión. Intenta de nuevo." }]);
    } finally {
      setIsSupportTyping(false);
    }
  };

  const renderSecurityHeader = () => {
    if (!requiresPinChange) {
      return (
        <>
          <Lock className="w-8 h-8 text-[#009EE3] mb-6" />
          <h2 className="text-2xl font-semibold tracking-tight mb-2 text-center">Acceso a {displayName}</h2>
          <p className="text-sm text-[#A1A1AA] mb-12 text-center">Ingresa tu PIN de 4 dígitos para acceder</p>
        </>
      );
    }
    if (newPinConfig.step === 1) {
      return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center">
          <ShieldCheck className="w-8 h-8 text-[#06B6D4] mb-6" />
          <h2 className="text-2xl font-semibold tracking-tight mb-2 text-center">Crea tu nuevo PIN</h2>
          <p className="text-sm text-[#A1A1AA] mb-12 text-center">Por seguridad, establece un PIN definitivo</p>
        </motion.div>
      );
    }
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center">
        <ShieldCheck className="w-8 h-8 text-[#009EE3] mb-6" />
        <h2 className="text-2xl font-semibold tracking-tight mb-2 text-center">Confirma tu PIN</h2>
        <p className="text-sm text-[#A1A1AA] mb-12 text-center">Vuelve a ingresar los 4 dígitos</p>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] font-sans selection:bg-[#009EE3]/30 overflow-hidden relative">
      <AnimatePresence mode="wait">
        {!isUnlocked ? (
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

            <motion.div 
              animate={hasError ? { x: [-10, 10, -10, 10, 0] } : {}}
              transition={{ duration: 0.4 }}
              className="flex gap-4 mb-16"
            >
              {[...Array(4)].map((_, i) => (
                <div 
                  key={i} 
                  className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
                    i < pin.length 
                      ? hasError ? "bg-red-500 border-red-500" : "bg-[#06B6D4] border-[#06B6D4]" 
                      : "border-[#27272A] bg-transparent"
                  }`}
                />
              ))}
            </motion.div>

            <div className="grid grid-cols-3 gap-x-8 gap-y-6 w-full max-w-[280px]">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <motion.button
                  key={num}
                  whileTap={{ scale: 0.9, backgroundColor: "rgba(255, 255, 255, 0.1)" }}
                  onClick={() => handleKeypad(num.toString())}
                  disabled={isVerifying}
                  className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-light hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  {num}
                </motion.button>
              ))}
              <div />
              <motion.button
                whileTap={{ scale: 0.9, backgroundColor: "rgba(255, 255, 255, 0.1)" }}
                onClick={() => handleKeypad("0")}
                disabled={isVerifying}
                className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-light hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                0
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleDelete}
                disabled={isVerifying}
                className="w-20 h-20 rounded-full flex items-center justify-center text-[#A1A1AA] hover:text-white transition-colors disabled:opacity-50"
              >
                <Delete className="w-8 h-8" />
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="w-full max-w-md mx-auto p-6 pb-24"
          >
            <header className="mb-8 mt-4 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white">Hola, {displayName}</h1>
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
              
              <p className="text-xs font-semibold text-[#A1A1AA] mb-2 uppercase tracking-widest">Ventas de hoy</p>
              <h2 className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-[#A1A1AA]">
                $4,250.00
              </h2>
              <div className="mt-5 inline-flex items-center gap-2 bg-[#009EE3]/10 px-3 py-1.5 rounded-full border border-[#009EE3]/20">
                <span className="text-xs font-semibold text-[#06B6D4]">+12% vs ayer</span>
              </div>
            </motion.div>

            <div className="grid grid-cols-1 gap-4">
              
              {/* BOTÓN 1: COMPARTIR QR */}
              <motion.button 
                whileHover={{ scale: 0.98 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setShowQrModal(true)}
                className="group flex items-center justify-between w-full bg-[#18181B] border border-[#27272A] rounded-3xl p-5 hover:border-[#009EE3]/50 transition-all duration-300"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-[#27272A] p-3.5 rounded-2xl group-hover:bg-[#009EE3]/20 transition-colors">
                    <QrCode className="h-6 w-6 text-white group-hover:text-[#009EE3] transition-colors" />
                  </div>
                  <div className="text-left">
                    <p className="text-base font-semibold text-white tracking-tight">Código QR del Negocio</p>
                    <p className="text-xs text-[#A1A1AA] mt-0.5">Mostrar o descargar para clientes</p>
                  </div>
                </div>
              </motion.button>

              {/* BOTÓN 2: MÓDULO DE CITAS */}
              <Link 
                href={`/portal/${businessId}/citas`}
                className="group flex items-center justify-between w-full bg-[#18181B] border border-[#27272A] rounded-3xl p-5 hover:border-[#009EE3]/50 transition-all duration-300 block"
              >
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

              {/* BOTÓN 3: CONFIGURACIÓN DE COBROS */}
              <motion.button 
                whileHover={{ scale: 0.98 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setShowPaymentConfigModal(true)}
                className="group flex items-center justify-between w-full bg-[#18181B] border border-[#27272A] rounded-3xl p-5 hover:border-[#009EE3]/50 transition-all duration-300"
              >
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

              {/* BOTÓN 4: SOPORTE CONCIERGE */}
              <motion.button 
                whileHover={{ scale: 0.98 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setShowSupportModal(true)}
                className="group flex items-center justify-between w-full bg-[#18181B] border border-[#27272A] rounded-3xl p-5 hover:border-[#009EE3]/50 transition-all duration-300"
              >
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
                        <input 
                          type="password" 
                          required
                          value={mpToken} 
                          onChange={(e) => setMpToken(e.target.value)} 
                          placeholder="APP_USR-..." 
                          className="w-full bg-[#27272A]/50 border border-[#27272A] rounded-2xl p-4 text-sm text-white outline-none focus:border-[#009EE3] font-mono transition-colors"
                        />
                        <p className="text-[10px] text-[#A1A1AA]">Puedes encontrar este token en tu panel de desarrollador de Mercado Pago.</p>
                      </div>

                      <button 
                        type="submit" 
                        disabled={isSavingToken}
                        className="w-full py-4 bg-[#009EE3] hover:bg-[#06B6D4] text-white font-bold rounded-2xl text-sm transition-colors disabled:opacity-50 flex justify-center items-center gap-2 mt-2"
                      >
                        {isSavingToken ? "Verificando y Guardando..." : tokenSavedMsg ? <><CheckCircle2 className="w-4 h-4"/> Guardado con éxito</> : "Guardar Credenciales"}
                      </button>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* MODAL QR DE RESERVAS / MENÚ */}
            <AnimatePresence>
              {showQrModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
                  <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#18181B] border border-[#27272A] p-8 rounded-[32px] max-w-sm w-full text-center space-y-6 shadow-2xl relative">
                    <h3 className="text-xl font-bold text-white">QR para tus Clientes</h3>
                    <p className="text-xs text-[#A1A1AA]">Escanea o descarga este código para que tus clientes agenden directo.</p>
                    
                    <div className="bg-white p-4 rounded-2xl inline-block shadow-inner">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`https://miterminal.com/reservas/${businessId}`)}`} 
                        alt="QR Reservas" 
                        className="w-48 h-48 object-contain mx-auto" 
                      />
                    </div>

                    <div className="space-y-2">
                      <button 
                        onClick={() => window.open(`https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(`https://miterminal.com/reservas/${businessId}`)}&margin=20`, "_blank")}
                        className="w-full py-3 bg-[#009EE3] text-white font-bold rounded-xl text-sm hover:opacity-90 transition-opacity"
                      >
                        Descargar QR en HD
                      </button>
                      <button 
                        onClick={() => setShowQrModal(false)}
                        className="w-full py-2.5 bg-[#27272A] text-[#A1A1AA] hover:text-white font-medium rounded-xl text-sm transition-colors"
                      >
                        Cerrar
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* MODAL DE SOPORTE INTELIGENTE (CHAT INTERACTIVO) */}
            <AnimatePresence>
              {showSupportModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                  <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#18181B] border border-[#27272A] p-0 rounded-[32px] max-w-sm w-full shadow-2xl relative flex flex-col h-[500px] max-h-[90vh] overflow-hidden">
                    
                    {/* Header del Chat */}
                    <div className="flex justify-between items-center border-b border-[#27272A] p-6 pb-4 bg-[#18181B] z-10">
                      <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2"><MessageCircle className="w-5 h-5 text-[#009EE3]" /> Soporte SaaS</h3>
                        <p className="text-xs text-[#A1A1AA] mt-1">Asistencia técnica al instante</p>
                      </div>
                      <button onClick={() => setShowSupportModal(false)} className="p-2 bg-[#27272A] rounded-full text-[#A1A1AA] hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                    </div>

                    {/* Área de Mensajes */}
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
                      
                      {/* Botón Fallback de WhatsApp Automático (IMPORTANTE: Cambia el 523300000000 por tu número) */}
                      {needsHuman && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 pb-2">
                          <button 
                            onClick={() => window.open(`https://wa.me/523300000000?text=Hola,%20soy%20el%20negocio%20${businessId}%20y%20necesito%20asistencia%20humana%20con%20mi%20plataforma.`, "_blank")}
                            className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
                          >
                            <MessageCircle className="w-4 h-4" /> Hablar con Asesor Humano
                          </button>
                        </motion.div>
                      )}
                      
                      {/* Referencia para el auto-scroll */}
                      <div ref={supportEndRef} style={{ float:"left", clear: "both" }} />
                    </div>

                    {/* Formulario de Input */}
                    <form onSubmit={handleSupportSubmit} className="p-4 bg-[#18181B] border-t border-[#27272A] flex gap-2">
                      <input 
                        type="text" 
                        value={supportInput} 
                        onChange={e => setSupportInput(e.target.value)} 
                        placeholder="Ej. ¿Cómo imprimo mi QR?" 
                        className="flex-1 bg-[#27272A] text-white text-sm rounded-xl px-4 py-2.5 outline-none focus:ring-1 focus:ring-[#009EE3] transition-all" 
                      />
                      <button 
                        type="submit" 
                        disabled={isSupportTyping} 
                        className="bg-[#009EE3] p-2.5 rounded-xl text-white hover:bg-[#06B6D4] disabled:opacity-50 flex items-center justify-center transition-colors"
                      >
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