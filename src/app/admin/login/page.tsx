"use client";

import { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessId, setBusinessId] = useState(""); // Solo necesario para el login
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isLogin) {
        // Flujo 1: Cliente Existente (Operador o Dueño)
        if (!businessId.trim()) throw new Error("Debes ingresar el ID de tu establecimiento.");
        await signInWithEmailAndPassword(auth, email, password);
        router.push(`/admin/dashboard?businessId=${businessId.toLowerCase().trim()}`);
      } else {
        // Flujo 2: Nuevo Cliente (Registro SaaS)
        await createUserWithEmailAndPassword(auth, email, password);
        // Al crear la cuenta exitosamente, lo enviamos directo a construir su negocio
        router.push("/admin/onboarding");
      }
    } catch (err: any) {
      console.error(err);
      if (isLogin) {
        setError("Acceso denegado. Verifica tus credenciales o el ID del negocio.");
      } else {
        setError("Error al crear cuenta. La contraseña debe tener al menos 6 caracteres o el correo ya está registrado.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
        
        <div className="bg-black p-8 text-center">
          <h1 className="text-3xl font-black text-white tracking-tight">
            {isLogin ? "Portal POS" : "Crea tu SaaS"}
          </h1>
          <p className="text-gray-400 text-sm mt-2 font-semibold">
            {isLogin ? "Acceso exclusivo para establecimientos" : "Digitaliza tu negocio en minutos"}
          </p>
        </div>

        <form onSubmit={handleAuth} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm font-bold text-center border border-red-200">
              {error}
            </div>
          )}

          {/* El ID del negocio solo lo pedimos al iniciar sesión, en el registro lo crean después */}
          {isLogin && (
            <div className="space-y-2">
              <label className="block text-sm font-black text-gray-900">ID del Establecimiento</label>
              <input 
                type="text" 
                value={businessId}
                onChange={(e) => setBusinessId(e.target.value)}
                placeholder="ej. licores-valle"
                className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-bold focus:outline-none focus:border-black transition-colors lowercase"
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-sm font-black text-gray-900">Correo Electrónico</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={isLogin ? "admin@restaurante.com" : "tu@correo.com"}
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
              <span className="animate-pulse">Procesando...</span>
            ) : (
              isLogin ? "Iniciar Sesión" : "Crear Ecosistema"
            )}
          </button>
        </form>

        {/* Toggle de Registro / Login */}
        <div className="bg-gray-50 p-6 text-center border-t border-gray-100">
          <p className="text-sm font-bold text-gray-500">
            {isLogin ? "¿No tienes una cuenta?" : "¿Ya tienes una cuenta?"}{" "}
            <button 
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
              }}
              className="text-blue-600 hover:text-blue-800 transition-colors focus:outline-none"
            >
              {isLogin ? "Regístrate aquí" : "Inicia sesión"}
            </button>
          </p>
        </div>

      </div>
    </div>
  );
}