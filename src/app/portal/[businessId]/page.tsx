"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, QrCode, Calendar, MessageCircle, Lock, Delete } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase"; // Asegúrate de que esta ruta apunte a tu config

export default function ConciergePortal({ params }: { params: { businessId: string } }) {
  // Estados de la interfaz
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [hasError, setHasError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [dbBusinessName, setDbBusinessName] = useState(""); // Para guardar el nombre real desde Firebase

  // Nombre de respaldo basado en la URL
  const urlBusinessName = params.businessId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const displayName = dbBusinessName || urlBusinessName;

  // Validación real contra Firebase Firestore
  useEffect(() => {
    const verifyPinFirebase = async () => {
      if (pin.length === 4) {
        setIsVerifying(true);
        try {
          const docRef = doc(db, "concierge_portals", params.businessId);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists() && docSnap.data().isActive && docSnap.data().pin === pin) {
            // Actualizamos el nombre con el de la base de datos si existe
            if (docSnap.data().businessName) {
              setDbBusinessName(docSnap.data().businessName);
            }
            setTimeout(() => setIsUnlocked(true), 300);
          } else {
            handleError();
          }
        } catch (error) {
          console.error("Error validando acceso:", error);
          handleError();
        } finally {
          setIsVerifying(false);
        }
      }
    };

    verifyPinFirebase();
  }, [pin, params.businessId]);

  const handleError = () => {
    setHasError(true);
    setTimeout(() => {
      setPin("");
      setHasError(false);
    }, 600);
  };

  const handleKeypad = (num: string) => {
    if (pin.length < 4 && !isVerifying) setPin(prev => prev + num);
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] font-sans selection:bg-[#009EE3]/30 overflow-hidden relative">
      <AnimatePresence mode="wait">
        
        {/* ======================= PANTALLA DE BLOQUEO (PIN) ======================= */}
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

            <Lock className="w-8 h-8 text-[#009EE3] mb-6" />
            <h2 className="text-2xl font-semibold tracking-tight mb-2 text-center">Acceso a {displayName}</h2>
            <p className="text-sm text-[#A1A1AA] mb-12 text-center">Ingresa tu PIN de 4 dígitos para acceder a tus ventas</p>

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
          
          /* ======================= DASHBOARD "A PRUEBA DE BOBOS" ======================= */
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="w-full max-w-md mx-auto p-6"
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
              <motion.button 
                whileHover={{ scale: 0.98 }}
                whileTap={{ scale: 0.96 }}
                className="group flex items-center justify-between w-full bg-[#18181B] border border-[#27272A] rounded-3xl p-5 hover:border-[#009EE3]/50 transition-all duration-300"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-[#27272A] p-3.5 rounded-2xl group-hover:bg-[#009EE3]/20 transition-colors">
                    <QrCode className="h-6 w-6 text-white group-hover:text-[#009EE3] transition-colors" />
                  </div>
                  <div className="text-left">
                    <p className="text-base font-semibold text-white tracking-tight">Compartir Menú QR</p>
                    <p className="text-xs text-[#A1A1AA] mt-0.5">Enviar a clientes por WhatsApp</p>
                  </div>
                </div>
              </motion.button>

              <motion.button 
                whileHover={{ scale: 0.98 }}
                whileTap={{ scale: 0.96 }}
                className="group flex items-center justify-between w-full bg-[#18181B] border border-[#27272A] rounded-3xl p-5 hover:border-[#009EE3]/50 transition-all duration-300"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-[#27272A] p-3.5 rounded-2xl group-hover:bg-[#009EE3]/20 transition-colors">
                    <Calendar className="h-6 w-6 text-white group-hover:text-[#009EE3] transition-colors" />
                  </div>
                  <div className="text-left">
                    <p className="text-base font-semibold text-white tracking-tight">Ver Citas de Hoy</p>
                    <p className="text-xs text-[#A1A1AA] mt-0.5">3 reservas pendientes</p>
                  </div>
                </div>
              </motion.button>

              <motion.button 
                whileHover={{ scale: 0.98 }}
                whileTap={{ scale: 0.96 }}
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}