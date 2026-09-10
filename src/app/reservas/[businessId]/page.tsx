"use client";

import { useState, useEffect, use, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Phone, CheckCircle2, Scissors, MessageSquare, X, Send, Bot, Utensils, ShoppingBag, Briefcase, ChevronDown } from "lucide-react";
import { doc, getDoc, collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function PublicBookingPage({ params }: { params: Promise<{ businessId: string }> }) {
  const resolvedParams = use(params);
  const businessId = resolvedParams.businessId;

  const [businessData, setBusinessData] = useState<any>(null);
  const [catalogServices, setCatalogServices] = useState<string[]>([]);
  
  const [clientName, setClientName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [customService, setCustomService] = useState(""); // Para cuando eligen "Otro"
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Estados del Chatbot
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Consultar el negocio y su catálogo
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Obtener Info del Negocio
        const docRef = doc(db, "businesses", businessId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setBusinessData(data);
          setMessages([{ role: "assistant", content: `¡Hola! Soy el asistente virtual de ${data.businessName}. ¿En qué te puedo ayudar hoy?` }]);
          
          // 2. Obtener Catálogo para rellenar opciones dinámicamente
          const menuRef = doc(db, "menus", businessId);
          const menuSnap = await getDoc(menuRef);
          
          let fetchedServices: string[] = [];
          if (menuSnap.exists() && menuSnap.data().catalog && menuSnap.data().catalog.length > 0) {
            fetchedServices = menuSnap.data().catalog.map((item: any) => item.name);
          }
          
          setCatalogServices(fetchedServices);

          // 3. Auto-seleccionar la primera opción disponible
          if (fetchedServices.length > 0) {
            setServiceName(fetchedServices[0]);
          } else {
            // Si no hay catálogo, ponemos el Smart Default según el giro
            const tipo = data.businessType;
            if (tipo === 'gastronomia') setServiceName("Mesa en Interior");
            else if (tipo === 'retail') setServiceName("Asesoría en Tienda");
            else setServiceName("Servicio General / Asesoría");
          }
        }
      } catch (error) {
        console.error("Error obteniendo datos del negocio:", error);
      } finally {
        setLoading(false);
      }
    };
    if (businessId) fetchData();
  }, [businessId]);

  // Auto-scroll del chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalService = serviceName === "Otro (Especificar)" ? customService : serviceName;
    
    if (!clientName || !phone || !date || !time || !finalService) return alert("Por favor, completa todos los campos.");
    
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "appointments"), {
        businessId, 
        clientName, 
        phone, 
        serviceName: finalService, 
        date, 
        time, 
        status: "pending", 
        createdAt: new Date().toISOString()
      });
      setSuccess(true);
    } catch (error) {
      alert("Error al agendar. Intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setChatInput("");
    setIsTyping(true);

    // INYECCIÓN TIER 1: Combinamos las instrucciones del dueño con el catálogo real
    const catalogContext = catalogServices.length > 0 
      ? `\n\nIMPORTANTE - Este es nuestro catálogo/menú actual: ${catalogServices.join(', ')}. Solo ofrece estos servicios o productos.` 
      : "";
    const fullPrompt = (businessData?.aiPromptContext || "Eres un asistente virtual amable.") + catalogContext;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: userMsg }],
          systemPrompt: fullPrompt // Pasamos el prompt enriquecido con el catálogo
        })
      });
      const data = await res.json();
      if (data.reply) {
        setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: "assistant", content: "Lo siento, tuve un error de conexión." }]);
    } finally {
      setIsTyping(false);
    }
  };
  const bName = businessData?.businessName || "Cargando...";
  const bgImage = businessData?.brandSettings?.backgroundUrl || "";
  const primaryColor = businessData?.brandSettings?.primaryColor || "#009EE3";
  const bType = businessData?.businessType || "servicios";

  // Generador de Opciones Dinámicas
  const getServiceOptions = () => {
    let options = [];
    if (catalogServices.length > 0) {
      options = [...catalogServices];
    } else {
      if (bType === 'gastronomia') options = ['Mesa en Interior', 'Mesa en Terraza', 'Evento Privado / Grupo'];
      else if (bType === 'retail') options = ['Asesoría en Tienda', 'Recolección de Pedido', 'Soporte / Devolución'];
      else options = ['Servicio General / Asesoría', 'Cotización de Proyecto', 'Revisión Técnica']; // Servicios genéricos
    }
    options.push("Otro (Especificar)");
    return options;
  };

  // Ícono Dinámico según el Giro
  const renderServiceIcon = () => {
    if (bType === 'gastronomia') return <Utensils className="absolute left-4 top-3.5 w-5 h-5 text-[#A1A1AA]" />;
    if (bType === 'retail') return <ShoppingBag className="absolute left-4 top-3.5 w-5 h-5 text-[#A1A1AA]" />;
    if (bName.toLowerCase().includes('barber') || bName.toLowerCase().includes('salon')) return <Scissors className="absolute left-4 top-3.5 w-5 h-5 text-[#A1A1AA]" />;
    return <Briefcase className="absolute left-4 top-3.5 w-5 h-5 text-[#A1A1AA]" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#27272A] border-t-[#009EE3] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#09090B] text-white flex items-center justify-center p-6 font-sans relative">
        <div className="absolute inset-0 bg-gradient-to-br from-[#09090B] to-[#18181B] -z-10" />
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#18181B]/80 backdrop-blur-xl border border-white/10 p-10 rounded-[32px] max-w-md w-full text-center space-y-4 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">¡Solicitud Registrada!</h2>
          <p className="text-sm text-[#A1A1AA] leading-relaxed">
            Tu reserva ha sido enviada a <strong className="text-white">{bName}</strong>. Te contactarán o aprobarán la cita en breve.
          </p>
          <button onClick={() => setSuccess(false)} className="w-full mt-6 py-4 bg-white text-black font-bold rounded-2xl hover:bg-gray-200 transition-colors">
            Generar nueva reserva
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] font-sans p-6 flex flex-col justify-center items-center relative overflow-hidden">
      
      {/* Fondo Dinámico con Parallax sutil */}
      {bgImage && (
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
          <img src={bgImage} alt="Fondo" className="w-full h-full object-cover blur-sm" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#09090B]/50 to-[#09090B] block" />
        </div>
      )}

      <div className="w-full max-w-md space-y-6 relative z-10 pb-20">
        <div className="text-center space-y-3">
          {businessData?.brandSettings?.logoUrl ? (
            <img src={businessData.brandSettings.logoUrl} alt="Logo" className="w-24 h-24 object-contain mx-auto mb-2 rounded-2xl bg-white/5 p-2 backdrop-blur-md border border-white/10 shadow-xl" />
          ) : (
            <div className="w-24 h-24 mx-auto mb-2 rounded-2xl bg-[#18181B] flex items-center justify-center border border-white/10 shadow-xl">
              {renderServiceIcon()}
            </div>
          )}
          <h1 className="text-3xl font-black tracking-tight text-white leading-tight">{bName}</h1>
          <p className="text-xs text-[#A1A1AA] font-medium uppercase tracking-widest">
            {bType === 'gastronomia' ? 'Reserva tu mesa' : 'Portal de Reservas Online'}
          </p>
        </div>

        <form onSubmit={handleBooking} className="bg-[#18181B]/80 backdrop-blur-xl border border-white/10 rounded-[32px] p-8 space-y-5 shadow-2xl">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider">Tu Nombre Completo</label>
            <div className="relative">
              <User className="absolute left-4 top-3.5 w-5 h-5 text-[#A1A1AA]" />
              <input type="text" required value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Ej. Carlos Santana" className="w-full bg-[#27272A]/50 border border-[#27272A] rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white outline-none focus:border-[#009EE3] transition-colors" />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider">Teléfono / WhatsApp</label>
            <div className="relative">
              <Phone className="absolute left-4 top-3.5 w-5 h-5 text-[#A1A1AA]" />
              <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ej. 3312345678" className="w-full bg-[#27272A]/50 border border-[#27272A] rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white outline-none focus:border-[#009EE3] transition-colors" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider">Servicio / Motivo de Reserva</label>
            <div className="relative">
              {renderServiceIcon()}
              <select 
                value={serviceName} 
                onChange={(e) => {
                  setServiceName(e.target.value);
                  if (e.target.value !== "Otro (Especificar)") setCustomService("");
                }} 
                className="w-full bg-[#27272A]/50 border border-[#27272A] rounded-2xl py-3.5 pl-12 pr-10 text-sm text-white outline-none focus:border-[#009EE3] cursor-pointer appearance-none transition-colors"
              >
                {getServiceOptions().map((opt, idx) => (
                  <option key={idx} value={opt} className="bg-[#18181B]">{opt}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-4 w-4 h-4 text-[#A1A1AA] pointer-events-none" />
            </div>
          </div>

          {/* Campo expansible si elige "Otro" */}
          <AnimatePresence>
            {serviceName === "Otro (Especificar)" && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2 overflow-hidden">
                <label className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider">Especifica tu solicitud</label>
                <input 
                  type="text" 
                  required 
                  value={customService} 
                  onChange={(e) => setCustomService(e.target.value)} 
                  placeholder="Escribe lo que necesitas..." 
                  className="w-full bg-[#27272A]/50 border border-[#27272A] rounded-2xl py-3.5 px-4 text-sm text-white outline-none focus:border-[#009EE3] transition-colors" 
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-2 gap-4 pt-1">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider">Fecha</label>
              <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-[#27272A]/50 border border-[#27272A] rounded-2xl py-3.5 px-4 text-sm text-white outline-none focus:border-[#009EE3] transition-colors cursor-pointer" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider">Hora</label>
              <input type="time" required value={time} onChange={(e) => setTime(e.target.value)} className="w-full bg-[#27272A]/50 border border-[#27272A] rounded-2xl py-3.5 px-4 text-sm text-white outline-none focus:border-[#009EE3] transition-colors cursor-pointer" />
            </div>
          </div>

          <button type="submit" disabled={isSubmitting} style={{ backgroundColor: primaryColor }} className="w-full mt-6 py-4 text-white font-black rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.2)] hover:opacity-90 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 text-base">
            {isSubmitting ? "Procesando..." : "Confirmar Cita"}
          </button>
        </form>
      </div>

      {/* --- WIDGET FLOTANTE CHATBOT IA --- */}
      <div className="fixed bottom-6 right-6 z-50">
        <AnimatePresence>
          {isChatOpen && (
            <motion.div initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.9 }} className="absolute bottom-16 right-0 w-[320px] h-[450px] bg-[#18181B] border border-[#27272A] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
              <div style={{ backgroundColor: primaryColor }} className="px-4 py-3 flex justify-between items-center shadow-md z-10">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-white" />
                  <span className="font-bold text-white text-sm">Asistente Virtual</span>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="text-white hover:bg-white/20 p-1 rounded-full transition-colors"><X className="w-4 h-4" /></button>
              </div>
              
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#09090B]">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-[#27272A] text-white rounded-br-none' : 'text-white rounded-bl-none'} shadow-sm`} style={msg.role !== 'user' ? { backgroundColor: primaryColor } : {}}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div style={{ backgroundColor: primaryColor }} className="p-3 rounded-2xl text-white rounded-bl-none animate-pulse text-xs font-medium">Escribiendo...</div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="p-3 bg-[#18181B] border-t border-[#27272A] flex gap-2">
                <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Escribe tu duda..." className="flex-1 bg-[#27272A] text-white text-sm rounded-xl px-4 py-2.5 outline-none focus:ring-1 focus:ring-white/20 transition-all" />
                <button type="submit" disabled={isTyping} style={{ backgroundColor: primaryColor }} className="p-2.5 rounded-xl text-white hover:opacity-90 disabled:opacity-50 flex items-center justify-center transition-opacity">
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <button onClick={() => setIsChatOpen(!isChatOpen)} style={{ backgroundColor: primaryColor }} className="w-14 h-14 rounded-full flex items-center justify-center text-white shadow-[0_0_25px_rgba(0,0,0,0.4)] hover:scale-105 active:scale-95 transition-all relative">
          {isChatOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
          {!isChatOpen && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-[#09090B] animate-pulse"></span>}
        </button>
      </div>

    </div>
  );
}