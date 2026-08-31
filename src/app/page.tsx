import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center font-sans">
      <main className="max-w-4xl mx-auto px-6 py-20 text-center">
        
        {/* Etiqueta de Escasez / FOMO */}
        <div className="inline-block bg-blue-100 text-blue-800 px-4 py-1.5 rounded-full text-sm font-bold tracking-wide mb-6 uppercase shadow-sm">
          🔥 Primeros 50 clientes: 6 Meses de IA Gratis
        </div>

        {/* Propuesta de Valor Principal */}
        <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight mb-6">
          El futuro de tu negocio con <span className="text-blue-600">Cobros y Menús Inteligentes</span>
        </h1>

        {/* Subtítulo Descriptivo */}
        <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
          Adquiere tu terminal de cobro a un precio competitivo y desbloquea tu ecosistema digital: sitio web propio, menú con código QR y un Chatbot de IA disponible 24/7 para atender a tus clientes sin fricciones.
        </p>

        {/* Botones de Acción (CTAs) */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link 
            href="/contacto"
            className="bg-blue-600 text-white font-semibold h-14 px-8 rounded-full flex items-center justify-center w-full sm:w-auto hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
          >
            Adquirir Paquete
          </Link>
          
          <Link 
            href="/menu/cafeteria-central"
            className="bg-white text-gray-900 border border-gray-200 font-semibold h-14 px-8 rounded-full flex items-center justify-center w-full sm:w-auto hover:bg-gray-50 transition-all shadow-sm"
          >
            Ver Demo en Vivo
          </Link>
        </div>

        {/* Beneficios Clave */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 text-left border-t border-gray-200 pt-16">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Cobros Ágiles</h3>
            <p className="text-gray-600 text-sm">Terminales de última generación con comisiones preferenciales y liquidación al instante.</p>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Menú QR Dinámico</h3>
            <p className="text-gray-600 text-sm">Actualiza precios y platillos en tiempo real sin gastar en reimpresiones ni diseñadores.</p>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Asistente IA 24/7</h3>
            <p className="text-gray-600 text-sm">Un bot inteligente que responde dudas de tu menú y fideliza a tus clientes automáticamente.</p>
          </div>
        </div>

      </main>
    </div>
  );
}