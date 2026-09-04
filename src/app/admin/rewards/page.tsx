"use client";

import { useState, useEffect, Suspense } from "react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter, useSearchParams } from "next/navigation";

const generateId = () => Math.random().toString(36).substr(2, 9);

function RewardsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const businessId = searchParams.get("businessId");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Configuración de Lealtad
  const [moneyToPointsRatio, setMoneyToPointsRatio] = useState<number>(10); // Ej: $10 = 1 punto
  const [rewards, setRewards] = useState([
    { id: generateId(), name: "Postre Gratis", pointsRequired: 50, active: true }
  ]);

  useEffect(() => {
    if (!businessId) {
      router.push("/admin/login");
      return;
    }

    const fetchRewards = async () => {
      try {
        const docRef = doc(db, "loyalty_programs", businessId);
        const snap = await getDoc(docRef);
        
        if (snap.exists()) {
          const data = snap.data();
          if (data.moneyToPointsRatio) setMoneyToPointsRatio(data.moneyToPointsRatio);
          if (data.rewards && data.rewards.length > 0) setRewards(data.rewards);
        }
      } catch (error) {
        console.error("Error cargando configuración de recompensas:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRewards();
  }, [businessId, router]);

  const addReward = () => setRewards([...rewards, { id: generateId(), name: "", pointsRequired: 0, active: true }]);
  
  const removeReward = (index: number) => {
    const newRewards = [...rewards];
    newRewards.splice(index, 1);
    setRewards(newRewards);
  };

  const updateReward = (index: number, field: string, value: any) => {
    const newRewards = [...rewards];
    newRewards[index] = { ...newRewards[index], [field]: value };
    setRewards(newRewards);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;
    
    setSaving(true);
    setMessage("Guardando programa de lealtad...");

    try {
      const cleanRewards = rewards.map(r => ({
        ...r,
        pointsRequired: Number(r.pointsRequired) || 0
      }));

      await setDoc(doc(db, "loyalty_programs", businessId), {
        businessId,
        moneyToPointsRatio: Number(moneyToPointsRatio),
        rewards: cleanRewards,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setMessage("¡Programa actualizado exitosamente!");
      setTimeout(() => router.push(`/admin/dashboard?businessId=${businessId}`), 1500);
    } catch (error) {
      console.error(error);
      setMessage("Error al guardar la configuración.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-gray-500">Cargando módulo de lealtad...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        
        <header className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push(`/admin/dashboard?businessId=${businessId}`)} className="p-2 bg-white rounded-xl shadow-sm border border-gray-200 hover:bg-gray-100 transition-colors">
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <h1 className="text-3xl font-black text-gray-900">Programa de Lealtad VIP</h1>
            <p className="text-gray-500 font-medium">Configura cómo tus clientes ganan y gastan sus puntos.</p>
          </div>
        </header>

        <form onSubmit={handleSave} className="space-y-8">
          {message && <div className={`p-4 rounded-xl text-sm font-bold text-center ${message.includes("Error") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"} border`}>{message}</div>}

          {/* Reglas de Acumulación */}
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
            <h2 className="text-xl font-black text-gray-900 border-b pb-2 mb-6">1. Reglas de Acumulación</h2>
            <div className="flex items-center gap-4 bg-gray-50 p-6 rounded-2xl border border-gray-200">
              <span className="text-gray-600 font-bold">Por cada $</span>
              <input 
                type="number" 
                required 
                min="1"
                value={moneyToPointsRatio} 
                onChange={(e) => setMoneyToPointsRatio(Number(e.target.value))}
                className="w-24 bg-white border border-gray-300 rounded-xl px-4 py-2 text-center font-black text-blue-600 focus:outline-none focus:border-blue-500"
              />
              <span className="text-gray-600 font-bold">gastados, el cliente gana <span className="text-blue-600">1 Punto VIP</span>.</span>
            </div>
            <p className="text-xs text-gray-500 mt-3 font-medium">Ejemplo: Si pones "10", una compra de $150 otorgará 15 puntos.</p>
          </div>

          {/* Catálogo de Recompensas */}
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 space-y-6">
            <div className="flex justify-between items-center border-b pb-2">
              <h2 className="text-xl font-black text-gray-900">2. Recompensas Disponibles</h2>
            </div>
            
            <div className="space-y-4">
              {rewards.map((reward, idx) => (
                <div key={reward.id} className="flex flex-col md:flex-row gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-200 items-start md:items-center">
                  <div className="flex-1 w-full">
                    <label className="text-xs font-bold text-gray-500 mb-1 block">Premio a entregar (Ej. 1 Capuchino)</label>
                    <input 
                      type="text" 
                      required
                      value={reward.name} 
                      onChange={(e) => updateReward(idx, 'name', e.target.value)}
                      placeholder="Nombre de la recompensa..." 
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none" 
                    />
                  </div>
                  <div className="w-full md:w-32">
                    <label className="text-xs font-bold text-gray-500 mb-1 block">Puntos Costo</label>
                    <input 
                      type="number" 
                      required
                      min="1"
                      value={reward.pointsRequired} 
                      onChange={(e) => updateReward(idx, 'pointsRequired', e.target.value)}
                      placeholder="Pts" 
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-black text-green-600 focus:outline-none" 
                    />
                  </div>
                  <button type="button" onClick={() => removeReward(idx)} className="mt-6 md:mt-0 text-red-400 hover:text-red-600 p-2 shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              ))}
            </div>
            
            <button type="button" onClick={addReward} className="w-full py-4 border-2 border-dashed border-gray-300 rounded-2xl text-gray-500 font-black hover:text-green-600 hover:bg-green-50 hover:border-green-300 transition-colors">
              + Agregar Nueva Recompensa
            </button>
          </div>

          <button type="submit" disabled={saving} className="w-full bg-black text-white font-black py-5 rounded-2xl text-xl hover:bg-gray-800 shadow-2xl disabled:opacity-50 transition-all hover:-translate-y-1">
            {saving ? "Registrando Reglas..." : "Guardar Sistema de Lealtad"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function RewardsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-bold text-gray-500">Cargando...</div>}>
      <RewardsContent />
    </Suspense>
  );
}