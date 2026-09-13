"use client";

import { useState, useEffect, use, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, Bot, Utensils, ShoppingBag, ImageIcon, ShoppingCart, Plus, Minus, Trash2, CreditCard, MessageCircle, Loader2 } from "lucide-react";
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

// Interfaz extendida para el carrito
interface CartItem extends CatalogItem {
  quantity: number;
}

export default function PublicMenuPage({ params }: { params: Promise<{ businessId: string }> }) {
  const resolvedParams = use(params);
  const businessId = resolvedParams.businessId;

  const [businessData, setBusinessData] = useState<any>(null);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // 🛒 ESTADOS DEL CARRITO Y PAGOS
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState<"online" | "terminal" | null>(null);

  // Estados del Chatbot de Ventas (IA de OpenAI)
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
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
          const menuRef = doc(db, "menus", businessId);
          const menuSnap = await getDoc(menuRef);
          
          if (menuSnap.exists() && menuSnap.data().catalog) {
            rawItems = menuSnap.data().catalog;
          } else if (data.catalog) {
            rawItems = data.catalog;
          } else if (data.products) {
            rawItems = data.products;
          }

          let flatItems: CatalogItem[] = [];
          rawItems.forEach((element: any) => {
            if (element.items && Array.isArray(element.items)) {
              element.items.forEach((subItem: any) => {
                if (subItem.name && subItem.name.trim() !== "") {
                  flatItems.push({ 
                    ...subItem, 
                    category: element.category || "General",
                    price: Number(subItem.price) || 0
                  });
                }
              });
            } else if (element.name && element.name.trim() !== "") {
              flatItems.push({
                ...element,
                price: Number(element.price) || 0
              });
            }
          });

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

  // 🛒 LÓGICA DEL CARRITO TIER 1
  const addToCart = (item: CatalogItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQ = item.quantity + delta;
        return newQ > 0 ? { ...item, quantity: newQ } : item;
      }
      return item;
    }).filter(item => item.quantity > 0)); // Auto-limpia si llega a 0
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const getCartTotal = () => cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  const getCartCount = () => cart.reduce((count, item) => count + item.quantity, 0);

  // 🚀 CHECKOUT MULTICANAL TIER 1
  const handleWhatsAppCheckout = () => {
    const text = `¡Hola! Quiero hacer un pedido de tu catálogo digital:\n\n${cart.map(item => `▪ ${item.quantity}x ${item.name} - $${(item.price * item.quantity).toFixed(2)}`).join('\n')}\n\n*Total a pagar: $${getCartTotal().toFixed(2)}*`;
    const phone = businessData?.phone || businessData?.originalPhone || "";
    const url = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Checkout Web (Mercado Pago SDK)
  const handleOnlineCheckout = async () => {
    setIsProcessing("online");
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, cart, method: 'online' })
      });
      const data = await res.json();
      
      if (data.init_point) {
        // Redirección segura a la pasarela de pago del cliente
        window.location.href = data.init_point;
      } else {
        alert(data.error || "Ocurrió un error al generar el cobro.");
        setIsProcessing(null);
      }
    } catch (error) {
      alert("Error de red. Verifica tu conexión e intenta de nuevo.");
      setIsProcessing(null);
    }
  };

  // Checkout Point API (Despierta la Terminal Física)
  const handleTerminalCheckout = async () => {
    setIsProcessing("terminal");
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, cart, method: 'terminal' })
      });
      const data = await res.json();
      
      if (data.success) {
        alert("¡Terminal activada exitosamente! Acerque su tarjeta o dispositivo al lector físico.");
        setCart([]); // Vaciamos el carrito tras mandar la orden exitosamente
        setIsCartOpen(false);
      } else {
        alert(data.error || "La terminal está apagada o no configurada.");
      }
    } catch (error) {
      alert("Error de red al intentar conectar con la terminal.");
    } finally {
      setIsProcessing(null);
    }
  };

  // Lógica del Chat de Ventas
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setChatInput("");
    setIsTyping(true);

    try {
      const catalogContext = catalogItems.length > 0 
        ? catalogItems.map(item => `- ${item.name}: $${item.price} ${item.description ? `(${item.description})` : ''}`).join('\n')
        : "El catálogo está vacío en este momento.";

      const dynamicSystemPrompt = `${businessData?.aiPromptContext || "Eres un mesero y vendedor experto."}\n\n=== MENÚ / CATÁLOGO DISPONIBLE ===\n${catalogContext}\n====================================\nUsa esta información para recomendar y responder dudas precisas sobre los productos y precios.`;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: userMsg }],
          systemPrompt: dynamicSystemPrompt 
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
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] font-sans relative overflow-hidden pb-32">
      
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
            <div className="w-28 h-28 mx-auto rounded-full bg-white/5 p-1 backdrop-blur-md border border-white/20 shadow-[0_0_30px_rgba(0,0,0,0.3)] flex items-center justify-center overflow-hidden">
              <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center">
                <img src={businessData.brandSettings.logoUrl} alt="Logo" className="w-full h-full object-contain" />
              </div>
            </div>
          ) : (
            <div className="w-28 h-28 mx-auto rounded-full bg-[#27272A] flex items-center justify-center border border-white/10 shadow-2xl">
              {businessType === 'gastronomia' ? <Utensils className="w-10 h-10 text-[#A1A1AA]" /> : <ShoppingBag className="w-10 h-10 text-[#A1A1AA]" />}
            </div>
          )}
          <h1 className="text-4xl font-black tracking-tight text-white">{bName}</h1>
          <p className="text-sm text-[#A1A1AA] max-w-md mx-auto">
            {businessType === 'gastronomia' ? 'Explora nuestro menú y ordena ahora.' : 'Descubre nuestro catálogo y compra en línea.'}
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
                className={`bg-[#18181B]/90 backdrop-blur-md border border-[#27272A] hover:border-white/20 transition-colors shadow-lg overflow-hidden group flex flex-col ${
                  businessType === 'retail' 
                    ? 'rounded-[24px]' 
                    : 'md:flex-row items-center p-4 rounded-[28px] gap-4'
                }`}
              >
                {/* Imagen */}
                <div className={`${
                  businessType === 'retail' 
                    ? 'w-full aspect-square bg-[#27272A]' 
                    : 'w-full md:w-28 aspect-square md:h-28 shrink-0 bg-[#27272A] rounded-2xl mb-4 md:mb-0'
                } relative overflow-hidden flex items-center justify-center`}>
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-[#A1A1AA]/50" />
                  )}
                </div>

                {/* Contenido e Inyección del Botón Agregar */}
                <div className={`${businessType === 'retail' ? 'p-5 flex flex-col flex-1' : 'flex-1 py-1 w-full flex flex-col h-full'}`}>
                  <h3 className="text-base font-bold text-white leading-tight">{item.name}</h3>
                  <p className={`text-[#A1A1AA] text-xs mt-1.5 leading-relaxed flex-1 ${businessType === 'retail' ? 'line-clamp-2' : 'line-clamp-2'}`}>
                    {item.description}
                  </p>
                  
                  <div className={`mt-4 flex items-center justify-between gap-3 ${businessType === 'retail' ? 'pt-3 border-t border-[#27272A]' : 'mt-auto'}`}>
                    <span className="font-mono font-black text-lg text-white tracking-tight">
                      ${(Number(item.price) || 0).toFixed(2)}
                    </span>
                    <button 
                      onClick={() => addToCart(item)}
                      style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
                      className="px-4 py-2 rounded-xl text-xs font-bold hover:bg-opacity-30 transition-all flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Agregar
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* --- 🛒 BURBUJA FLOTANTE DEL CARRITO (Estilo Uber Eats) --- */}
      <AnimatePresence>
        {getCartCount() > 0 && !isCartOpen && (
          <motion.button
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            onClick={() => setIsCartOpen(true)}
            style={{ backgroundColor: primaryColor }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 px-6 py-4 rounded-full text-white font-black shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex items-center gap-4 hover:scale-105 transition-transform"
          >
            <div className="flex items-center justify-center bg-white/20 w-7 h-7 rounded-full text-sm">
              {getCartCount()}
            </div>
            <span>Ver Pedido</span>
            <span className="font-mono bg-black/20 px-2.5 py-1 rounded-lg ml-2">
              ${getCartTotal().toFixed(2)}
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* --- 🛒 MODAL DE CHECKOUT (Slide Over) --- */}
      <AnimatePresence>
        {isCartOpen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex justify-end"
          >
            <motion.div 
              initial={{ x: "100%" }} 
              animate={{ x: 0 }} 
              exit={{ x: "100%" }} 
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-md bg-[#18181B] h-full shadow-2xl flex flex-col border-l border-[#27272A]"
            >
              <div className="p-6 border-b border-[#27272A] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShoppingCart className="w-6 h-6 text-white" />
                  <h2 className="text-xl font-black text-white">Tu Pedido</h2>
                </div>
                <button onClick={() => setIsCartOpen(false)} className="p-2 bg-[#27272A] text-white rounded-full hover:bg-white/10 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#09090B]">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-[#A1A1AA] opacity-50">
                    <ShoppingCart className="w-16 h-16 mb-4" />
                    <p>Tu carrito está vacío</p>
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.id} className="bg-[#18181B] border border-[#27272A] p-4 rounded-2xl flex items-center gap-4">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-16 h-16 rounded-xl object-cover" />
                      ) : (
                        <div className="w-16 h-16 bg-[#27272A] rounded-xl flex items-center justify-center"><ImageIcon className="w-6 h-6 text-[#A1A1AA]" /></div>
                      )}
                      
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-white leading-tight">{item.name}</h4>
                        <p className="font-mono text-[#A1A1AA] text-xs mt-1">${item.price.toFixed(2)}</p>
                        
                        <div className="flex items-center gap-3 mt-3">
                          <div className="flex items-center bg-[#27272A] rounded-lg">
                            <button onClick={() => updateQuantity(item.id, -1)} className="p-1.5 text-white hover:text-red-400"><Minus className="w-3.5 h-3.5" /></button>
                            <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, 1)} className="p-1.5 text-white" style={{ color: primaryColor }}><Plus className="w-3.5 h-3.5" /></button>
                          </div>
                          <button onClick={() => removeFromCart(item.id)} className="p-1.5 text-[#A1A1AA] hover:text-red-500 ml-auto transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-6 bg-[#18181B] border-t border-[#27272A] space-y-4">
                  <div className="flex items-center justify-between text-lg font-black text-white mb-2">
                    <span>Total a pagar:</span>
                    <span className="font-mono">${getCartTotal().toFixed(2)}</span>
                  </div>
                  
                  <div className="space-y-3">
                    <button 
                      onClick={handleWhatsAppCheckout}
                      disabled={!!isProcessing}
                      className="w-full py-3.5 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-colors shadow-[0_0_15px_rgba(37,211,102,0.2)] disabled:opacity-50"
                    >
                      <MessageCircle className="w-5 h-5" /> Enviar por WhatsApp
                    </button>
                    
                    <button 
                      onClick={handleOnlineCheckout}
                      disabled={!!isProcessing}
                      style={{ backgroundColor: primaryColor }}
                      className="w-full py-3.5 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-[0_0_15px_rgba(0,158,227,0.3)] disabled:opacity-50"
                    >
                      {isProcessing === "online" ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
                      {isProcessing === "online" ? "Procesando cobro..." : "Pagar en Línea Seguro"}
                    </button>

                    <button 
                      onClick={handleTerminalCheckout}
                      disabled={!!isProcessing}
                      className="w-full py-3.5 bg-[#27272A] text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-[#3f3f46] transition-colors disabled:opacity-50"
                    >
                      {isProcessing === "terminal" ? <Loader2 className="w-5 h-5 animate-spin" /> : <Utensils className="w-5 h-5" />}
                      {isProcessing === "terminal" ? "Despertando terminal..." : "Mandar Cobro a Terminal"}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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