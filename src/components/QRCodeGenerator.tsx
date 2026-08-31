"use client";

import { QRCodeCanvas } from 'qrcode.react';

interface QRCodeGeneratorProps {
  businessId: string;
  businessName: string;
}

export default function QRCodeGenerator({ businessId, businessName }: QRCodeGeneratorProps) {
  // En producción, cambiaremos localhost por tu dominio real
  const qrUrl = `http://localhost:3000/menu/${businessId}`;

  const downloadQR = () => {
    const canvas = document.getElementById('business-qr') as HTMLCanvasElement;
    if (canvas) {
      const pngUrl = canvas
        .toDataURL("image/png")
        .replace("image/png", "image/octet-stream");
      
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `QR_Menu_${businessName.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center max-w-sm">
      <h3 className="text-lg font-bold text-gray-900 mb-2">Código QR del Menú</h3>
      <p className="text-sm text-gray-500 text-center mb-6">
        Imprime este código y colócalo en las mesas de {businessName}.
      </p>

      <div className="p-4 border-2 border-dashed border-gray-200 rounded-xl mb-6 bg-gray-50">
        <QRCodeCanvas 
          id="business-qr"
          value={qrUrl}
          size={200}
          bgColor={"#ffffff"}
          fgColor={"#000000"}
          level={"H"} // Nivel de corrección de errores alto (ideal para impresión)
          includeMargin={true}
        />
      </div>

      <button 
        onClick={downloadQR}
        className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
        Descargar PNG (Alta Resolución)
      </button>
    </div>
  );
}