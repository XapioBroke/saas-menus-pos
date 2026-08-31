"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useParams } from "next/navigation";
import { QRCodeCanvas } from 'qrcode.react';

// ==========================================
// 1. COMPONENTE DEL BOT (Sin cambios)
// ==========================================
function ChatWidget({ businessName, menuCatalog }: { businessName: string, menuCatalog: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant", content: string }[]>([
    { role: "assistant", content: `¡Hola! Soy el asistente virtual de ${businessName}. ¿Qué se te antoja hoy?` }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMessage = input.trim();
    
    const newMessages = [...messages, { role: "user" as const, content: userMessage }];
    setMessages(newMessages);
    setInput("");
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          businessName,
          menuCatalog
        })
      });

      if (!response.ok) throw new Error("Falla en la red");
      
      const data = await response.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: "assistant", content: "Lo siento, tuve un problema de conexión. ¿Puedes repetirlo?" }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div id="BOT-CONTAINER" style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 999999 }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{ backgroundColor: '#2563EB', width: '56px', height: '56px', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}
        className="hover:scale-105 transition-transform"
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        ) : (
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
        )}
      </button>

      {isOpen && (
        <div style={{ position: 'absolute', bottom: '80px', right: '0', width: '350px', backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}>
          <div style={{ backgroundColor: '#2563EB', padding: '16px', color: 'white' }}>
            <h3 style={{ fontWeight: 'bold', margin: 0 }}>Asistente Virtual</h3>
            <p style={{ fontSize: '12px', color: '#DBEAFE', margin: 0 }}>Responde al instante</p>
          </div>

          <div style={{ height: '320px', padding: '16px', overflowY: 'auto', backgroundColor: '#F9FAFB', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.map((msg, idx) => (
              <div key={idx} style={{ maxWidth: '80%', padding: '8px 16px', borderRadius: '16px', fontSize: '14px', alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', backgroundColor: msg.role === 'user' ? '#2563EB' : 'white', color: msg.role === 'user' ? 'white' : '#1F2937', border: msg.role === 'user' ? 'none' : '1px solid #E5E7EB', borderBottomRightRadius: msg.role === 'user' ? '0' : '16px', borderBottomLeftRadius: msg.role === 'user' ? '16px' : '0' }}>
                {msg.content}
              </div>
            ))}
            {isTyping && (
              <div style={{ maxWidth: '80%', padding: '8px 16px', borderRadius: '16px', fontSize: '14px', alignSelf: 'flex-start', backgroundColor: 'white', color: '#6B7280', border: '1px solid #E5E7EB', borderBottomLeftRadius: '0' }}>
                <span className="animate-pulse">Escribiendo...</span>
              </div>
            )}
          </div>

          <div style={{ padding: '12px', backgroundColor: 'white', borderTop: '1px solid #E5E7EB', display: 'flex', gap: '8px' }}>
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Pregunta por un platillo..." 
              style={{ flex: 1, backgroundColor: '#F3F4F6', color: '#1F2937', borderRadius: '9999px', padding: '8px 16px', fontSize: '14px', border: 'none', outline: 'none' }}
            />
            <button 
              onClick={sendMessage}
              style={{ backgroundColor: '#2563EB', color: 'white', borderRadius: '9999px', padding: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 2. COMPONENTE PRINCIPAL Y MEMBRESÍA
// ==========================================
export default function BusinessMenu() {
  const params = useParams();
  const businessId = params.businessId as string;

  // Estados del Menú
  const [businessData, setBusinessData] = useState<any>(null);
  const [menuCatalog, setMenuCatalog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de Membresía (Nuevo)
  const [showMembership, setShowMembership] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [loyaltyToken, setLoyaltyToken] = useState(""); // Aquí guardaremos el ID único del cliente
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!businessId) return;

    const fetchData = async () => {
      try {
        const businessRef = doc(db, "businesses", businessId);
        const menuRef = doc(db, "menus", businessId);

        const [businessSnap, menuSnap] = await Promise.all([
          getDoc(businessRef),
          getDoc(menuRef)
        ]);

        if (businessSnap.exists()) {
          setBusinessData(businessSnap.data());
        }

        if (menuSnap.exists() && menuSnap.data().catalog) {
          setMenuCatalog(menuSnap.data().catalog);
        }
      } catch (error) {
        console.error("Error al conectar con Firestore:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [businessId]);

  // Función para registrar al cliente en Firebase
  const handleJoinClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone) return;

    setJoining(true);
    try {
      // Creamos un nuevo documento en la colección 'customers'
      const docRef = await addDoc(collection(db, "customers"), {
        businessId: businessId,
        name: customerName,
        phone: customerPhone,
        points: 0, // Inician con 0 puntos
        joinedAt: new Date().toISOString()
      });
      
      // El ID de este documento será su código QR único
      setLoyaltyToken(docRef.id);
    } catch (error) {
      console.error("Error al generar membresía:", error);
    } finally {
      setJoining(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 font-medium">Cargando ecosistema...</div>;
  if (!businessData) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-red-500 font-bold">Establecimiento no encontrado.</div>;

  return (
    <>
      <main className="min-h-screen bg-gray-50 pb-20 relative">
        <header className="bg-white shadow-sm sticky top-0 z-10 border-b border-gray-200">
          <div className="max-w-2xl mx-auto px-4 py-6 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{businessData.businessName}</h1>
              <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">Menú Digital</p>
            </div>
            
            {/* BOTÓN PARA ABRIR LA BILLETERA DIGITAL */}
            <button 
              onClick={() => setShowMembership(true)}
              className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-md hover:bg-gray-800 transition-colors"
            >
              Mi Membresía
            </button>
          </div>
        </header>

        {/* LISTADO DE PRODUCTOS */}
        <div className="max-w-2xl mx-auto px-4 mt-6 space-y-8">
          {menuCatalog.map((section, index) => (
            <section key={index}>
              <h2 className="text-xl font-bold text-gray-800 border-b-2 border-blue-600 pb-2 mb-4 inline-block">
                {section.category}
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {section.items.map((item: any) => (
                  <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-start gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">{item.name}</h3>
                      <p className="text-sm text-gray-500 mt-1 leading-relaxed">{item.description}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-gray-900">${item.price}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>

      {/* MODAL DE MEMBRESÍA Y BILLETERA DIGITAL */}
      {showMembership && (
        <div className="fixed inset-0 bg-black/60 z-[99999] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl relative">
            <button 
              onClick={() => setShowMembership(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            {!loyaltyToken ? (
              // VISTA 1: FORMULARIO DE REGISTRO
              <div className="text-center">
                <h3 className="text-xl font-extrabold text-gray-900 mb-2">Únete al Club VIP</h3>
                <p className="text-sm text-gray-500 mb-6">Regístrate para acumular puntos y recibir recompensas exclusivas en {businessData.businessName}.</p>
                
                <form onSubmit={handleJoinClub} className="space-y-4 text-left">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Tu Nombre</label>
                    <input 
                      type="text" required
                      value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="Ej. Juan Pérez"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Teléfono o WhatsApp</label>
                    <input 
                      type="tel" required
                      value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="Ej. 55 1234 5678"
                    />
                  </div>
                  <button 
                    type="submit" disabled={joining}
                    className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl mt-2 hover:bg-gray-800 disabled:opacity-50"
                  >
                    {joining ? "Generando credencial..." : "Obtener mi QR de Socio"}
                  </button>
                </form>
              </div>
            ) : (
              // VISTA 2: LA BILLETERA (EL QR GENERADO)
              <div className="text-center flex flex-col items-center">
                <div className="bg-green-100 text-green-700 p-3 rounded-full mb-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h3 className="text-xl font-extrabold text-gray-900 mb-1">¡Bienvenido al Club!</h3>
                <p className="text-sm text-gray-500 mb-6">Muestra este código al pagar para acumular o canjear tus puntos.</p>
                
                <div className="bg-white p-4 border-2 border-gray-100 rounded-2xl shadow-inner mb-4 inline-block">
                  <QRCodeCanvas 
                    value={loyaltyToken} // Este es el Token ID que leerá tu terminal de cobro
                    size={200}
                    level={"H"}
                  />
                </div>
                <p className="text-xs text-gray-400 font-mono break-all">{loyaltyToken}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Renderizado inquebrantable del Bot */}
      <ChatWidget businessName={businessData.businessName} menuCatalog={menuCatalog} />
    </>
  );
}