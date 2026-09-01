"use client";

import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase"; // Asegúrate de exportar 'db' desde tu config
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, updateDoc, increment } from "firebase/firestore";
import jsQR from "jsqr";

// Interfaz para el tipado estricto de la marca
interface BrandSettings {
  primaryColor: string;
  backgroundUrl: string;
  logoUrl: string;
}

export default function CashierScannerPage() {
  const params = useParams();
  const businessId = params.businessId as string;

  // Estados de Personalización (White-label)
  const [brand, setBrand] = useState<BrandSettings>({
    primaryColor: "#111827", // Negro por defecto
    backgroundUrl: "",
    logoUrl: "",
  });

  const [inputMode, setInputMode] = useState<"camera" | "manual">("camera");
  const [manualToken, setManualToken] = useState("");
  const [customerData, setCustomerData] = useState<any>(null);
  const [transactionType, setTransactionType] = useState<"accumulate" | "redeem">("accumulate");
  const [amountInput, setAmountInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [cameraError, setCameraError] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef<number>(0);

  // 1. Cargar configuración visual del negocio
  useEffect(() => {
    const fetchBrandSettings = async () => {
      try {
        const businessRef = doc(db, "businesses", businessId);
        const snap = await getDoc(businessRef);
        if (snap.exists() && snap.data().brandSettings) {
          setBrand((prev) => ({ ...prev, ...snap.data().brandSettings }));
        }
      } catch (error) {
        console.error("Error cargando personalización visual:", error);
      }
    };
    fetchBrandSettings();
  }, [businessId]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error al cerrar sesión", error);
    }
  };

  const startCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(true);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          requestRef.current = requestAnimationFrame(scanFrame);
        };
      }
      setCameraError(false);
    } catch (err) {
      console.error("Error de cámara:", err);
      setCameraError(true);
    }
  };

  const stopCamera = () => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const scanFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });

        if (code && code.data) {
          stopCamera(); 
          fetchCustomer(code.data);
          return; 
        }
      }
    }
    requestRef.current = requestAnimationFrame(scanFrame);
  };

  useEffect(() => {
    if (inputMode === "camera" && !customerData) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [inputMode, customerData]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setMessage("Analizando foto...");
    stopCamera();

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, img.width, img.height);
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          
          if (code && code.data) {
            fetchCustomer(code.data);
          } else {
            setMessage("No se detectó QR. Asegúrate de que se vea claro.");
            setLoading(false);
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const fetchCustomer = async (customerId: string) => {
    setLoading(true);
    setMessage("");
    try {
      const customerRef = doc(db, "customers", customerId.trim());
      const snap = await getDoc(customerRef);
      if (snap.exists()) {
        setCustomerData({ id: snap.id, ...snap.data() });
      } else {
        setMessage("Código inválido. Cliente no encontrado en el sistema.");
      }
    } catch (err) {
      console.error(err);
      setMessage("Error al consultar la base de datos.");
    } finally {
      setLoading(false);
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualToken) fetchCustomer(manualToken);
  };

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerData || !amountInput) return;
    setLoading(true);
    setMessage("");

    try {
      const customerRef = doc(db, "customers", customerData.id);
      const numericAmount = parseFloat(amountInput);

      if (transactionType === "accumulate") {
        const pointsEarned = Math.floor(numericAmount);
        await updateDoc(customerRef, { points: increment(pointsEarned) });
        setMessage(`¡Éxito! Se acreditaron ${pointsEarned} puntos.`);
      } else {
        const pointsCost = Math.floor(numericAmount);
        if (customerData.points < pointsCost) {
          setMessage("Puntos insuficientes.");
          setLoading(false);
          return;
        }
        await updateDoc(customerRef, { points: increment(-pointsCost) });
        setMessage(`¡Redención exitosa! Se descontaron ${pointsCost} puntos.`);
      }
      await fetchCustomer(customerData.id);
      setAmountInput("");
    } catch (err) {
      console.error(err);
      setMessage("Error procesando la transacción.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen py-8 px-4 relative bg-cover bg-center bg-fixed"
      style={{ 
        backgroundImage: brand.backgroundUrl ? `url(${brand.backgroundUrl})` : 'none',
        backgroundColor: brand.backgroundUrl ? 'transparent' : '#f9fafb' 
      }}
    >
      {/* Capa de oscurecimiento si hay fondo, para mantener legibilidad */}
      {brand.backgroundUrl && <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-0"></div>}

      <div className="max-w-md mx-auto space-y-6 relative z-10">
        
        <header className="bg-white/95 p-6 rounded-2xl shadow-xl border border-gray-100 text-center relative backdrop-blur-md">
          <button onClick={() => window.history.back()} className="absolute left-6 top-6 text-gray-400 hover:text-gray-900">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          
          {brand.logoUrl ? (
            <img src={brand.logoUrl} alt="Logo" className="h-10 mx-auto mb-2 object-contain" />
          ) : (
            <h1 className="text-xl font-extrabold text-gray-900">Terminal POS</h1>
          )}
          <p className="text-sm text-gray-500 mt-1">Identifica al socio VIP</p>

          <button 
            onClick={handleLogout} 
            className="absolute right-6 top-6 text-red-600 bg-red-50 hover:bg-red-100 font-extrabold px-4 py-1.5 rounded-xl text-sm border border-red-200 transition-colors shadow-sm"
          >
            Salir
          </button>
        </header>

        {!customerData && (
          <div className="bg-white/95 rounded-2xl shadow-xl border border-gray-100 p-2 flex gap-2 backdrop-blur-md">
            <button 
              onClick={() => setInputMode("camera")} 
              className="flex-1 py-2 text-sm font-bold rounded-xl transition-colors text-white shadow-md"
              style={{ backgroundColor: inputMode === 'camera' ? brand.primaryColor : '#9ca3af' }}
            >
              Escáner
            </button>
            <button 
              onClick={() => setInputMode("manual")} 
              className="flex-1 py-2 text-sm font-bold rounded-xl transition-colors text-white shadow-md"
              style={{ backgroundColor: inputMode === 'manual' ? brand.primaryColor : '#9ca3af' }}
            >
              Manual
            </button>
          </div>
        )}

        {!customerData && (
          <div className="bg-white/95 p-4 rounded-2xl shadow-xl border border-gray-100 backdrop-blur-md">
            {inputMode === "camera" ? (
              <div className="space-y-4">
                {cameraError ? (
                  <div className="bg-yellow-50 text-yellow-800 p-4 rounded-xl text-sm font-semibold text-center border border-yellow-200">
                    La cámara en vivo está bloqueada. Usa el botón de abajo para tomar una foto.
                  </div>
                ) : (
                  <div className="relative w-full h-[300px] bg-black rounded-2xl overflow-hidden shadow-inner">
                    <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                )}
                
                <div className="relative mt-4">
                  <input type="file" accept="image/*" capture="environment" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                  <div 
                    className="w-full text-white font-bold py-4 rounded-xl text-center shadow-md flex items-center justify-center gap-2"
                    style={{ backgroundColor: brand.primaryColor }}
                  >
                    Escanear Foto / Activar Cámara
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleManualSearch} className="p-2 space-y-4">
                <label className="block text-sm font-bold text-gray-700">Token ID del Cliente</label>
                <input type="text" required value={manualToken} onChange={(e) => setManualToken(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none" />
                <button type="submit" disabled={loading} className="w-full text-white font-bold py-3 rounded-xl shadow-md" style={{ backgroundColor: brand.primaryColor }}>
                  Verificar Socio
                </button>
              </form>
            )}
            {message && <div className="mt-4 p-3 bg-gray-100 text-gray-800 rounded-xl text-sm font-semibold text-center border">{message}</div>}
          </div>
        )}

        {customerData && (
          <div className="bg-white/95 p-6 rounded-2xl shadow-xl border border-gray-100 space-y-4 backdrop-blur-md">
            <div className="border-b pb-4 flex justify-between items-start">
              <div>
                <h2 className="font-bold text-gray-900 text-xl">{customerData.name}</h2>
                <div className="mt-2 inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-extrabold border border-green-200">
                  Saldo: {customerData.points} Puntos
                </div>
              </div>
              <button 
                onClick={() => { setCustomerData(null); startCamera(); }} 
                className="text-xs bg-gray-200 text-gray-900 px-4 py-2 rounded-lg font-bold hover:bg-gray-300 transition-colors shadow-sm"
              >
                Cambiar Cliente
              </button>
            </div>
            
            {message && <div className="p-3 bg-blue-50 text-blue-800 rounded-xl text-sm font-semibold text-center">{message}</div>}
            
            <form onSubmit={handleTransaction} className="space-y-5 pt-2">
              <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-200">
                <button type="button" onClick={() => setTransactionType("accumulate")} className={`flex-1 py-2 text-xs font-bold rounded-lg ${transactionType === 'accumulate' ? 'bg-white shadow-sm text-gray-900 border border-gray-200' : 'text-gray-500'}`}>Acumular (+)</button>
                <button type="button" onClick={() => setTransactionType("redeem")} className={`flex-1 py-2 text-xs font-bold rounded-lg ${transactionType === 'redeem' ? 'bg-white shadow-sm text-gray-900 border border-gray-200' : 'text-gray-500'}`}>Canjear (-)</button>
              </div>
              
              <div>
                <input 
                  type="number" required min="1" 
                  value={amountInput} 
                  onChange={(e) => setAmountInput(e.target.value)} 
                  placeholder={transactionType === 'accumulate' ? 'Monto pagado ($)' : 'Puntos a restar'} 
                  className="w-full bg-white border-2 border-gray-300 rounded-xl px-4 py-4 text-xl font-black text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-600 transition-colors text-center" 
                />
              </div>
              
              <button 
                type="submit" disabled={loading} 
                className="w-full text-white font-extrabold py-4 rounded-xl text-base shadow-lg"
                style={{ backgroundColor: brand.primaryColor }}
              >
                {loading ? "Procesando..." : "Confirmar Operación"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}