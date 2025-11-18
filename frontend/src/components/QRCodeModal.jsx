import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useTheme } from '../context/ThemeContext';

const QRCodeModal = ({ isOpen, onClose, data, title = 'Código QR' }) => {
  const { darkMode } = useTheme();
  const [qrValue, setQrValue] = useState('');

  useEffect(() => {
    if (data) {
      // Si data es un objeto, convertirlo a JSON string
      if (typeof data === 'object') {
        setQrValue(JSON.stringify(data));
      } else {
        setQrValue(data);
      }
    }
  }, [data]);

  if (!isOpen) return null;

  const handleDownload = () => {
    const svg = document.getElementById('qrcode-svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `qr-${Date.now()}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl"
          >
            ×
          </button>
        </div>
        
        <div className="flex flex-col items-center space-y-4">
          <div className="bg-white p-4 rounded-lg">
            <QRCodeSVG
              id="qrcode-svg"
              value={qrValue}
              size={256}
              level="M"
              includeMargin={true}
            />
          </div>
          
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Escanea este código QR para acceder rápidamente a la información
            </p>
            <button
              onClick={handleDownload}
              className="bg-primary-600 dark:bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors"
            >
              📥 Descargar QR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodeModal;

