"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Tipado del pedido
interface Order {
  id: string;
  customerName: string;
  customerPhone?: string;
  items: { name: string; quantity: number; price: number }[];
  total: number;
  status: "nuevo" | "preparando" | "listo" | "entregado";
  paymentMethod: string;
  createdAt: string;
}

export default function KitchenDisplaySystem() {
  const params = useParams();
  const router = useRouter();
  const businessId = params.businessId as string;

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Escucha en TIEMPO REAL de la base de datos
  useEffect(() => {
    if (!businessId) return;

    const ordersRef = collection(db, "businesses", businessId, "orders");
    const q = query(ordersRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedOrders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      
      // Filtramos los entregados para no saturar la pantalla
      setOrders(fetchedOrders.filter(o => o.status !== "entregado"));
      setLoading(false);
      
      // TIP TIER 1: Aquí podrías reproducir un sonido "Ding!" si hay un nuevo pedido
    });

    return () => unsubscribe();
  }, [businessId]);

  const updateOrderStatus = async (orderId: string, newStatus: Order["status"]) => {
    try {
      const orderRef = doc(db, "businesses", businessId, "orders", orderId);
      await updateDoc(orderRef, { status: newStatus });
    } catch (error) {
      console.error("Error actualizando comanda:", error);
      alert("Error de conexión al actualizar.");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "nuevo": return "bg-red-50 border-red-200 text-red-900";
      case "preparando": return "bg-yellow-50 border-yellow-200 text-yellow-900";
      case "listo": return "bg-green-50 border-green-200 text-green-900";
      default: return "bg-gray-50 border-gray-200";
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center font-black text-white text-xl">Cargando KDS...</div>;

  const newOrders = orders.filter(o => o.status === "nuevo");
  const prepOrders = orders.filter(o => o.status === "preparando");
  const readyOrders = orders.filter(o => o.status === "listo");

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col h-screen overflow-hidden">
      
      {/* HEADER KDS */}
      <header className="bg-gray-900 text-white p-4 shadow-xl flex justify-between items-center z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push(`/admin/dashboard?businessId=${businessId}`)} className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <h1 className="text-xl font-black uppercase tracking-widest">Pantalla de Comandas (KDS)</h1>
            <p className="text-xs text-gray-400 font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> En vivo
            </p>
          </div>
        </div>
        <div className="flex gap-4">
           <div className="text-right">
             <p className="text-xs text-gray-400 font-bold">Total Pendientes</p>
             <p className="text-2xl font-black">{orders.length}</p>
           </div>
        </div>
      </header>

      {/* TABLERO KANBAN HÍBRIDO */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 p-6 overflow-hidden">
        
        {/* COLUMNA 1: NUEVOS (Rojo) */}
        <div className="flex flex-col h-full bg-gray-200/50 rounded-2xl p-4 overflow-hidden border border-gray-300">
          <h2 className="text-lg font-black text-gray-800 mb-4 flex justify-between items-center">
            NUEVOS RECIBIDOS <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm">{newOrders.length}</span>
          </h2>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-20">
            {newOrders.map(order => (
              <div key={order.id} className={`p-5 rounded-2xl border-2 shadow-sm flex flex-col ${getStatusColor(order.status)}`}>
                <div className="flex justify-between items-start mb-3 border-b border-red-200/50 pb-2">
                  <div>
                    <h3 className="font-black text-lg">{order.customerName}</h3>
                    <p className="text-xs font-bold uppercase tracking-wider opacity-70">
                      Pago: {order.paymentMethod}
                    </p>
                  </div>
                  <span className="text-sm font-black">${order.total}</span>
                </div>
                <ul className="space-y-2 mb-4 flex-1">
                  {order.items.map((item, idx) => (
                    <li key={idx} className="font-bold text-sm flex justify-between">
                      <span>{item.quantity}x {item.name}</span>
                    </li>
                  ))}
                </ul>
                <button 
                  onClick={() => updateOrderStatus(order.id, "preparando")}
                  className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl shadow-lg transition-transform active:scale-95 text-lg"
                >
                  Cocinar (Mover) &rarr;
                </button>
              </div>
            ))}
            {newOrders.length === 0 && <div className="text-center text-gray-400 font-bold mt-10">Esperando pedidos...</div>}
          </div>
        </div>

        {/* COLUMNA 2: PREPARANDO (Amarillo) */}
        <div className="flex flex-col h-full bg-gray-200/50 rounded-2xl p-4 overflow-hidden border border-gray-300">
          <h2 className="text-lg font-black text-gray-800 mb-4 flex justify-between items-center">
            EN PREPARACIÓN <span className="bg-yellow-500 text-white px-3 py-1 rounded-full text-sm">{prepOrders.length}</span>
          </h2>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-20">
            {prepOrders.map(order => (
              <div key={order.id} className={`p-5 rounded-2xl border-2 shadow-sm flex flex-col ${getStatusColor(order.status)}`}>
                <div className="flex justify-between items-start mb-3 border-b border-yellow-200/50 pb-2">
                  <h3 className="font-black text-lg">{order.customerName}</h3>
                </div>
                <ul className="space-y-2 mb-4 flex-1">
                  {order.items.map((item, idx) => (
                    <li key={idx} className="font-bold text-sm flex justify-between">
                      <span>{item.quantity}x {item.name}</span>
                    </li>
                  ))}
                </ul>
                <button 
                  onClick={() => updateOrderStatus(order.id, "listo")}
                  className="w-full py-4 bg-yellow-500 hover:bg-yellow-600 text-white font-black rounded-xl shadow-lg transition-transform active:scale-95 text-lg"
                >
                  Marcar Listo &rarr;
                </button>
              </div>
            ))}
            {prepOrders.length === 0 && <div className="text-center text-gray-400 font-bold mt-10">Cocina limpia</div>}
          </div>
        </div>

        {/* COLUMNA 3: LISTOS PARA ENTREGA (Verde) */}
        <div className="flex flex-col h-full bg-gray-200/50 rounded-2xl p-4 overflow-hidden border border-gray-300">
          <h2 className="text-lg font-black text-gray-800 mb-4 flex justify-between items-center">
            LISTOS PARA ENTREGAR <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm">{readyOrders.length}</span>
          </h2>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-20">
            {readyOrders.map(order => (
              <div key={order.id} className={`p-5 rounded-2xl border-2 shadow-sm flex flex-col ${getStatusColor(order.status)}`}>
                <div className="flex justify-between items-start mb-3 border-b border-green-200/50 pb-2">
                  <div>
                    <h3 className="font-black text-lg">{order.customerName}</h3>
                    {order.customerPhone && <p className="text-xs font-bold text-green-700">ID: {order.customerPhone}</p>}
                  </div>
                </div>
                <div className="flex-1 mb-4">
                   <p className="text-sm font-bold text-green-800">Llamar al cliente y entregar pedido.</p>
                </div>
                <button 
                  onClick={() => updateOrderStatus(order.id, "entregado")}
                  className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-black rounded-xl shadow-lg transition-transform active:scale-95 text-lg border-2 border-green-800"
                >
                  Entregado (Finalizar) &#10003;
                </button>
              </div>
            ))}
            {readyOrders.length === 0 && <div className="text-center text-gray-400 font-bold mt-10">Sin entregas pendientes</div>}
          </div>
        </div>

      </div>
    </div>
  );
}