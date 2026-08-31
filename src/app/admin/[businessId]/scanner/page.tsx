"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, updateDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Html5QrcodeScanner } from "html5-qrcode";

export default function CashierScannerPage() {
  const params = useParams();
  const businessId = params.businessId as string;

  const [scanResult, setScanResult] = useState<string | null>(null);
  const [customerData, setCustomerData] = useState<any>(null);
  const [transactionType, setTransactionType] = useState<"accumulate" | "redeem">("accumulate");
  const [amountInput, setAmountInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Inicializar el escáner de la cámara
    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    scanner.render(
      async (decodedText) => {
        // Cuando lee el QR exitosamente, detenemos la cámara temporalmente y cargamos el cliente
        setScanResult(decodedText);
        scanner.clear();
        await fetchCustomer(decodedText);
      },
      (error) => {
        // Errores de escaneo continuo se ignoran silenciosamente
      }
    );

    return () => {
      scanner.clear().catch(() => {});
    };
  }, []);

  const fetchCustomer = async (customerId: string) => {
    setLoading(true);
    try {
      const customerRef = doc(db, "customers", customerId);
      const snap = await getDoc(customerRef);
      if (snap.exists()) {
        setCustomerData({ id: snap.id, ...snap.data() });
      } else {
        setMessage("Cliente no encontrado en el sistema.");
      }
    } catch (err) {
      console.error(err);
      setMessage("Error al consultar el perfil del socio.");
    } finally {
      setLoading(false);
    }
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
        // Regla estándar: 1 unidad monetaria = 1 punto (ajustable según negocio)
        const pointsEarned = Math.floor(numericAmount);
        await updateDoc(customerRef, {
          points: increment(pointsEarned)
        });
        setMessage(`¡Éxito! Se acreditaron ${pointsEarned} puntos al cliente.`);
      } else {
        // Regla de redención: 100 puntos = $50 de descuento (ejemplo configurable)
        const pointsCost = Math.floor(numericAmount);
        if (customerData.points < pointsCost) {
          setMessage("El cliente no cuenta con los puntos suficientes.");
          setLoading(false);
          return;
        }
        await updateDoc(customerRef, {
          points: increment(-pointsCost)
        });
        setMessage(`¡Redención exitosa! Se descontaron ${pointsCost} puntos.`);
      }

      // Recargar datos actualizados
      await fetchCustomer(customerData.id);
      setAmountInput("");
    } catch (err) {
      console.error(err);
      setMessage("Error al procesar la transacción.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto space-y-6">
        
        <header className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
          <h1 className="text-xl font-extrabold text-gray-900">Terminal de Caja (POS)</h1>
          <p className="text-sm text-gray-500 mt-1">Escanea el QR de la membresía del cliente</p>
        </header>

        {/* CONTENEDOR DE LA CÁMARA */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div id="reader" className="overflow-hidden rounded-xl"></div>
        </div>

        {/* PANEL DE TRANSACCIÓN CUANDO SE LEE EL QR */}
        {customerData && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            <div className="border-b pb-3">
              <h2 className="font-bold text-gray-900 text-lg">{customerData.name}</h2>
              <p className="text-xs text-gray-500">{customerData.phone}</p>
              <div className="mt-2 inline-block bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-extrabold">
                Saldo actual: {customerData.points} Puntos
              </div>
            </div>

            {message && (
              <div className="p-3 bg-gray-50 text-gray-800 rounded-xl text-xs font-semibold border">
                {message}
              </div>
            )}

            <form onSubmit={handleTransaction} className="space-y-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTransactionType("accumulate")}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl border ${transactionType === 'accumulate' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700'}`}
                >
                  Acumular Puntos
                </button>
                <button
                  type="button"
                  onClick={() => setTransactionType("redeem")}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl border ${transactionType === 'redeem' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700'}`}
                >
                  Canjear / Redimir
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {transactionType === 'accumulate' ? 'Monto total de la compra ($)' : 'Puntos a descontar'}
                </label>
                <input 
                  type="number" required
                  value={amountInput} onChange={(e) => setAmountInput(e.target.value)}
                  placeholder={transactionType === 'accumulate' ? 'Ej. 350' : 'Ej. 100'}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:outline-none"
                />
              </div>

              <button 
                type="submit" disabled={loading}
                className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-gray-800 disabled:opacity-50 text-sm"
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