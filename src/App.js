import React, { useState, useEffect, useRef } from 'react';
import { QrCode, Users, History, UserPlus, Camera, CheckCircle, XCircle, Download, Clock, Upload, FileSpreadsheet, Trash2 } from 'lucide-react';

const QRAccessControl = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [accessLog, setAccessLog] = useState([]);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const savedUsers = localStorage.getItem('qr-users');
    const savedLog = localStorage.getItem('qr-access-log');
    
    if (savedUsers) {
      setUsers(JSON.parse(savedUsers));
    }
    
    if (savedLog) {
      setAccessLog(JSON.parse(savedLog));
    }
  }, []);

  const generateQRCodeJSX = (text) => {
    const size = 150;
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
      <svg width={size} height={size} className="bg-white p-1 rounded border border-gray-200">
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
    
    const timestamp = Date.now();
    const qrData = `ACC-${timestamp.toString().slice(-6)}-${btoa(newUserEmail || newUserName).slice(0, 8)}`;
    
    const newUser = {
      id: timestamp.toString(),
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
    
    alert(`Usuario agregado: ${newUser.name}`);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      alert('Por favor selecciona un archivo Excel (.xlsx o .xls)');
      return;
    }

    setImporting(true);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs');
      
      const workbook = XLSX.read(arrayBuffer);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet);
      
      let imported = 0;
      const newUsers = [];
      const timestamp = Date.now();
      
      jsonData.forEach((row, index) => {
        const name = row.Nombre || row.nombre || row.Name || row.name || '';
        const email = row.Email || row.email || row.Correo || row.correo || '';
        
        if (name.trim()) {
          const qrData = `ACC-${timestamp.toString().slice(-6)}-${btoa(email || name).slice(0, 8)}-${index}`;
          
          newUsers.push({
            id: `${timestamp}-${index}`,
            name: name.trim(),
            email: email.trim(),
            qrCode: qrData,
            createdAt: new Date().toISOString(),
            active: true
          });
          
          imported++;
        }
      });
      
      if (newUsers.length > 0) {
        const updatedUsers = [...users, ...newUsers];
        setUsers(updatedUsers);
        localStorage.setItem('qr-users', JSON.stringify(updatedUsers));
        alert(`✅ Se importaron ${imported} usuarios correctamente`);
      } else {
        alert('⚠️ No se encontraron usuarios válidos. Asegúrate que el Excel tenga columnas "Nombre" y "Email"');
      }
      
    } catch (error) {
      console.error('Error importing:', error);
      alert('❌ Error al importar el archivo. Verifica que sea un Excel válido.');
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const exportToExcel = async () => {
    if (users.length === 0) {
      alert('No hay usuarios para exportar');
      return;
    }

    try {
      const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs');
      
      const exportData = users.map(user => ({
        'Nombre': user.name,
        'Email': user.email,
        'Código QR': user.qrCode,
        'Estado': user.active ? 'Activo' : 'Inactivo',
        'Fecha de Registro': new Date(user.createdAt).toLocaleDateString('es-MX')
      }));
      
      const ws = XLSX.utils.json_to_sheet(exportData);
      ws['!cols'] = [{ wch: 30 }, { wch: 35 }, { wch: 25 }, { wch: 10 }, { wch: 15 }];
      
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Usuarios');
      
      const fileName = `usuarios-evento-${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      alert(`✅ Archivo exportado: ${fileName}\n📋 Total: ${users.length} usuarios`);
      
    } catch (error) {
      console.error('Error exporting:', error);
      alert('❌ Error al exportar');
    }
  };

  const downloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,Nombre,Email\nJuan Pérez,juan@ejemplo.com\nMaría García,maria@ejemplo.com\nCarlos López,carlos@ejemplo.com";
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "plantilla-usuarios.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleUserStatus = (userId) => {
    const updatedUsers = users.map(u => 
      u.id === userId ? { ...u, active: !u.active } : u
    );
    setUsers(updatedUsers);
    localStorage.setItem('qr-users', JSON.stringify(updatedUsers));
  };

  const deleteUser = (userId) => {
    if (window.confirm('¿Estás seguro de eliminar este usuario?')) {
      const updatedUsers = users.filter(u => u.id !== userId);
      setUsers(updatedUsers);
      localStorage.setItem('qr-users', JSON.stringify(updatedUsers));
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setScanning(true);
      }
    } catch (err) {
      console.error('Camera error:', err);
      alert('No se pudo acceder a la cámara');
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
    
    const updatedLog = [logEntry, ...accessLog].slice(0, 500);
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

  const exportAccessLog = async () => {
    if (accessLog.length === 0) {
      alert('No hay registros para exportar');
      return;
    }

    try {
      const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs');
      
      const exportData = accessLog.map(log => ({
        'Nombre': log.userName,
        'Código QR': log.qrCode,
        'Estado': log.status === 'granted' ? 'Permitido' : 'Denegado',
        'Fecha': new Date(log.timestamp).toLocaleDateString('es-MX'),
        'Hora': new Date(log.timestamp).toLocaleTimeString('es-MX')
      }));
      
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Accesos');
      
      const fileName = `registro-accesos-${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      alert(`✅ Registro exportado: ${fileName}`);
      
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error al exportar');
    }
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white p-6">
            <div className="flex items-center gap-3">
              <QrCode size={36} />
              <div>
                <h1 className="text-2xl font-bold">Control de Accesos</h1>
                <p className="text-blue-100 text-sm">Sistema QR para Eventos</p>
              </div>
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
              <p className="text-2xl font-bold text-gray-800">{accessLog.filter(l => l.status === 'granted').length}</p>
              <p className="text-xs text-gray-600">Permitidos</p>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-sm text-center">
              <Clock size={24} className="mx-auto text-orange-600 mb-1" />
              <p className="text-2xl font-bold text-gray-800">
                {accessLog.filter(l => new Date(l.timestamp).toDateString() === new Date().toDateString()).length}
              </p>
              <p className="text-xs text-gray-600">Hoy</p>
            </div>
          </div>

          <div className="flex border-b bg-white">
            {['scan', 'users', 'history'].map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); if (tab !== 'scan') stopCamera(); }}
                className={`flex-1 py-4 px-6 font-medium flex items-center justify-center gap-2 transition ${
                  activeTab === tab ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {tab === 'scan' && <><Camera size={20} />Escanear</>}
                {tab === 'users' && <><Users size={20} />Usuarios</>}
                {tab === 'history' && <><History size={20} />Historial</>}
              </button>
            ))}
          </div>

          <div className="p-6 bg-white min-h-96">
            {activeTab === 'scan' && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-800">Escáner QR</h2>
                
                <div className="bg-gray-900 rounded-xl aspect-video flex items-center justify-center relative">
                  {!scanning ? (
                    <button onClick={startCamera} className="bg-blue-600 text-white px-8 py-4 rounded-xl font-medium hover:bg-blue-700 flex items-center gap-3">
                      <Camera size={24} />Activar Cámara
                    </button>
                  ) : (
                    <>
                      <video ref={videoRef} className="w-full h-full object-cover" />
                      <canvas ref={canvasRef} className="hidden" />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="border-4 border-blue-500 rounded-lg w-64 h-64 animate-pulse"></div>
                      </div>
                    </>
                  )}
                </div>

                {scanning && (
                  <button onClick={stopCamera} className="w-full bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700">
                    Detener Cámara
                  </button>
                )}

                <div className="border-t pt-4">
                  <p className="text-sm text-gray-600 mb-3 font-medium">Modo Prueba:</p>
                  <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                    {users.filter(u => u.active).slice(0, 20).map(user => (
                      <button
                        key={user.id}
                        onClick={() => processQRCode(user.qrCode)}
                        className="px-4 py-3 bg-gray-100 hover:bg-blue-50 rounded-lg text-sm font-medium border hover:border-blue-400 text-left truncate"
                      >
                        {user.name}
                      </button>
                    ))}
                  </div>
                </div>

                {scanResult && (
                  <div className={`p-6 rounded-xl flex items-center gap-4 ${
                    scanResult.success ? 'bg-green-50 border-2 border-green-500' : 'bg-red-50 border-2 border-red-500'
                  }`}>
                    {scanResult.success ? <CheckCircle size={48} className="text-green-600" /> : <XCircle size={48} className="text-red-600" />}
                    <div>
                      <p className="font-bold text-xl">{scanResult.success ? '✓ Acceso Permitido' : '✗ Acceso Denegado'}</p>
                      <p className="font-medium">{scanResult.user || 'Usuario no autorizado'}</p>
                      <p className="text-sm">{scanResult.time}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'users' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <h2 className="text-xl font-semibold text-gray-800">Usuarios ({users.length})</h2>
                  <button
                    onClick={exportToExcel}
                    disabled={users.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 text-sm"
                  >
                    <FileSpreadsheet size={18} />Exportar Excel
                  </button>
                </div>

                <div className="bg-purple-50 p-5 rounded-xl border-2 border-purple-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Upload size={20} className="text-purple-600" />
                    <h3 className="font-semibold text-purple-900">Importar Excel (350 personas)</h3>
                  </div>
                  <p className="text-sm text-purple-700 mb-3">
                    Columnas requeridas: <strong>Nombre</strong> y <strong>Email</strong>
                  </p>
                  <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
                  <div className="flex gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={importing}
                      className="flex-1 bg-purple-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
                    >
                      <Upload size={20} />{importing ? 'Importando...' : 'Seleccionar Excel'}
                    </button>
                    <button onClick={downloadTemplate} className="px-4 py-3 bg-white border-2 border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 text-sm font-medium">
                      📥 Plantilla
                    </button>
                  </div>
                </div>
                
                <div className="bg-blue-50 p-5 rounded-xl border border-blue-200">
                  <div className="flex items-center gap-2 mb-3">
                    <UserPlus size={20} className="text-blue-600" />
                    <h3 className="font-semibold text-blue-900">Agregar Individual</h3>
                  </div>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addUser()}
                      placeholder="Nombre completo"
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addUser()}
                      placeholder="Email (opcional)"
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <button onClick={addUser} className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2">
                      <UserPlus size={20} />Agregar Usuario
                    </button>
                  </div>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {users.length === 0 ? (
                    <div className="text-center py-12">
                      <Users size={48} className="mx-auto text-gray-400 mb-3" />
                      <p className="text-gray-500">No hay usuarios</p>
                    </div>
                  ) : (
                    users.map(user => (
                      <div key={user.id} className={`border-2 rounded-xl p-4 ${user.active ? 'bg-white hover:shadow-md' : 'bg-gray-50 opacity-60'}`}>
                        <div className="flex gap-4">
                          <div className="flex-shrink-0 w-20">{generateQRCodeJSX(user.qrCode)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold truncate">{user.name}</h3>
                                {user.email && <p className="text-sm text-gray-600 truncate">{user.email}</p>}
                                <p className="text-xs text-gray-500 font-mono mt-1 bg-gray-100 px-2 py-1 rounded inline-block">{user.qrCode}</p>
                              </div>
                              <div className="flex gap-1 ml-2">
                                <button
                                  onClick={() => toggleUserStatus(user.id)}
                                  className={`px-2 py-1 rounded text-xs ${user.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                                >
                                  {user.active ? '✓' : '✗'}
                                </button>
                                <button onClick={() => deleteUser(user.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-4">
                <div className="flex justify-between">
                  <h2 className="text-xl font-semibold">Historial ({accessLog.length})</h2>
                  <button
                    onClick={exportAccessLog}
                    disabled={accessLog.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 text-sm"
                  >
                    <Download size={18} />Exportar
                  </button>
                </div>
                
                {accessLog.length === 0 ? (
                  <div className="text-center py-12">
                    <History size={48} className="mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-500">Sin registros</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {accessLog.map(log => (
                      <div key={log.id} className={`border-l-4 rounded-lg p-4 flex justify-between ${
                        log.status === 'granted' ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
                      }`}>
                        <div className="flex items-center gap-3">
                          {log.status === 'granted' ? <CheckCircle className="text-green-600" size={28} /> : <XCircle className="text-red-600" size={28} />}
                          <div>
                            <p className="font-semibold">{log.userName}</p>
                            <p className="text-sm text-gray-600 font-mono">{log.qrCode}</p>
                          </div>
                        </div>
                        <div className="text-right text-sm">
                          <p>{new Date(log.timestamp).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}</p>
                          <p className="text-gray-600">{new Date(log.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</p>
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