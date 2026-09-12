"use client";

import { useState, useEffect, use, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, Bot, Utensils, ShoppingBag, ImageIcon } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface CatalogItem {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  category?: string;
}

export default function PublicMenuPage({ params }: { params: Promise<{ businessId: string }> }) {
  const resolvedParams = use(params);
  const businessId = resolvedParams.businessId;

  const [businessData, setBusinessData] = useState<any>(null);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Estados del Chatbot de Ventas (IA de OpenAI)
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Cargar configuración visual del negocio
        const bizRef = doc(db, "businesses", businessId);
        const bizSnap = await getDoc(bizRef);
        
        if (bizSnap.exists()) {
          const data = bizSnap.data();
          setBusinessData(data);
          setMessages([{ 
            role: "assistant", 
            content: `¡Hola! Soy el asistente virtual de ${data.businessName}. ¿Qué se te antoja hoy o qué buscas?` 
          }]);
          
          let rawItems: any[] = [];

          // Extraer los datos crudos de Firebase (de donde sea que estén)
          const menuRef = doc(db, "menus", businessId);
          const menuSnap = await getDoc(menuRef);
          
          if (menuSnap.exists() && menuSnap.data().catalog) {
            rawItems = menuSnap.data().catalog;
          } else if (data.catalog) {
            rawItems = data.catalog;
          } else if (data.products) {
            rawItems = data.products;
          }

          // 🧠 EL PARSEADOR UNIVERSAL (TIER 1) 🧠
          // Detecta y adapta automáticamente la estructura de los datos
          let flatItems: CatalogItem[] = [];

          rawItems.forEach((element: any) => {
            if (element.items && Array.isArray(element.items)) {
              // Estructura A: Categorizada (Viene del Onboarding ej. { category: 'Gps', items: [...] })
              element.items.forEach((subItem: any) => {
                if (subItem.name && subItem.name.trim() !== "") {
                  // Inyectamos la categoría al producto para poder usarla en el diseño si queremos
                  flatItems.push({ 
                    ...subItem, 
                    category: element.category || "General",
                    price: Number(subItem.price) || 0 // Blindaje de precio
                  });
                }
              });
            } else if (element.name && element.name.trim() !== "") {
              // Estructura B: Plana (Viene directo del Super Admin)
              flatItems.push({
                ...element,
                price: Number(element.price) || 0 // Blindaje de precio
              });
            }
          });

          // Actualizamos el estado con los productos limpios y procesados
          setCatalogItems(flatItems);

        } else {
          setNotFound(true);
          setLoading(false);
          return;
        }

      } catch (error) {
        console.error("Error cargando plataforma:", error);
      } finally {
        setLoading(false);
      }
    };
    
    if (businessId) fetchData();
  }, [businessId]);

  // Auto-scroll del chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, isChatOpen]);

  // Lógica del Chat de Ventas (Conectado a OpenAI /api/chat)
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setChatInput("");
    setIsTyping(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: userMsg }],
          systemPrompt: businessData?.aiPromptContext || "Eres un mesero y vendedor experto."
        })
      });
      const data = await res.json();
      if (data.reply) {
        setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: "assistant", content: "Lo siento, tuve un error de red." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const bName = businessData?.businessName || "Cargando...";
  const bgImage = businessData?.brandSettings?.backgroundUrl || "";
  const primaryColor = businessData?.brandSettings?.primaryColor || "#009EE3";
  const businessType = businessData?.businessType || "gastronomia";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#27272A] border-t-[#009EE3] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] font-sans relative overflow-hidden pb-24">
      
      {/* Fondo Dinámico con Filtro Oscuro */}
      {bgImage && (
        <div className="fixed inset-0 z-0 opacity-20 pointer-events-none">
          <img src={bgImage} alt="Fondo" className="w-full h-full object-cover blur-md" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#09090B]/50 via-[#09090B]/80 to-[#09090B] block" />
        </div>
      )}

      <div className="max-w-4xl mx-auto relative z-10 px-4 sm:px-6 pt-12">
        {/* Cabecera de Marca */}
        <div className="text-center space-y-4 mb-12">
          {businessData?.brandSettings?.logoUrl ? (
            <img src={businessData.brandSettings.logoUrl} alt="Logo" className="w-24 h-24 object-contain mx-auto rounded-2xl bg-white/5 p-2 backdrop-blur-md border border-white/10 shadow-2xl" />
          ) : (
            <div className="w-24 h-24 mx-auto rounded-2xl bg-[#27272A] flex items-center justify-center border border-white/10 shadow-2xl">
              {businessType === 'gastronomia' ? <Utensils className="w-10 h-10 text-[#A1A1AA]" /> : <ShoppingBag className="w-10 h-10 text-[#A1A1AA]" />}
            </div>
          )}
          <h1 className="text-4xl font-black tracking-tight text-white">{bName}</h1>
          <p className="text-sm text-[#A1A1AA] max-w-md mx-auto">
            {businessType === 'gastronomia' ? 'Explora nuestro menú digital.' : 'Descubre nuestro catálogo de productos.'}
          </p>
        </div>

        {/* Renderizado Dinámico del Catálogo */}
        {catalogItems.length === 0 ? (
          <div className="bg-[#18181B]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-12 text-center shadow-2xl max-w-md mx-auto">
            <Utensils className="w-12 h-12 text-[#A1A1AA] mx-auto opacity-30 mb-4" />
            <p className="text-white font-bold text-lg">Catálogo en construcción</p>
            <p className="text-sm text-[#A1A1AA] mt-2">Estamos preparando cosas increíbles.</p>
          </div>
        ) : (
          <div className={`grid gap-4 ${businessType === 'retail' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-2'}`}>
            {catalogItems.map((item, index) => (
              <motion.div 
                key={item.id || index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-[#18181B]/90 backdrop-blur-md border border-[#27272A] hover:border-white/20 transition-colors shadow-lg overflow-hidden group ${
                  businessType === 'retail' 
                    ? 'flex flex-col rounded-[24px]' // Diseño Tarjeta para Retail
                    : 'flex flex-row items-center p-4 rounded-[28px] gap-4' // Diseño Lista para Gastronomía
                }`}
              >
                {/* Imagen (Diferente layout según el giro) */}
                <div className={`${
                  businessType === 'retail' 
                    ? 'w-full aspect-square bg-[#27272A]' 
                    : 'w-24 h-24 shrink-0 bg-[#27272A] rounded-2xl'
                } relative overflow-hidden flex items-center justify-center`}>
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-[#A1A1AA]/50" />
                  )}
                </div>

                {/* Contenido */}
                <div className={`${businessType === 'retail' ? 'p-5 flex flex-col flex-1' : 'flex-1 py-1'}`}>
                  <h3 className="text-base font-bold text-white leading-tight">{item.name}</h3>
                  <p className={`text-[#A1A1AA] text-xs mt-1.5 leading-relaxed ${businessType === 'retail' ? 'line-clamp-2' : 'line-clamp-2'}`}>
                    {item.description}
                  </p>
                  <div className={`mt-3 font-mono font-bold text-lg text-white ${businessType === 'retail' ? 'mt-auto pt-3 border-t border-[#27272A]' : ''}`}>
                   ${(Number(item.price) || 0).toFixed(2)}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* --- WIDGET FLOTANTE CHATBOT IA (El Vendedor Inteligente) --- */}
      <div className="fixed bottom-6 right-6 z-50">
        <AnimatePresence>
          {isChatOpen && (
            <motion.div initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.9 }} className="absolute bottom-16 right-0 w-[320px] h-[450px] bg-[#18181B] border border-[#27272A] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
              <div style={{ backgroundColor: primaryColor }} className="px-4 py-3 flex justify-between items-center shadow-md">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-white" />
                  <span className="font-bold text-white text-sm">Asistente Virtual</span>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="text-white hover:bg-white/20 p-1 rounded-full"><X className="w-4 h-4" /></button>
              </div>
              
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#09090B]">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-[#27272A] text-white rounded-br-none' : 'text-white rounded-bl-none'} shadow-sm`} style={msg.role !== 'user' ? { backgroundColor: primaryColor } : {}}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div style={{ backgroundColor: primaryColor }} className="p-3 rounded-2xl text-white rounded-bl-none animate-pulse text-xs">Escribiendo...</div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="p-3 bg-[#18181B] border-t border-[#27272A] flex gap-2">
                <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Pregúntame sobre el menú..." className="flex-1 bg-[#27272A] text-white text-sm rounded-xl px-4 py-2.5 outline-none focus:ring-1 focus:ring-white/20" />
                <button type="submit" disabled={isTyping} style={{ backgroundColor: primaryColor }} className="p-2.5 rounded-xl text-white hover:opacity-90 disabled:opacity-50 flex items-center justify-center">
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <button onClick={() => setIsChatOpen(!isChatOpen)} style={{ backgroundColor: primaryColor }} className="w-14 h-14 rounded-full flex items-center justify-center text-white shadow-[0_0_20px_rgba(0,0,0,0.3)] hover:scale-105 transition-transform relative">
          {isChatOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
          {!isChatOpen && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-[#09090B] animate-pulse"></span>}
        </button>
      </div>

    </div>
  );
}