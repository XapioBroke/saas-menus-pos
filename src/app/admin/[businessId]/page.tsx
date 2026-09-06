"use client";

import { useEffect, useState, useRef } from "react";
import { doc, getDoc, setDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useParams } from "next/navigation";

export default function CustomerPublicPortal() {
  const params = useParams();
  const businessId = params.businessId as string;

  const [businessData, setBusinessData] = useState<any>(null);
  const [menuData, setMenuData] = useState<any>(null);
  const [rewardsData, setRewardsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [cart, setCart] = useState<{item: any, quantity: number}[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"efectivo" | "terminal" | "link" | null>(null);
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [isVipOpen, setIsVipOpen] = useState(false);
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerProfile, setCustomerProfile] = useState<any>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping]);

  useEffect(() => {
    const fetchEcosystem = async () => {
      try {
        const docRef = doc(db, "businesses", businessId);
        const snap = await getDoc(docRef);
        if (snap.exists()) setBusinessData(snap.data());

        const menuRef = doc(db, "menus", businessId);
        const menuSnap = await getDoc(menuRef);
        if (menuSnap.exists()) setMenuData(menuSnap.data());

        const rewardsRef = doc(db, "loyalty_programs", businessId);
        const rewardsSnap = await getDoc(rewardsRef);
        if (rewardsSnap.exists() && rewardsSnap.data().rewards) setRewardsData(rewardsSnap.data().rewards);

        const savedPhone = localStorage.getItem(`vip_${businessId}_phone`);
        if (savedPhone) fetchCustomerProfile(savedPhone);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchEcosystem();
  }, [businessId]);

  const fetchCustomerProfile = async (phone: string) => {
    try {
      const snap = await getDoc(doc(db, "businesses", businessId, "customers", phone));
      if (snap.exists()) { setCustomerProfile(snap.data()); setCustomerPhone(phone); }
    } catch (error) {}
  };

  const handleRegisterVip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerPhone || !customerName) return;
    setIsRegistering(true);
    try {
      const cleanPhone = customerPhone.replace(/\D/g, '');
      const customerRef = doc(db, "businesses", businessId, "customers", cleanPhone);
      const snap = await getDoc(customerRef);
      if (snap.exists()) {
        setCustomerProfile(snap.data());
      } else {
        const newProfile = { name: customerName, phone: cleanPhone, points: 0, joinedAt: new Date().toISOString() };
        await setDoc(customerRef, newProfile);
        setCustomerProfile(newProfile);
      }
      localStorage.setItem(`vip_${businessId}_phone`, cleanPhone);
      setCustomerPhone(cleanPhone);
    } catch (error) {} finally { setIsRegistering(false); }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    const userMsg = inputMessage.trim();
    const newMessages = [...messages, { role: "user", content: userMsg }];
    setMessages(newMessages);
    setInputMessage("");
    setIsTyping(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, businessName: businessData.businessName, menuCatalog: menuData.catalog, aiPrompt: businessData.aiPromptContext })
      });
      if (res.ok) {
        const data = await res.json();
        setMessages([...newMessages, { role: "assistant", content: data.reply }]);
      }
    } catch (error) {} finally { setIsTyping(false); }
  };

  const addToCart = (item: any) => {
    setCart(prev => {
      const exists = prev.find(c => c.item.id === item.id);
      if (exists) return prev.map(c => c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => setCart(prev => prev.filter(c => c.item.id !== itemId));
  const getCartTotal = () => cart.reduce((total, c) => total + (c.item.price * c.quantity), 0);
  const getCartCount = () => cart.reduce((count, c) => count + c.quantity, 0);

  const handleCheckout = async () => {
    if (!paymentMethod) { alert("Selecciona un método de pago."); return; }
    setIsProcessingOrder(true);
    try {
      let generatedPaymentLink = "";
      if (paymentMethod === 'link') {
        const res = await fetch('/api/create-preference', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: cart.map(c => ({ name: c.item.name, price: c.item.price, quantity: c.quantity })),
            businessName: businessData.businessName,
            businessId: businessId // AHORA ENVIAMOS EL ID PARA QUE USE LA LLAVE DEL DUEÑO
          })
        });
        const data = await res.json();
        if (data.init_point) generatedPaymentLink = data.init_point;
      }

      const orderRef = doc(collection(db, "businesses", businessId, "orders"));
      await setDoc(orderRef, {
        customerName: customerProfile?.name || "Cliente Invitado",
        customerPhone: customerProfile?.phone || "",
        items: cart.map(c => ({ name: c.item.name, quantity: c.quantity, price: c.item.price })),
        total: getCartTotal(),
        status: "nuevo",
        paymentMethod: paymentMethod,
        paymentLink: generatedPaymentLink || null,
        createdAt: new Date().toISOString()
      });
      
      let orderText = `*NUEVO PEDIDO - ${businessData.businessName}*\n\n`;
      cart.forEach(c => { orderText += `${c.quantity}x ${c.item.name} - $${c.item.price * c.quantity}\n`; });
      orderText += `\n*Total:* $${getCartTotal()}\n\n`;
      if (paymentMethod === 'efectivo') orderText += `*Método:* 💵 Efectivo\n`;
      if (paymentMethod === 'terminal') orderText += `*Método:* 💳 Terminal (A mesa)\n`;
      if (paymentMethod === 'link') {
        orderText += `*Método:* 📱 Pago Online\n`;
        if (generatedPaymentLink) orderText += `👉 *PAGAR AQUÍ:* ${generatedPaymentLink}\n`;
      }
      if (customerProfile) orderText += `\n*Cliente VIP:* ${customerProfile.name}`;

      window.open(`https://wa.me/?text=${encodeURIComponent(orderText)}`, '_blank');
      setCart([]); setIsCartOpen(false);
    } catch (error) { alert("Problema de conexión. Intenta de nuevo."); } 
    finally { setIsProcessingOrder(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-gray-500">Cargando plataforma...</div>;
  if (!businessData) return <div className="min-h-screen flex items-center justify-center font-bold text-red-500">Establecimiento no encontrado.</div>;

  const { brandSettings, businessName, businessType, enableOnlineOrders, mpAccessToken } = businessData;
  const primaryColor = brandSettings?.primaryColor || '#3b82f6';
  const isRetail = businessType === 'retail';
  
  // LOGICA MULTI-CUENTA Y MODO "SOLO VISTA"
  const isCartEnabled = enableOnlineOrders !== false; // Activo por defecto a menos que el dueño lo apague
  const hasMpToken = !!mpAccessToken; // ¿El dueño puso su token de Mercado Pago?

  return (
    <div className="min-h-screen flex flex-col relative pb-32" style={{ backgroundColor: brandSettings?.backgroundUrl ? 'transparent' : '#f9fafb' }}>
      
      {brandSettings?.backgroundUrl && (
        <div className="fixed inset-0 z-0 bg-cover bg-center" style={{ backgroundImage: `url(${brandSettings.backgroundUrl})` }}>
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm"></div>
        </div>
      )}

      {/* TOP BAR */}
      <div className="relative z-20 w-full p-4 flex justify-end">
        <button onClick={() => setIsVipOpen(true)} className="flex items-center gap-2 px-5 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full shadow-lg hover:bg-white/20 transition-all hover:scale-105">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
          <span className="text-white font-bold text-sm">Mi Tarjeta VIP</span>
        </button>
      </div>

      <div className="relative z-10 w-full max-w-4xl mx-auto px-4 pt-4">
        {/* CABECERA */}
        <div className="flex flex-col items-center justify-center mb-12">
          {brandSettings?.logoUrl ? (
            <img src={brandSettings.logoUrl} alt={businessName} className="w-32 h-32 object-cover rounded-full shadow-2xl border-4 border-white/10 mb-6 bg-white" />
          ) : (
            <div className="w-32 h-32 rounded-full bg-gray-800 border-4 border-white/10 flex items-center justify-center mb-6 shadow-2xl"><span className="text-white font-black text-xl">LOGO</span></div>
          )}
          <h1 className="text-4xl md:text-5xl font-black text-center mb-2 tracking-tight drop-shadow-lg" style={{ color: brandSettings?.backgroundUrl ? '#ffffff' : '#111827' }}>{businessName}</h1>
          <p className="text-sm font-black uppercase tracking-widest drop-shadow-md" style={{ color: primaryColor }}>{isRetail ? 'Catálogo Interactivo' : 'Menú Digital'}</p>
        </div>

        {/* CATÁLOGO */}
        {menuData?.catalog && menuData.catalog.length > 0 ? (
          <div className="space-y-12">
            {menuData.catalog.map((cat: any, i: number) => (
              <div key={i} className="space-y-6">
                <h3 className="text-2xl font-black border-b-2 pb-2 inline-block drop-shadow-md" style={{ color: brandSettings?.backgroundUrl ? '#ffffff' : '#111827', borderColor: primaryColor }}>{cat.category}</h3>
                <div className={`grid ${isRetail ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'grid-cols-1 md:grid-cols-2 gap-4'}`}>
                  {cat.items.map((item: any, j: number) => (
                    item.available !== false && (
                      <div key={j} className={`bg-white/95 backdrop-blur-md p-5 rounded-3xl shadow-lg border border-gray-100 flex ${isRetail ? 'flex-col' : 'flex-row items-center justify-between gap-4'} relative overflow-hidden`}>
                        <div className="flex-1">
                          <h4 className="font-black text-gray-900 text-lg leading-tight mb-1">{item.name}</h4>
                          {item.description && <p className="text-sm text-gray-500 font-medium leading-snug line-clamp-3">{item.description}</p>}
                        </div>
                        <div className={`${isRetail ? 'mt-4 pt-4 border-t border-gray-100 text-right flex justify-between items-center' : 'text-right shrink-0 flex flex-col items-end gap-2'}`}>
                          <span className={`font-black ${isRetail ? 'text-2xl' : 'text-lg'}`} style={{ color: primaryColor }}>${item.price}</span>
                          
                          {/* CONTROL MODO "SOLO VISTA" */}
                          {isCartEnabled && (
                            <button onClick={() => addToCart(item)} className="bg-black text-white px-4 py-2 rounded-xl font-bold text-sm shadow-md hover:bg-gray-800 transition-colors">
                              Agregar +
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : ( <div className="text-center py-10"><p className="text-white/80 font-bold">El catálogo se está actualizando...</p></div> )}
      </div>

      {/* BOTONES FLOTANTES */}
      <div className="fixed bottom-6 right-6 z-30 flex flex-col gap-4 items-end">
        {isCartEnabled && cart.length > 0 && (
          <button onClick={() => setIsCartOpen(true)} className="flex items-center gap-3 px-6 py-4 rounded-full shadow-2xl hover:scale-105 transition-transform bg-black border border-white/20 backdrop-blur-md animate-in slide-in-from-bottom-10">
            <div className="relative"><svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg><span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-black w-5 h-5 flex items-center justify-center rounded-full shadow-md">{getCartCount()}</span></div>
            <div className="text-left hidden sm:block"><p className="text-white font-black text-sm leading-tight">Ver Pedido</p><p className="text-white/80 text-xs font-bold">${getCartTotal()}</p></div>
          </button>
        )}
        <button onClick={() => setIsChatOpen(true)} className="flex items-center gap-3 px-6 py-4 rounded-full shadow-2xl hover:scale-105 transition-transform border border-white/20 backdrop-blur-md" style={{ backgroundColor: primaryColor }}>
          <svg className="w-7 h-7 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          <div className="text-left hidden sm:block"><p className="text-white font-black text-sm leading-tight">Asistente IA</p></div>
        </button>
      </div>

      {/* MODAL 1: CARRITO */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center"><h2 className="text-2xl font-black text-gray-900">Tu Pedido</h2><button onClick={() => setIsCartOpen(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200"><svg className="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg></button></div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {cart.map((cartItem, idx) => (
                <div key={idx} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div className="flex-1"><h4 className="font-bold text-gray-900 text-sm">{cartItem.item.name}</h4><p className="text-xs text-gray-500 font-bold">${cartItem.item.price} x {cartItem.quantity}</p></div>
                  <div className="flex items-center gap-3"><span className="font-black text-gray-900">${cartItem.item.price * cartItem.quantity}</span><button onClick={() => removeFromCart(cartItem.item.id)} className="text-red-500 hover:text-red-700"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></div>
                </div>
              ))}
              <div className="pt-4 border-t border-gray-200 flex justify-between items-center"><span className="text-lg font-bold text-gray-500">Total a Pagar</span><span className="text-3xl font-black text-gray-900">${getCartTotal()}</span></div>
              <div className="pt-6">
                <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-3">Método de Pago</h4>
                <div className="space-y-2">
                  <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${paymentMethod === 'efectivo' ? 'border-black bg-gray-50' : 'border-gray-100'}`}><input type="radio" name="payment" onChange={() => setPaymentMethod('efectivo')} className="w-4 h-4 text-black focus:ring-black" /><div><p className="font-bold text-gray-900">💵 Pago en Efectivo</p><p className="text-xs text-gray-500">Pago en mostrador o al recibir.</p></div></label>
                  <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${paymentMethod === 'terminal' ? 'border-blue-500 bg-blue-50' : 'border-gray-100'}`}><input type="radio" name="payment" onChange={() => setPaymentMethod('terminal')} className="w-4 h-4 text-blue-600 focus:ring-blue-500" /><div><p className="font-bold text-blue-900">💳 Tarjeta / Terminal</p><p className="text-xs text-blue-700/80">Llevamos la terminal a tu mesa.</p></div></label>
                  
                  {/* CONTROL DE PASARELA: Solo se muestra si el dueño puso su Token */}
                  {hasMpToken && (
                    <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${paymentMethod === 'link' ? 'border-sky-500 bg-sky-50' : 'border-gray-100'}`}>
                      <input type="radio" name="payment" onChange={() => setPaymentMethod('link')} className="w-4 h-4 text-sky-500 focus:ring-sky-500" />
                      <div className="flex-1"><p className="font-bold text-sky-900 flex justify-between"><span>🔗 Pago Seguro Online</span><span className="text-[10px] bg-sky-200 text-sky-800 px-2 py-0.5 rounded-full font-black">Mercado Pago</span></p><p className="text-xs text-sky-700/80">Recibe un link para pagar con tu celular.</p></div>
                    </label>
                  )}
                </div>
              </div>
            </div>
            <div className="p-6 bg-white border-t border-gray-100"><button onClick={handleCheckout} disabled={isProcessingOrder} className="w-full py-4 bg-black text-white font-black text-lg rounded-xl shadow-2xl hover:bg-gray-800 transition-colors disabled:opacity-50">{isProcessingOrder ? "Generando Link Seguro..." : "Confirmar y Enviar Pedido"}</button></div>
          </div>
        </div>
      )}

      {/* MODAL 2: BILLETERA VIP (INTACTO) */}
      {isVipOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col">
            <button onClick={() => setIsVipOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 z-10 bg-gray-100 rounded-full p-1"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg></button>
            <div className="p-8 overflow-y-auto">
              {customerProfile ? (
                <div className="space-y-6">
                  <div className="text-center"><h3 className="text-2xl font-black text-gray-900">¡Hola, {customerProfile.name}!</h3><p className="text-gray-500 font-medium">Esta es tu tarjeta y estado de cuenta.</p></div>
                  <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 shadow-inner flex flex-col items-center relative"><div className="bg-white p-2 rounded-2xl shadow-sm mb-3"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(customerProfile.phone)}`} alt="Tu QR VIP" className="w-40 h-40 object-contain" /></div><p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-4">ID: {customerProfile.phone}</p></div>
                  <div className="bg-black text-white p-5 rounded-2xl flex justify-between items-center shadow-lg"><div><span className="font-bold text-sm text-gray-300 block">Saldo Actual</span><span className="font-medium text-xs">Muestra tu QR al cajero</span></div><span className="text-3xl font-black" style={{ color: primaryColor }}>{customerProfile.points} <span className="text-lg">pts</span></span></div>
                </div>
              ) : (
                <form onSubmit={handleRegisterVip} className="space-y-6 text-left pt-4">
                  <div className="text-center mb-6"><h3 className="text-2xl font-black text-gray-900">Únete al Club VIP</h3><p className="text-gray-500 text-sm font-medium mt-1">Acumula puntos y gana recompensas.</p></div>
                  <div className="space-y-4"><div><label className="text-xs font-bold text-gray-500 mb-1 block">Tu Nombre</label><input type="text" required value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Ej. Juan Pérez" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-gray-900 outline-none" /></div><div><label className="text-xs font-bold text-gray-500 mb-1 block">Teléfono (Será tu ID)</label><input type="tel" required value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="10 dígitos" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-gray-900 outline-none" /></div></div>
                  <button type="submit" disabled={isRegistering} className="w-full py-4 rounded-xl text-white font-black shadow-lg" style={{ backgroundColor: primaryColor }}>{isRegistering ? "Generando..." : "Crear Mi Billetera"}</button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* MODAL 3: CHAT IA (FIX DE COLOR 100% NÍTIDO) */}
      {/* ========================================= */}
      {isChatOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200">
          <div className="bg-gray-50 w-full sm:w-[400px] h-[85vh] sm:h-[600px] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-300">
            <div className="p-4 flex items-center justify-between shadow-sm z-10 relative" style={{ backgroundColor: primaryColor }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-inner overflow-hidden">{brandSettings?.logoUrl ? <img src={brandSettings.logoUrl} alt="Logo" className="w-full h-full object-cover" /> : <span className="font-black text-xs" style={{ color: primaryColor }}>IA</span>}</div>
                <div><h3 className="text-white font-black text-lg leading-tight">Asistente Virtual</h3><p className="text-white/80 text-xs font-bold flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span> En línea</p></div>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="text-white/80 hover:text-white p-2"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 font-sans">
              <div className="flex justify-start">
                <div className="p-4 rounded-2xl rounded-tl-sm shadow-md max-w-[85%] border border-gray-200" style={{ backgroundColor: '#ffffff', color: '#111827' }}>
                  <p className="text-sm font-semibold">¡Hola! 👋 Soy la Inteligencia Artificial de {businessName}. ¿En qué te puedo ayudar hoy?</p>
                </div>
              </div>
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div 
                    className={`p-4 rounded-2xl shadow-md max-w-[85%] text-sm font-semibold ${msg.role === 'user' ? 'text-white rounded-tr-sm' : 'border border-gray-200 rounded-tl-sm'}`} 
                    style={msg.role === 'user' ? { backgroundColor: primaryColor } : { backgroundColor: '#ffffff', color: '#111827' }}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start"><div className="p-4 rounded-2xl rounded-tl-sm shadow-md border border-gray-200 flex gap-1" style={{ backgroundColor: '#ffffff' }}><span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span><span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span><span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span></div></div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white border-t border-gray-100">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input type="text" value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} placeholder="Escribe tu mensaje..." className="flex-1 bg-gray-100 text-gray-900 border-transparent focus:border-transparent focus:ring-0 rounded-full px-5 py-3 text-sm font-bold outline-none" />
                <button type="submit" disabled={isTyping || !inputMessage.trim()} className="w-12 h-12 flex items-center justify-center rounded-full shadow-md hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100" style={{ backgroundColor: primaryColor }}><svg className="w-5 h-5 text-white ml-1" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg></button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}