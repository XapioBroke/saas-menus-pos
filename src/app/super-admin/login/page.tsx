"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ShieldAlert, KeyRound, ArrowRight } from "lucide-react";

export default function SuperAdminLogin() {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState(false);

  // Define aquí tu código secreto exclusivo de Super-Admin (puedes cambiarlo cuando quieras)
  const MASTER_PIN = "7777"; 

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === MASTER_PIN) {
      // Guardamos una sesión local para el Super Admin
      localStorage.setItem("is_super_admin", "true");
      router.push("/super-admin/dashboard");
    } else {
      setError(true);
      setTimeout(() => setError(false), 800);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-white flex items-center justify-center p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#18181B] border border-[#27272A] p-8 rounded-[32px] max-w-sm w-full shadow-2xl space-y-6 text-center relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#009EE3]/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="w-12 h-12 bg-[#009EE3]/10 border border-[#009EE3]/20 rounded-2xl flex items-center justify-center mx-auto text-[#009EE3]">
          <KeyRound className="w-6 h-6" />
        </div>

        <div>
          <h1 className="text-xl font-bold tracking-tight">Acceso Super-Admin</h1>
          <p className="text-xs text-[#A1A1AA] mt-1">Introduce tu llave maestra de gestión SaaS</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <motion.div animate={error ? { x: [-10, 10, -10, 10, 0] } : {}} transition={{ duration: 0.4 }}>
            <input 
              type="password" 
              maxLength={6}
              required
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="••••"
              className="w-full bg-[#27272A]/50 border border-[#27272A] rounded-2xl py-4 text-center text-2xl tracking-widest text-white placeholder-[#71717A] outline-none focus:border-[#009EE3] transition-colors font-mono"
            />
          </motion.div>

          <button 
            type="submit" 
            className="w-full py-4 bg-gradient-to-r from-[#009EE3] to-[#06B6D4] text-white font-bold rounded-2xl shadow-lg hover:opacity-95 transition-opacity flex items-center justify-center gap-2 text-sm"
          >
            Entrar al Núcleo <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </motion.div>
    </div>
  );
}