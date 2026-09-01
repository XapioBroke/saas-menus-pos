"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, updateDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import jsQR from "jsqr";

export default function CashierScannerPage() {
  const params = useParams();
  const businessId = params.businessId as string;

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

  const startCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(true);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
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
        
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

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
    <div className="min-h-screen bg-gray-100 py-6 px-4">
      {/* Estilos inyectados: Animación láser y forzado de contraste anti-transparencias */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scanLaser {
          0% { top: 0px; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-laser { animation: scanLaser 2.5s linear infinite; }
        
        /* Forzamos visibilidad total en cualquier texto residual */
        span, p, label {
          color: #111827 !important;
        }
      `}} />

      <div className="max-w-md mx-auto space-y-6">
        
        <header className="bg-white p-6 rounded-2xl shadow-md border border-gray-200 text-center relative">
          <button onClick={() => window.history.back()} className="absolute left-4 top-6 text-gray-800 hover:text-black font-bold p-2 bg-gray-100 rounded-xl">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-xl font-black text-gray-900">Terminal de Caja (POS)</h1>
          <p className="text-sm font-bold text-gray-700 mt-1">Escanea el QR de la membresía</p>
        </header>

        {!customerData && (
          <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-2 flex gap-2">
            <button onClick={() => setInputMode("camera")} className={`flex-1 py-3 text-sm font-black rounded-xl transition-all shadow-sm ${inputMode === 'camera' ? 'bg-black text-white shadow-md' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}>Cámara / Escáner</button>
            <button onClick={() => setInputMode("manual")} className={`flex-1 py-3 text-sm font-black rounded-xl transition-all shadow-sm ${inputMode === 'manual' ? 'bg-black text-white shadow-md' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}>Código Manual</button>
          </div>
        )}

        {!customerData && (
          <div className="bg-white p-5 rounded-2xl shadow-md border border-gray-200">
            {inputMode === "camera" ? (
              <div className="space-y-4">
                
                {cameraError ? (
                  <div className="bg-amber-100 text-amber-900 p-4 rounded-xl text-sm font-extrabold text-center border border-amber-300">
                    Cámara bloqueada por permisos. Usa el botón de archivo inferior.
                  </div>
                ) : (
                  <div className="relative w-full h-[320px] bg-black rounded-2xl overflow-hidden shadow-inner">
                    <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
                    <canvas ref={canvasRef} className="hidden" />
                    
                    <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
                      <div className="relative w-[230px] h-[230px]">
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-xl"></div>
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-xl"></div>
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-xl"></div>
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-xl"></div>
                        <div className="absolute left-0 right-0 h-[2px] bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,1)] animate-laser"></div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Botón de archivo transformado en pastilla de alto contraste */}
                <div className="relative mt-2">
                  <input type="file" accept="image/*" capture="environment" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                  <div className="w-full bg-blue-600 text-white font-extrabold py-4 rounded-xl text-center shadow-lg hover:bg-blue-700 flex items-center justify-center gap-2 text-base">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    Subir Foto del QR / Archivo
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleManualSearch} className="space-y-4 py-2">
                <label className="block text-sm font-black text-gray-900">Token ID del Cliente</label>
                <input type="text" required value={manualToken} onChange={(e) => setManualToken(e.target.value)} placeholder="Ej. L5A9X2..." className="w-full bg-gray-50 border-2 border-gray-300 rounded-xl px-4 py-4 text-base font-bold text-gray-900 focus:outline-none focus:border-blue-600" />
                <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-extrabold py-4 rounded-xl hover:bg-blue-700 shadow-md text-base">Verificar Socio</button>
              </form>
            )}
            {message && <div className="mt-4 p-3 bg-gray-200 text-gray-900 rounded-xl text-sm font-black text-center border border-gray-300">{message}</div>}
          </div>
        )}

        {customerData && (
          <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200 space-y-5">
            <div className="border-b pb-4 flex justify-between items-start">
              <div>
                <h2 className="font-black text-gray-900 text-2xl">{customerData.name}</h2>
                <div className="mt-2 inline-block bg-emerald-100 text-emerald-900 px-4 py-1.5 rounded-full text-sm font-black border border-emerald-300 shadow-sm">
                  Saldo actual: {customerData.points} Puntos
                </div>
              </div>
              <button 
                onClick={() => { setCustomerData(null); startCamera(); }} 
                className="text-xs bg-gray-200 text-gray-900 px-4 py-2 rounded-xl font-black hover:bg-gray-300 transition-colors shadow-sm"
              >
                Cambiar
              </button>
            </div>
            
            {message && <div className="p-3 bg-blue-100 text-blue-900 rounded-xl text-sm font-black text-center border border-blue-200">{message}</div>}
            
            <form onSubmit={handleTransaction} className="space-y-5 pt-1">
              <div className="flex bg-gray-100 p-1.5 rounded-xl border border-gray-300 gap-1">
                <button type="button" onClick={() => setTransactionType("accumulate")} className={`flex-1 py-3 text-xs font-black rounded-lg transition-all ${transactionType === 'accumulate' ? 'bg-black text-white shadow-md' : 'text-gray-900 hover:bg-gray-200'}`}>Acumular (+)</button>
                <button type="button" onClick={() => setTransactionType("redeem")} className={`flex-1 py-3 text-xs font-black rounded-lg transition-all ${transactionType === 'redeem' ? 'bg-black text-white shadow-md' : 'text-gray-900 hover:bg-gray-200'}`}>Canjear (-)</button>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-black text-gray-900">
                  {transactionType === 'accumulate' ? 'Monto total de la compra ($)' : 'Puntos a canjear'}
                </label>
                <input 
                  type="number" 
                  required 
                  min="1" 
                  value={amountInput} 
                  onChange={(e) => setAmountInput(e.target.value)} 
                  placeholder={transactionType === 'accumulate' ? 'Ej. 350' : 'Ej. 100'} 
                  className="w-full bg-white border-2 border-gray-300 rounded-xl px-4 py-4 text-xl font-black text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-600 transition-colors text-center shadow-inner" 
                />
              </div>
              
              <button 
                type="submit" 
                disabled={loading} 
                className="w-full bg-black text-white font-black py-4 rounded-xl text-base hover:bg-gray-800 shadow-xl tracking-wide"
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