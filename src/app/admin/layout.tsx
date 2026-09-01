"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Escuchamos el estado criptográfico del usuario en tiempo real
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
        setIsLoading(false);
      } else {
        setIsAuthenticated(false);
        // Si no hay sesión y NO está en la página de login, lo expulsamos
        if (pathname !== "/admin/login") {
          router.push("/admin/login");
        } else {
          // Si ya está en la página de login, lo dejamos renderizar
          setIsLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, [router, pathname]);

  // Pantalla de carga corporativa mientras el servidor valida las llaves maestras
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-black rounded-full animate-spin"></div>
        <p className="text-sm font-bold text-gray-500 tracking-wide">Autenticando credenciales...</p>
      </div>
    );
  }

  // Prevención de destellos: Si no está autenticado y está siendo expulsado, ocultamos la interfaz
  if (!isAuthenticated && pathname !== "/admin/login") {
    return null; 
  }

  // Si pasó todos los filtros, renderizamos el panel
  return <>{children}</>;
}