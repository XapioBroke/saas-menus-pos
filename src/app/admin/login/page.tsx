"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessId, setBusinessId] = useState("gps-diagnosis"); // Por defecto para el MVP
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1. Firebase verifica las credenciales matemáticamente
      await signInWithEmailAndPassword(auth, email, password);
      
      // 2. Si es exitoso, abrimos la puerta al panel del negocio
      router.push(`/admin/${businessId}`);
    } catch (err: any) {
      console.error(err);
      setError("Acceso denegado. Verifica tus credenciales.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
        
        <div className="bg-black p-8 text-center">
          <h1 className="text-3xl font-black text-white tracking-tight">Portal POS</h1>
          <p className="text-gray-400 text-sm mt-2 font-semibold">Acceso exclusivo para administradores</p>
        </div>

        <form onSubmit={handleLogin} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm font-bold text-center border border-red-200">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-sm font-black text-gray-900">ID del Establecimiento</label>
            <input 
              type="text" 
              required 
              value={businessId}
              onChange={(e) => setBusinessId(e.target.value)}
              className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-bold focus:outline-none focus:border-black transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-black text-gray-900">Correo Electrónico</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@restaurante.com"
              className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-bold focus:outline-none focus:border-black transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-black text-gray-900">Contraseña</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-bold focus:outline-none focus:border-black transition-colors"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 text-white font-black py-4 rounded-xl hover:bg-blue-700 transition-all shadow-lg text-lg flex items-center justify-center gap-2"
          >
            {loading ? (
              "Verificando..."
            ) : (
              <>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                Iniciar Sesión
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}