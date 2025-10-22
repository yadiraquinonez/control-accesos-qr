import React, { useState, useEffect, useRef } from 'react';
import { QrCode, Users, History, UserPlus, Camera, CheckCircle, XCircle, Download, Clock } from 'lucide-react';

const QRAccessControl = () => {
  const [activeTab, setActiveTab] = useState('scan');
  const [users, setUsers] = useState([]);
  const [accessLog, setAccessLog] = useState([]);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    const savedUsers = localStorage.getItem('qr-users');
    const savedLog = localStorage.getItem('qr-access-log');
    
    if (savedUsers) {
      setUsers(JSON.parse(savedUsers));
    } else {
      const demoUsers = [
        { 
          id: '1', 
          name: 'Juan Pérez', 
          email: 'juan@ejemplo.com',
          qrCode: 'ACC-001-' + btoa('juan@ejemplo.com').slice(0, 8),
          createdAt: new Date().toISOString(),
          active: true
        },
        { 
          id: '2', 
          name: 'María García', 
          email: 'maria@ejemplo.com',
          qrCode: 'ACC-002-' + btoa('maria@ejemplo.com').slice(0, 8),
          createdAt: new Date().toISOString(),
          active: true
        },
      ];
      setUsers(demoUsers);
      localStorage.setItem('qr-users', JSON.stringify(demoUsers));
    }
    
    if (savedLog) {
      setAccessLog(JSON.parse(savedLog));
    }
  }, []);

  const generateQRCode = (text) => {
    const size = 200;
    const qrSize = 29;
    const moduleSize = size / qrSize;
    
    const seed = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const random = (i) => {
      const x = Math.sin(seed + i) * 10000;
      return x - Math.floor(x);
    };

    const modules = [];
    for (let y = 0; y < qrSize; y++) {
      for (let x = 0; x < qrSize; x++) {
        const isFinderPattern = 
          (x < 7 && y < 7) || 
          (x >= qrSize - 7 && y < 7) || 
          (x < 7 && y >= qrSize - 7);
        
        let isDark = false;
        if (isFinderPattern) {
          const fx = x < 7 ? x : (x >= qrSize - 7 ? x - qrSize + 7 : x);
          const fy = y < 7 ? y : (y >= qrSize - 7 ? y - qrSize + 7 : y);
          isDark = (fx === 0 || fx === 6 || fy === 0 || fy === 6 || 
                   (fx >= 2 && fx <= 4 && fy >= 2 && fy <= 4));
        } else {
          isDark = random(x * qrSize + y) > 0.5;
        }
        
        if (isDark) {
          modules.push({ x: x * moduleSize, y: y * moduleSize });
        }
      }
    }

    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="bg-white p-2 rounded">
        <rect width={size} height={size} fill="white" />
        {modules.map((m, i) => (
          <rect key={i} x={m.x} y={m.y} width={moduleSize} height={moduleSize} fill="black" />
        ))}
      </svg>
    );
  };

  const addUser = () => {
    if (!newUserName.trim()) {
      alert('Por favor ingresa un nombre');
      return;
    }
    
    const qrData = `ACC-${Date.now().toString().slice(-6)}-${btoa(newUserEmail || newUserName).slice(0, 8)}`;
    
    const newUser = {
      id: Date.now().toString(),
      name: newUserName.trim(),
      email: newUserEmail.trim() || '',
      qrCode: qrData,
      createdAt: new Date().toISOString(),
      active: true
    };
    
    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    localStorage.setItem('qr-users', JSON.stringify(updatedUsers));
    
    setNewUserName('');
    setNewUserEmail('');
    
    alert(`Usuario agregado: ${newUser.name}\nCódigo: ${newUser.qrCode}`);
  };

  const toggleUserStatus = (userId) => {
    const updatedUsers = users.map(u => 
      u.id === userId ? { ...u, active: !u.active } : u
    );
    setUsers(updatedUsers);
    localStorage.setItem('qr-users', JSON.stringify(updatedUsers));
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setScanning(true);
      }
    } catch (err) {
      console.error('Camera error:', err);
      alert('No se pudo acceder a la cámara. Asegúrate de dar permisos.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScanning(false);
  };

  const processQRCode = (code) => {
    const user = users.find(u => u.qrCode === code && u.active);
    const timestamp = new Date();
    
    const logEntry = {
      id: Date.now().toString(),
      userId: user?.id || null,
      userName: user?.name || 'Desconocido',
      qrCode: code,
      timestamp: timestamp.toISOString(),
      status: user ? 'granted' : 'denied'
    };
    
    const updatedLog = [logEntry, ...accessLog].slice(0, 100);
    setAccessLog(updatedLog);
    localStorage.setItem('qr-access-log', JSON.stringify(updatedLog));
    
    setScanResult({ 
      success: !!user, 
      user: user?.name,
      time: timestamp.toLocaleTimeString()
    });
    
    if (navigator.vibrate) {
      navigator.vibrate(user ? 200 : [100, 50, 100]);
    }
    
    setTimeout(() => setScanResult(null), 3000);
  };

  const exportData = () => {
    const data = {
      users: users,
      accessLog: accessLog,
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `accesos-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <QrCode size={36} />
                <div>
                  <h1 className="text-2xl font-bold">Control de Accesos</h1>
                  <p className="text-blue-100 text-sm">Sistema QR para Eventos</p>
                </div>
              </div>
              <button
                onClick={exportData}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition"
                title="Exportar datos"
              >
                <Download size={20} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50">
            <div className="bg-white p-3 rounded-lg shadow-sm text-center">
              <Users size={24} className="mx-auto text-blue-600 mb-1" />
              <p className="text-2xl font-bold text-gray-800">{users.length}</p>
              <p className="text-xs text-gray-600">Usuarios</p>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-sm text-center">
              <CheckCircle size={24} className="mx-auto text-green-600 mb-1" />
              <p className="text-2xl font-bold text-gray-800">
                {accessLog.filter(l => l.status === 'granted').length}
              </p>
              <p className="text-xs text-gray-600">Permitidos</p>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-sm text-center">
              <Clock size={24} className="mx-auto text-orange-600 mb-1" />
              <p className="text-2xl font-bold text-gray-800">
                {accessLog.filter(l => {
                  const today = new Date().toDateString();
                  return new Date(l.timestamp).toDateString() === today;
                }).length}
              </p>
              <p className="text-xs text-gray-600">Hoy</p>
            </div>
          </div>

          <div className="flex border-b bg-white">
            <button
              onClick={() => { setActiveTab('scan'); stopCamera(); }}
              className={`flex-1 py-4 px-6 font-medium flex items-center justify-center gap-2 transition ${
                activeTab === 'scan' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Camera size={20} />
              Escanear
            </button>
            <button
              onClick={() => { setActiveTab('users'); stopCamera(); }}
              className={`flex-1 py-4 px-6 font-medium flex items-center justify-center gap-2 transition ${
                activeTab === 'users' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Users size={20} />
              Usuarios
            </button>
            <button
              onClick={() => { setActiveTab('history'); stopCamera(); }}
              className={`flex-1 py-4 px-6 font-medium flex items-center justify-center gap-2 transition ${
                activeTab === 'history' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <History size={20} />
              Historial
            </button>
          </div>

          <div className="p-6 bg-white min-h-96">
            {activeTab === 'scan' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-800">Escáner QR</h2>
                  {scanning && (
                    <span className="flex items-center gap-2 text-sm text-green-600">
                      <span className="animate-pulse w-2 h-2 bg-green-600 rounded-full"></span>
                      Escaneando...
                    </span>
                  )}
                </div>
                
                <div className="bg-gray-900 rounded-xl overflow-hidden aspect-video flex items-center justify-center relative shadow-lg">
                  {!scanning ? (
                    <button
                      onClick={startCamera}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 flex items-center gap-3 shadow-lg transition transform hover:scale-105"
                    >
                      <Camera size={24} />
                      Activar Cámara
                    </button>
                  ) : (
                    <>
                      <video ref={videoRef} className="w-full h-full object-cover" />
                      <canvas ref={canvasRef} className="hidden" />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="border-4 border-blue-500 rounded-lg w-64 h-64 shadow-lg animate-pulse"></div>
                      </div>
                    </>
                  )}
                </div>

                {scanning && (
                  <button
                    onClick={stopCamera}
                    className="w-full bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition"
                  >
                    Detener Cámara
                  </button>
                )}

                <div className="border-t pt-4 mt-4">
                  <p className="text-sm text-gray-600 mb-3 font-medium">🧪 Modo Prueba - Simular Escaneo:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {users.filter(u => u.active).slice(0, 4).map(user => (
                      <button
                        key={user.id}
                        onClick={() => processQRCode(user.qrCode)}
                        className="px-4 py-3 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-blue-50 hover:to-indigo-50 rounded-lg text-sm font-medium transition border border-gray-300 hover:border-blue-400"
                      >
                        📱 {user.name}
                      </button>
                    ))}
                  </div>
                </div>

                {scanResult && (
                  <div className={`p-6 rounded-xl flex items-center gap-4 shadow-lg ${
                    scanResult.success 
                      ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-500' 
                      : 'bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-500'
                  }`}>
                    {scanResult.success ? (
                      <>
                        <CheckCircle size={48} className="text-green-600" />
                        <div className="flex-1">
                          <p className="font-bold text-xl text-green-900">✓ Acceso Permitido</p>
                          <p className="text-green-700 font-medium">{scanResult.user}</p>
                          <p className="text-sm text-green-600">{scanResult.time}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <XCircle size={48} className="text-red-600" />
                        <div className="flex-1">
                          <p className="font-bold text-xl text-red-900">✗ Acceso Denegado</p>
                          <p className="text-red-700">Usuario no autorizado</p>
                          <p className="text-sm text-red-600">{scanResult.time}</p>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'users' && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-800">Gestión de Usuarios</h2>
                
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-xl border border-blue-200">
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && addUser()}
                      placeholder="Nombre completo *"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addUser()}
                      placeholder="Email (opcional)"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={addUser}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 flex items-center justify-center gap-2 transition shadow-md"
                    >
                      <UserPlus size={20} />
                      Agregar Usuario
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {users.map(user => (
                    <div key={user.id} className={`border-2 rounded-xl p-4 transition ${
                      user.active ? 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md' : 'bg-gray-50 border-gray-300 opacity-60'
                    }`}>
                      <div className="flex gap-4">
                        <div className="flex-shrink-0">
                          <div className="w-32 h-32 flex items-center justify-center">
                            {generateQRCode(user.qrCode)}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-bold text-lg text-gray-800">{user.name}</h3>
                              {user.email && (
                                <p className="text-sm text-gray-600">{user.email}</p>
                              )}
                              <p className="text-xs text-gray-500 font-mono mt-1 bg-gray-100 px-2 py-1 rounded inline-block">
                                {user.qrCode}
                              </p>
                              <p className="text-xs text-gray-500 mt-2">
                                📅 {new Date(user.createdAt).toLocaleDateString('es-MX', { 
                                  year: 'numeric', month: 'long', day: 'numeric' 
                                })}
                              </p>
                            </div>
                            <button
                              onClick={() => toggleUserStatus(user.id)}
                              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                                user.active 
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                  : 'bg-red-100 text-red-700 hover:bg-red-200'
                              }`}
                            >
                              {user.active ? '✓ Activo' : '✗ Inactivo'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-800">Historial de Accesos</h2>
                  <span className="text-sm text-gray-600">{accessLog.length} registros</span>
                </div>
                
                {accessLog.length === 0 ? (
                  <div className="text-center py-12">
                    <History size={48} className="mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-500">No hay registros de acceso todavía</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {accessLog.map(log => (
                      <div key={log.id} className={`border-l-4 rounded-lg p-4 flex items-center justify-between transition hover:shadow-md ${
                        log.status === 'granted' 
                          ? 'border-green-500 bg-green-50 hover:bg-green-100' 
                          : 'border-red-500 bg-red-50 hover:bg-red-100'
                      }`}>
                        <div className="flex items-center gap-3 flex-1">
                          {log.status === 'granted' ? (
                            <CheckCircle className="text-green-600 flex-shrink-0" size={28} />
                          ) : (
                            <XCircle className="text-red-600 flex-shrink-0" size={28} />
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900">{log.userName}</p>
                            <p className="text-sm text-gray-600 font-mono truncate">{log.qrCode}</p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-4">
                          <p className="text-sm font-medium text-gray-700">
                            {new Date(log.timestamp).toLocaleDateString('es-MX', { 
                              day: '2-digit', month: 'short' 
                            })}
                          </p>
                          <p className="text-sm text-gray-600">
                            {new Date(log.timestamp).toLocaleTimeString('es-MX', { 
                              hour: '2-digit', minute: '2-digit' 
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRAccessControl;