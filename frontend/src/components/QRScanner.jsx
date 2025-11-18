import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useTheme } from '../context/ThemeContext';

const QRScanner = ({ isOpen, onScan, onClose }) => {
  const { darkMode } = useTheme();
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isScanning && scannerRef.current) {
      const html5QrCode = new Html5Qrcode(scannerRef.current.id);
      html5QrCodeRef.current = html5QrCode;

      html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          try {
            const data = JSON.parse(decodedText);
            onScan(data);
            stopScanning();
          } catch (e) {
            // Si no es JSON, pasar el texto directamente
            onScan(decodedText);
            stopScanning();
          }
        },
        (errorMessage) => {
          // Ignorar errores de escaneo continuo
        }
      ).catch((err) => {
        console.error('Error al iniciar escáner:', err);
        setError('No se pudo acceder a la cámara. Asegúrate de dar permisos de cámara.');
      });
    }

    return () => {
      stopScanning();
    };
  }, [isScanning]);

  const stopScanning = async () => {
    if (html5QrCodeRef.current && isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        await html5QrCodeRef.current.clear();
      } catch (err) {
        console.error('Error al detener escáner:', err);
      }
      setIsScanning(false);
    }
  };

  const startScanning = () => {
    setError('');
    setIsScanning(true);
  };

  const handleClose = async () => {
    await stopScanning();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 transition-colors">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Escanear Código QR</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          {!isScanning ? (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Presiona el botón para iniciar el escáner de códigos QR
              </p>
              <button
                onClick={startScanning}
                className="bg-primary-600 dark:bg-primary-500 text-white px-6 py-3 rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors"
              >
                Iniciar Escáner
              </button>
            </div>
          ) : (
            <div>
              <div id="qr-reader" ref={scannerRef} className="w-full"></div>
              <button
                onClick={stopScanning}
                className="mt-4 w-full bg-red-600 dark:bg-red-700 text-white px-4 py-2 rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
              >
                Detener Escáner
              </button>
            </div>
          )}

          {error && (
            <div className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRScanner;

