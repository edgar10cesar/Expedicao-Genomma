import React, { useState, useRef, useEffect } from 'react';
import { Pallet, Shipment, Carregamento } from '../types';
import { Truck, QrCode, AlertTriangle, CheckCircle2, FileText, Play, RotateCcw, ShieldAlert, ArrowRight, ShieldCheck, Clipboard, Boxes, Camera, CameraOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import jsQR from 'jsqr';

interface TruckLoadingSectionProps {
  carregamentos: Carregamento[];
  shipments: Shipment[];
  pallets: Pallet[];
  setShipments: React.Dispatch<React.SetStateAction<Shipment[]>>;
  setPallets: React.Dispatch<React.SetStateAction<Pallet[]>>;
  setCarregamentos?: React.Dispatch<React.SetStateAction<Carregamento[]>>;
}

export default function TruckLoadingSection({
  carregamentos,
  shipments,
  pallets,
  setShipments,
  setPallets,
  setCarregamentos
}: TruckLoadingSectionProps) {
  // Filter out completed loads (loads where all programmed shipments have been loaded)
  const visibleCarregamentos = carregamentos.filter(c => {
    const loadShipments = shipments.filter(s => s.carregamentoId === c.id);
    if (loadShipments.length === 0) return true;
    return loadShipments.some(s => s.status !== 'Carregado');
  });

  // Named load/truck selection
  const [activeVehicleId, setActiveVehicleId] = useState<string>('');

  // Sync activeVehicleId when visible loads change
  useEffect(() => {
    if (visibleCarregamentos.length > 0) {
      if (!activeVehicleId || !visibleCarregamentos.some(c => c.id === activeVehicleId)) {
        setActiveVehicleId(visibleCarregamentos[0].id);
      }
    } else {
      setActiveVehicleId('');
    }
  }, [visibleCarregamentos, activeVehicleId]);

  // Modal to celebrate completed load
  const [showConcludedModal, setShowConcludedModal] = useState(false);

  // Tab view for mobile screens to optimize checksheets scanning space
  const [mobileTab, setMobileTab] = useState<'all' | 'scanned' | 'pending'>('all');

  // Scan input code state (manual paste or reader)
  const [scannedQrString, setScannedQrString] = useState('');

  // Camera integration for real-time laser QR Code scanner
  const [scanError, setScanError] = useState<string | null>(null);

  // Real-time video continuous camera integration states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isScanningRef = useRef<boolean>(false);

  const cleanUpCamera = () => {
    isScanningRef.current = false;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try { track.stop(); } catch (e) {}
      });
      streamRef.current = null;
    }
  };

  // Auto clean up camera stream on unmount or vehicle swap
  useEffect(() => {
    return () => {
      cleanUpCamera();
    };
  }, []);

  useEffect(() => {
    stopLiveCamera();
  }, [activeVehicleId]);

  const stopLiveCamera = async () => {
    cleanUpCamera();
    setIsCameraActive(false);
  };

  const tick = () => {
    if (!isScanningRef.current) return;
    const video = videoRef.current;
    if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        try {
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "attemptBoth",
          });
          if (code && code.data && code.data.trim()) {
            const decodedText = code.data.trim();
            cleanUpCamera();
            setIsCameraActive(false);
            
            // Process the scan!
            handleProcessScan(decodedText);
            
            if (navigator.vibrate) {
              try { navigator.vibrate(100); } catch (_) {}
            }
            return; // stop scanning loop
          }
        } catch (err) {
          console.error("jsQR decoding failed:", err);
        }
      }
    }
    // Continue loop
    animationFrameRef.current = requestAnimationFrame(tick);
  };

  const startLiveCamera = async (deviceId?: string) => {
    cleanUpCamera();
    setIsCameraActive(true);
    setScanError(null);
    isScanningRef.current = true;
    
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Seu navegador ou dispositivo não possui suporte a câmera nativa, ou o acesso está bloqueado.");
      }

      // Enumerate cameras to list wide-angle/telephoto lenses for switching
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        setAvailableCameras(videoDevices);
        
        if (videoDevices.length > 0 && !deviceId && !selectedCameraId) {
          // Look for rear camera triggers: labels like 'back', 'traseira', 'environment', '0', etc.
          const backCam = videoDevices.find(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('traseira') || 
            d.label.toLowerCase().includes('environment') ||
            d.label.toLowerCase().includes('lente')
          );
          const defaultId = backCam ? backCam.deviceId : videoDevices[0].deviceId;
          setSelectedCameraId(defaultId);
          deviceId = defaultId;
        }
      } catch (e) {
        console.warn("Could not list video devices, continuing with defaults:", e);
      }

      // Build media constraints
      const constraints: MediaStreamConstraints = {
        video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: "environment" }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      // Give the state/DOM a tiny moment to bind the <video> ref if needed
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", "true"); // required for iOS safari support
          videoRef.current.play().then(() => {
            animationFrameRef.current = requestAnimationFrame(tick);
          }).catch(err => {
            console.error("Video play failed:", err);
            setScanError("Não foi possível iniciar a reprodução de vídeo da câmera.");
          });
        }
      }, 50);

    } catch (err: any) {
      console.error("Camera startup error:", err);
      let errorMsg = "Acesso à câmera negado ou indisponível. ";
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        errorMsg += "A câmera em tempo real só funciona em conexões seguras HTTPS.";
      } else {
        errorMsg += "Verifique se concedeu permissão de câmera ao navegador. Se o app estiver em iFrame no AI Studio, abra em Nova Aba usando o link azul no topo do preview.";
      }
      setScanError(errorMsg);
      setIsCameraActive(false);
      isScanningRef.current = false;
    }
  };

  const handleCameraChange = async (deviceId: string) => {
    setSelectedCameraId(deviceId);
    if (isCameraActive) {
      await startLiveCamera(deviceId);
    }
  };



  
  // Real-time scan result feedback
  const [scanFeedback, setScanFeedback] = useState<{
    status: 'success' | 'warn' | 'error' | null;
    title: string;
    description: string;
    palletId?: string;
    problems?: string[];
  } | null>(null);

  // Loading logs (history of scans)
  const [scanningLogs, setScanningLogs] = useState<{
    id: string;
    timestamp: string;
    palletId: string;
    status: 'success' | 'warn' | 'error';
    details: string;
  }[]>([]);

  // Simulate scanning of ready pallets (perfect for fast testing without printer!)
  const readyUnloadedPallets = pallets.filter(
    p => p.carregamentoId === activeVehicleId && !p.loaded
  );
  const globalUnloadedPallets = pallets.filter(p => !p.loaded);

  // Core scan processing logic
  const handleProcessScan = (qrText: string) => {
    if (!qrText.trim()) return;

    try {
      // Decode QR Code containing stringified payload:
      // { p: palletId, c: carregamentoId, s: [{ n: number, c: client, t: carrier, v: volumes }] }
      const decoded = JSON.parse(qrText.trim());
      
      const palletId = decoded.p;
      const associatedLoadId = decoded.c;
      const scannedShipments: any[] = decoded.s || [];

      if (!palletId || !scannedShipments.length) {
        throw new Error('Formato de QR Code inválido para etiqueta de expedição.');
      }

      // 1. Check if this pallet was already loaded
      const existingPallet = pallets.find(p => p.id === palletId);
      if (existingPallet && existingPallet.loaded) {
        setScanFeedback({
          status: 'error',
          title: 'Duplicidade Detectada',
          description: `O palete ${palletId} já foi bipado anteriormente e já está dentro do caminhão.`,
          palletId
        });
        
        appendLog(palletId, 'error', 'Palete já estava carregado (Tentativa de bipa dupla)');
        return;
      }

      // 2. Main Validation of Shipments in the Pallet against the Selected Load Planning
      const activeVehicle = carregamentos.find(v => v.id === activeVehicleId);
      const activeVehiclePlanning = shipments.filter(s => s.carregamentoId === activeVehicleId);
      
      const problems: string[] = [];
      const validShipmentNumbers: string[] = [];

      scannedShipments.forEach(item => {
        // Look up this individual shipment number inside of our selected truck planning
        const matchedPlanning = activeVehiclePlanning.find(sh => sh.shipmentNumber === item.n);

        if (!matchedPlanning) {
          // It's a divergence: Either it belongs to another load, or doesn't exist at all!
          const otherLoadMatch = shipments.find(sh => sh.shipmentNumber === item.n);
          if (otherLoadMatch) {
            const alternateVehicle = carregamentos.find(v => v.id === otherLoadMatch.carregamentoId);
            problems.push(
              `DIVERGÊNCIA: O embarque ${item.n} (${item.c}) pertence ao veículo "${alternateVehicle?.name || 'Desconhecido'}"!`
            );
          } else {
            problems.push(
              `ALERTA: O embarque ${item.n} (${item.c}) não está cadastrado em nenhuma planilha de transportes!`
            );
          }
        } else {
          validShipmentNumbers.push(item.n);
        }
      });

      // 3. Formulate scan result
      const isDivergent = problems.length > 0;
      const incorrectCarrier = associatedLoadId !== activeVehicleId;
      
      if (incorrectCarrier && problems.length === 0) {
        problems.push(
          `O palete foi montado originalmente para o veículo ID ${associatedLoadId.substring(0, 8)}, mas está sendo carregado no veículo atual.`
        );
      }

      if (isDivergent) {
        // Red Light Alert: Dangerous cross-docking loading error
        setScanFeedback({
          status: 'warn',
          title: 'ALERTA DE SEGURANÇA: DIVERGÊNCIA',
          description: `Bloqueie o carregamento! O palete ${palletId} contém embarques que não pertencem ao veículo de programação selecionado:`,
          palletId,
          problems
        });

        appendLog(palletId, 'warn', `Barrado por divergências: ${problems.join('; ')}`);
      } else {
        // Green Light: Fully correct loading according to plan!
        // A) Update Pallet internal state in app to 'loaded'
        setPallets(prev =>
          prev.map(p => (p.id === palletId ? { ...p, loaded: true, loadedAt: new Date().toISOString(), loadedVehicleId: activeVehicleId } : p))
        );

        // B) Update physical Shipment status values to 'Carregado' only when all pallets of this shipment are loaded
        setShipments(prev =>
          prev.map(sh => {
            if (validShipmentNumbers.includes(sh.shipmentNumber) && sh.carregamentoId === activeVehicleId) {
              const updatedPallets = pallets.map(p => p.id === palletId ? { ...p, loaded: true } : p);
              const palletsWithThisShipment = updatedPallets.filter(p => 
                p.carregamentoId === activeVehicleId && 
                p.shipments.some(item => item.shipmentNumber === sh.shipmentNumber)
              );
              const allPalletsLoaded = palletsWithThisShipment.length > 0 && palletsWithThisShipment.every(p => p.loaded);
              
              if (allPalletsLoaded) {
                return { ...sh, status: 'Carregado' };
              } else {
                return sh; // preserve 'Pendente' or 'Montado' status until all its pallets are loaded
              }
            }
            return sh;
          })
        );

        setScanFeedback({
          status: 'success',
          title: 'Aprovado para Embarque!',
          description: `O palete ${palletId} foi validado com sucesso contra a planilha planejada. ${scannedShipments.length} volumes colocados no caminhão.`,
          palletId
        });

        appendLog(palletId, 'success', `Carregamento autorizado no veículo. ${scannedShipments.length} embarques integrados.`);

        // Check if this was the last pallet of the load to be loaded
        const vehiclePallets = pallets.filter(p => p.carregamentoId === activeVehicleId);
        const otherPallets = vehiclePallets.filter(p => p.id !== palletId);
        const allOthersLoaded = otherPallets.length === 0 || otherPallets.every(p => p.loaded);
        if (allOthersLoaded && vehiclePallets.length > 0) {
          setShowConcludedModal(true);
          if (setCarregamentos) {
            setCarregamentos(prev =>
              prev.map(c => (c.id === activeVehicleId ? { ...c, status: 'Concluido' } : c))
            );
          }
        } else {
          // Transition the load itself to 'Em_Andamento' if it is 'Pendente'
          if (setCarregamentos) {
            setCarregamentos(prev =>
              prev.map(c => (c.id === activeVehicleId && c.status === 'Pendente' ? { ...c, status: 'Em_Andamento' } : c))
            );
          }
        }
      }

      setScannedQrString('');
    } catch (e) {
      setScanFeedback({
        status: 'error',
        title: 'Código QR Não Reconhecido',
        description: 'Não foi possível interpretar os dados deste QR code. Certifique-se de escanear uma etiqueta de palete Genomma válida gerada na Sessão 2.'
      });
      setScannedQrString('');
    }
  };

  const appendLog = (palletId: string, status: 'success' | 'warn' | 'error', details: string) => {
    setScanningLogs(prev => [
      {
        id: 'log_' + Date.now(),
        timestamp: new Date().toLocaleTimeString('pt-BR'),
        palletId,
        status,
        details
      },
      ...prev
    ]);
  };

  const handleUnloadPallet = (palletId: string) => {
    const targetPallet = pallets.find(p => p.id === palletId);
    if (!targetPallet) return;

    // A) Set pallet loaded = false
    setPallets(prev =>
      prev.map(p => {
        if (p.id === palletId) {
          const { loadedAt: _, loadedVehicleId: __, ...rest } = p;
          return { ...rest, loaded: false };
        }
        return p;
      })
    );

    // B) Set shipments inside this pallet back to 'Montado'
    const palletShipmentNumbers = targetPallet.shipments.map(s => s.shipmentNumber);
    setShipments(prev =>
      prev.map(sh => {
        if (palletShipmentNumbers.includes(sh.shipmentNumber) && sh.carregamentoId === activeVehicleId) {
          return { ...sh, status: 'Montado' as const };
        }
        return sh;
      })
    );

    // C) Set load status back to 'Em_Andamento'
    if (setCarregamentos) {
      setCarregamentos(prev =>
        prev.map(c => (c.id === activeVehicleId ? { ...c, status: 'Em_Andamento' as const } : c))
      );
    }

    appendLog(palletId, 'warn', 'Palete estornado. Retornado ao pátio.');
  };

  const handleSimulateQuickScan = (pallet: Pallet) => {
    // Generate simulated QR payload structure
    const qrText = JSON.stringify({
      p: pallet.id,
      c: pallet.carregamentoId,
      s: pallet.shipments.map(sh => ({
        n: sh.shipmentNumber,
        c: sh.clientName,
        t: sh.carrierName,
        v: sh.volumes
      }))
    });
    handleProcessScan(qrText);
  };

  const resetLoadingSessionState = () => {
    setScanFeedback(null);
    setScanningLogs([]);
  };

  // Metrics calculating
  const activeVehicle = carregamentos.find(v => v.id === activeVehicleId);
  const totalVehicleShipments = shipments.filter(s => s.carregamentoId === activeVehicleId);
  const pendingCount = totalVehicleShipments.filter(s => s.status !== 'Carregado').length;
  const loadedCount = totalVehicleShipments.filter(s => s.status === 'Carregado').length;
  
  const loadingProgress = totalVehicleShipments.length > 0 
    ? Math.round((loadedCount / totalVehicleShipments.length) * 100) 
    : 0;

  // Let's also fetch total pallets created for SP/South that are loaded vs total
  const vehiclePallets = pallets.filter(p => p.carregamentoId === activeVehicleId);
  const loadedPalletsCount = vehiclePallets.filter(p => p.loaded).length;

  const getPalletNumber = (p: Pallet | null) => {
    if (!p) return 1;
    const siblingPallets = pallets.filter(item => item.carregamentoId === p.carregamentoId);
    const sorted = [...siblingPallets].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const index = sorted.findIndex(item => item.id === p.id);
    return index !== -1 ? index + 1 : 1;
  };

  const loadedPalletShipments = vehiclePallets
    .filter(p => p.loaded)
    .flatMap((p, pIdx) => p.shipments.map((sh, sIdx) => ({
      ...sh,
      uniqueId: `${p.id}-${sh.shipmentNumber}-${pIdx}-${sIdx}`,
      palletId: p.id,
      palletNumber: getPalletNumber(p)
    })));

  return (
    <div className="space-y-6 font-sans">
      {/* Visual Workspace Intro banner */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Truck className="w-40 h-40" />
        </div>
        <div className="relative z-15 max-w-3xl">
          <span className="bg-blue-600 text-white font-mono text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-lg shadow-blue-500/20">
            Painel de Portaria e Carregamento de Caminhões
          </span>
          <h2 className="text-2xl font-bold tracking-tight mt-2.5 sm:text-3xl text-white font-sans">
            Conferência e Embarque de Cargas
          </h2>
          <p className="mt-1 text-slate-350 text-sm max-w-2xl leading-relaxed">
            Área de conferência final ("Double-Check") à beira da doca. Selecione o veículo que está sendo carregado, faça a bipa do palete montado e verifique se as caixas estão correspondendo exatamente à planilha do planejamento.
          </p>
        </div>
      </div>

      {visibleCarregamentos.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-xs text-center max-w-xl mx-auto space-y-4 font-sans mt-8">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-md">
            <CheckCircle2 className="w-10 h-10 animate-bounce" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Tudo Pronto - Expedição Concluída!</h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            Não há veículos pendentes de conferência ou carregamento no momento. Todos os paletes planejados foram completamente embarcados e validados nas docas. A frota está pronta e devidamente expedida!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left column: Controls & Scanner simulation */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              
              {/* Step 1: Select Active Vehicle */}
              <div className="mb-5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono mb-2">
                  1. Selecione o Veículo Operando
                </label>
                <select
                  value={activeVehicleId}
                  onChange={e => {
                    setActiveVehicleId(e.target.value);
                    setScanFeedback(null);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-850 text-sm font-semibold rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                >
                  {visibleCarregamentos.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              <p className="text-[10px] text-slate-400 mt-1">
                Todas as leituras de QR codes de paletes serão validadas contra este planejamento.
              </p>

              {activeVehicleId && (
                <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/10">
                      <Boxes className="w-4.5 h-4.5 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-[9px] font-extrabold text-blue-900 leading-tight uppercase font-mono">CONTAGEM LOGÍSTICA</h4>
                      <p className="text-[11px] font-sans text-slate-705 font-bold mt-0.5">Paletes programados</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-xs font-black text-blue-700 bg-white border border-blue-200 px-2.5 py-1 rounded-lg shadow-2xs font-mono">
                      {vehiclePallets.length} {vehiclePallets.length === 1 ? 'PALETE' : 'PALETES'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <hr className="border-slate-100 my-4" />

            {/* Step 2: Input QR code */}
            <div className="space-y-3.5">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">
                2. Entrada do Leitor de QR Code / Câmera
              </label>

              {/* QR Reader Area */}
              <div className="bg-slate-950 rounded-xl p-4 text-center border-2 border-slate-900 flex flex-col items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                
                {isCameraActive ? (
                  <div className="w-full flex flex-col items-center">
                    <span className="text-[10px] text-blue-400 font-mono animate-pulse mb-2 tracking-wider font-extrabold uppercase">
                      Scanner em Tempo Real Ativo
                    </span>
                    
                    {/* Viewfinder element wrapper with rounded boundaries and overlay targeting outlines */}
                    <div className="w-full aspect-square max-w-[280px] relative mb-3.5 overflow-hidden rounded-2xl border-2 border-blue-500 bg-slate-900 shadow-inner">
                      {/* Darkened mask on outer bounds */}
                      <div className="absolute inset-0 bg-slate-950/40 pointer-events-none z-10" />

                      {/* Laser alignment Target Reticle */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[72%] h-[72%] bg-transparent border border-blue-400/80 rounded-lg shadow-[0_0_0_9999px_rgba(15,23,42,0.65)] z-20 pointer-events-none">
                        {/* High visibility neon double-corners */}
                        <div className="absolute -top-[3px] -left-[3px] w-6 h-6 border-t-[3.5px] border-l-[3.5px] border-blue-400 rounded-tl-md"></div>
                        <div className="absolute -top-[3px] -right-[3px] w-6 h-6 border-t-[3.5px] border-r-[3.5px] border-blue-400 rounded-tr-md"></div>
                        <div className="absolute -bottom-[3px] -left-[3px] w-6 h-6 border-b-[3.5px] border-l-[3.5px] border-blue-400 rounded-bl-md"></div>
                        <div className="absolute -bottom-[3px] -right-[3px] w-6 h-6 border-b-[3.5px] border-r-[3.5px] border-blue-400 rounded-br-md"></div>

                        {/* Smooth active laser scanner bar */}
                        <div className="absolute left-1 right-1 h-0.5 bg-red-500 animate-[bounce_2s_infinite] pointer-events-none" style={{ boxShadow: '0 0 10px 2.5px rgba(239, 68, 68, 0.95)' }} />
                      </div>

                      {/* Mount target where video layer is dynamically rendered */}
                      <video
                        ref={videoRef}
                        playsInline
                        autoPlay
                        muted
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Camera Select dropdown for multi lens systems */}
                    {availableCameras.length > 1 && (
                      <div className="w-full mb-3 px-1">
                        <label className="block text-[10.5px] text-slate-400 font-bold mb-1 uppercase font-mono text-left">
                          Trocar Lente / Câmera:
                        </label>
                        <select
                          value={selectedCameraId}
                          onChange={(e) => handleCameraChange(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg text-xs py-2 px-2.5 font-bold outline-none cursor-pointer"
                        >
                          {availableCameras.map((device, i) => (
                            <option key={device.deviceId} value={device.deviceId}>
                              {device.label || `Lente ${i + 1}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={stopLiveCamera}
                      className="w-full flex items-center justify-center gap-2 bg-red-650 hover:bg-red-750 text-white text-xs font-black py-3 px-4 rounded-xl shadow-md cursor-pointer transition-colors"
                    >
                      <CameraOff className="w-4 h-4" />
                      Fechar Câmera
                    </button>
                  </div>
                ) : (
                  <div className="w-full flex flex-col items-center py-2">
                    <QrCode className="w-11 h-11 text-blue-500 animate-pulse my-2" />
                    
                    <p className="text-xs text-slate-450 tracking-tight px-3 mt-1 leading-normal max-w-sm">
                      Aponte a câmera para ler as etiquetas. A detecção e conferência ocorrem instantaneamente em tempo real sem precisar tirar fotos.
                    </p>

                    <button
                      type="button"
                      onClick={() => startLiveCamera()}
                      className="w-full mt-4 flex items-center justify-center gap-2.5 bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-700 hover:to-indigo-755 text-white text-xs font-black py-3.5 px-4 rounded-xl shadow-md active:scale-[0.98] transition-all cursor-pointer"
                    >
                      <Camera className="w-4 h-4 animate-pulse" />
                      <span>Ligar Câmera e Escanear</span>
                    </button>

                    {scanError && (
                      <p className="text-[10px] text-red-400 mt-2.5 font-bold px-2.5 bg-red-950/40 py-2 rounded-lg border border-red-900/30 w-full animate-shake leading-normal text-left">
                        {scanError}
                      </p>
                    )}

                    {/* Simulated text receiver / manual keyboard fallback */}
                    <input
                      type="text"
                      value={scannedQrString}
                      onChange={e => handleProcessScan(e.target.value)}
                      placeholder="Ou digite / use leitor USB de mão..."
                      className="w-full mt-4 bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-center font-mono text-blue-400 outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-slate-650"
                    />
                  </div>
                )}
              </div>

              {/* Paste helper option */}
              <div className="text-[10px] text-slate-450 flex items-center justify-center gap-1.5 py-1">
                <Clipboard className="w-3.5 h-3.5 text-slate-400 font-bold" />
                <span>O leitor USB emula digitação e bipa na hora.</span>
              </div>
            </div>

          </div>
        </div>

        {/* Center column & Right columns: Loader screens, visual progress and alerts */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Scan result response display */}
          <AnimatePresence mode="wait">
            {scanFeedback ? (
              <motion.div
                key={scanFeedback.palletId || 'empty_scan'}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`p-5 rounded-2xl border-2 shadow-sm ${
                  scanFeedback.status === 'success'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : scanFeedback.status === 'warn'
                    ? 'bg-amber-50 border-amber-400 text-amber-950 shadow-md ring-2 ring-amber-100'
                    : 'bg-red-50 border-red-300 text-red-950'
                }`}
              >
                <div className="flex items-start gap-4">
                  {scanFeedback.status === 'success' && (
                    <CheckCircle2 className="w-9 h-9 text-emerald-600 shrink-0 mt-0.5" />
                  )}
                  {scanFeedback.status === 'warn' && (
                    <AlertTriangle className="w-9 h-9 text-amber-600 shrink-0 mt-0.5 animate-bounce" />
                  )}
                  {scanFeedback.status === 'error' && (
                    <ShieldAlert className="w-9 h-9 text-red-600 shrink-0 mt-0.5" />
                  )}

                  <div className="space-y-1.5 flex-1 min-w-0">
                    <h4 className="font-extrabold text-sm uppercase tracking-tight font-sans">
                      {scanFeedback.title}
                    </h4>
                    <p className="text-xs font-medium leading-relaxed">
                      {scanFeedback.description}
                    </p>

                    {/* Problem list specifically for shipper warnings */}
                    {scanFeedback.problems && scanFeedback.problems.length > 0 && (
                      <div className="bg-white/80 border border-amber-200 mt-3 p-3 rounded-lg space-y-1.5 text-[11px] text-red-900 font-mono">
                        <strong className="text-[10px] text-amber-800 uppercase block font-bold tracking-wider font-sans border-b border-amber-100 pb-1 mb-1">
                          BLOQUEIO OPERACIONAL POR INCONSISTÊNCIA:
                        </strong>
                        {scanFeedback.problems.map((prob, idx) => (
                          <div key={idx} className="flex gap-1.5 items-start">
                            <span className="text-red-600 font-black shrink-0">●</span>
                            <span className="font-semibold">{prob}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setScanFeedback(null)}
                    className="p-1 rounded bg-black/5 hover:bg-black/10 text-slate-500 font-bold transition-all text-xs"
                  >
                    OK
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 p-8 rounded-2xl text-center text-slate-400 text-xs font-mono">
                Aguardando leitura de códigos QR para iniciar verificação ("Double-Check" de Portaria).
              </div>
            )}
          </AnimatePresence>

          {/* Visual Truck Capacity Representation */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">
                  Status de Ocupação Física do Veículo
                </h3>
                <p className="text-xs text-slate-500">
                  {activeVehicle?.name || 'Caminhão Operando'}
                </p>
              </div>

              {/* Progress pill */}
              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                {/* Embarques info */}
                <div className="flex items-center gap-2">
                  <div className="text-right font-mono text-[11px]">
                    <span className="text-slate-400">EMBARQUES:</span>{' '}
                    <strong className="text-slate-850 font-bold">{loadedCount}/{totalVehicleShipments.length}</strong>
                  </div>
                  <div className="bg-emerald-600 text-white font-mono font-black text-xs px-2.5 py-1 rounded-full">
                    {loadingProgress}%
                  </div>
                </div>

                {/* Divider */}
                <div className="h-5 w-px bg-slate-200 hidden xs:block" />

                {/* Paletes info */}
                <div className="flex items-center gap-2">
                  <div className="text-right font-mono text-[11px]">
                    <span className="text-slate-400">PALETES:</span>{' '}
                    <strong className="text-slate-850 font-bold">{loadedPalletsCount}/{vehiclePallets.length}</strong>
                  </div>
                  <div className="bg-indigo-600 text-white font-mono font-black text-xs px-2.5 py-1 rounded-full">
                    {vehiclePallets.length > 0 ? Math.round((loadedPalletsCount / vehiclePallets.length) * 100) : 0}%
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive schematic representation of the trailer */}
            <div className="bg-slate-900 rounded-2xl p-6 shadow-inner relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Truck className="w-56 h-56 text-white" />
              </div>

              <div className="flex items-center gap-4">
                {/* Truck Cabin Symbol */}
                <div className="w-16 h-24 bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg flex flex-col justify-between p-2 shadow shrink-0 text-white font-mono text-center relative border border-slate-600">
                  <div className="h-6 bg-slate-900 border-b border-slate-700 rounded-t flex items-center justify-center text-[9px] font-bold text-slate-400">
                    CABINE
                  </div>
                  <div className="text-[10px] font-bold text-emerald-400 transform -rotate-90">
                    DRIVE
                  </div>
                  <div className="text-[8px] tracking-tight truncate font-sans text-slate-300">
                    {activeVehicle?.name.split('Placa ')[1]?.replace(')', '') || 'GNM-GEN'}
                  </div>
                </div>

                {/* Loading Trailer Area */}
                <div className="flex-1 bg-slate-950 border-2 border-slate-800 p-4 rounded-xl flex items-center gap-3 overflow-x-auto min-h-[110px]">
                  {vehiclePallets.length === 0 ? (
                    <div className="text-center w-full text-[11px] text-slate-500 font-mono py-6">
                      Aguardando montagem ou importação de paletes para esta rota...
                    </div>
                  ) : (
                    <div className="flex gap-2.5">
                      {vehiclePallets.map((p, idx) => (
                        <div
                          key={p.id}
                          className={`w-28 p-2 rounded-lg text-[10px] font-mono border transition-all duration-300 text-center flex flex-col justify-between shrink-0 h-[80px] ${
                            p.loaded
                              ? 'bg-emerald-950/70 border-emerald-500 text-emerald-200 shadow-md ring-1 ring-emerald-500/50'
                              : 'bg-slate-900/40 border-dashed border-slate-850 text-slate-500'
                          }`}
                        >
                          <div>
                            <span className="text-[8px] font-bold block text-slate-400">
                              ESP #{idx + 1}
                            </span>
                            <strong className="block text-white tracking-tight text-[11px]">
                              {p.id}
                            </strong>
                          </div>
                          
                          {p.loaded ? (
                            <button
                              type="button"
                              onClick={() => handleUnloadPallet(p.id)}
                              className="w-full bg-emerald-800 hover:bg-red-700 hover:text-white text-emerald-200 py-0.5 rounded text-[8.5px] font-bold uppercase transition-all cursor-pointer"
                              title="Clique para estornar e remover este palete do veículo"
                            >
                              ● CARREGADO
                            </button>
                          ) : (
                            <div className="py-0.5 rounded text-[8px] font-bold uppercase bg-slate-800 text-slate-400">
                              ◌ FORA
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Checklist of planned shipments yet to be scanned */}
            <div className="space-y-3.5 pt-2">
              {/* Mobile interactive tab toggle (Visible only on mobile/small screens) */}
              <div className="md:hidden flex bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setMobileTab('all')}
                  className={`flex-1 text-center py-2 text-[11px] font-sans font-bold rounded-lg transition-all ${
                    mobileTab === 'all'
                      ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/50'
                      : 'text-slate-500'
                  }`}
                >
                  Tudo
                </button>
                <button
                  type="button"
                  onClick={() => setMobileTab('scanned')}
                  className={`flex-1 text-center py-2 text-[11px] font-sans font-bold rounded-lg transition-all ${
                    mobileTab === 'scanned'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-500'
                  }`}
                >
                  Bipadas ({loadedPalletShipments.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMobileTab('pending')}
                  className={`flex-1 text-center py-2 text-[11px] font-sans font-bold rounded-lg transition-all ${
                    mobileTab === 'pending'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'text-slate-500'
                  }`}
                >
                  Pendentes ({pendingCount})
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Box A: Loaded checksheets */}
                <div className={`border border-slate-150 rounded-xl p-4 bg-slate-50 ${
                  mobileTab === 'pending' ? 'hidden md:block' : 'block'
                }`}>
                  <span className="font-mono text-[10px] uppercase font-extrabold text-emerald-700 tracking-tight block border-b border-slate-200 pb-1.5 mb-2 flex items-center justify-between">
                    <span>CAIXAS BI-PASSADAS ({loadedPalletShipments.length})</span>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  </span>

                  {loadedPalletShipments.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic py-2">Nenhuma caixa carregada.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                      {loadedPalletShipments.map(sh => (
                        <div key={sh.uniqueId} className="flex justify-between items-center text-xs font-mono text-slate-700 bg-white p-2 rounded border border-slate-200 shadow-3xs">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900">{sh.shipmentNumber}</span>
                            <span className="text-[9px] text-slate-450 uppercase font-sans font-bold">
                              Palete {sh.palletNumber} ({sh.palletId.substring(4, 12)})
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 truncate max-w-[120px] font-sans font-medium uppercase">{sh.clientName}</span>
                          <span className="text-[10px] font-black bg-blue-50 border border-blue-200 text-blue-700 px-1.5 py-0.5 rounded font-mono">
                            {sh.volumes} Vol
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Box B: Still missing checks */}
                <div className={`border border-slate-150 rounded-xl p-4 bg-slate-50 ${
                  mobileTab === 'scanned' ? 'hidden md:block' : 'block'
                }`}>
                  <span className="font-mono text-[10px] uppercase font-extrabold text-amber-700 tracking-tight block border-b border-slate-200 pb-1.5 mb-2 flex items-center justify-between">
                    <span>PENDENTES DE EMBARQUE ({pendingCount})</span>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  </span>

                  {pendingCount === 0 ? (
                    <p className="text-[11px] text-slate-400 italic py-2">Todas as mercadorias foram embarcadas com sucesso! Veículo liberado.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                      {totalVehicleShipments.filter(s => s.status !== 'Carregado').map(sh => (
                        <div key={sh.id} className="flex justify-between items-center text-xs font-mono text-slate-700 bg-white p-2 rounded border border-slate-200">
                          <span className="font-bold text-slate-800">{sh.shipmentNumber}</span>
                          <span className="text-[10px] text-slate-500 truncate max-w-[120px]">{sh.clientName}</span>
                          <span className="text-[9px] bg-slate-155 text-slate-650 px-1 py-0.2 rounded-xs uppercase tracking-tight font-bold">{sh.status === 'Montado' ? 'No palete' : 'Separando'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Logging Console block */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 font-mono">
                Histórico de Leituras e Validações
              </h3>

              {scanningLogs.length > 0 && (
                <button
                  type="button"
                  onClick={resetLoadingSessionState}
                  className="text-[10px] text-slate-450 hover:text-red-500 hover:underline cursor-pointer"
                >
                  Limpar Relatório
                </button>
              )}
            </div>

            {scanningLogs.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 font-mono">
                Sem registros de scans realizados.
              </div>
            ) : (
              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                {scanningLogs.map(log => (
                  <div
                    key={log.id}
                    className={`p-2.5 rounded-lg border text-xs font-mono flex items-start gap-2.5 ${
                      log.status === 'success'
                        ? 'bg-emerald-50/60 border-emerald-150 text-slate-700'
                        : log.status === 'warn'
                        ? 'bg-amber-50/70 border-amber-200 text-slate-700'
                        : 'bg-red-50/60 border-red-150 text-slate-700'
                    }`}
                  >
                    <span className="text-[10px] text-slate-400 font-bold shrink-0 mt-0.5">[{log.timestamp}]</span>
                    <strong className="text-slate-800 shrink-0 font-bold">{log.palletId}</strong>
                    <span className="text-slate-600 truncate flex-1">{log.details}</span>
                    <span className={`text-[9px] uppercase font-bold shrink-0 px-1 rounded ${
                      log.status === 'success' 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : log.status === 'warn' 
                        ? 'bg-amber-100 text-amber-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {log.status === 'success' ? 'AUTORIZADO' : log.status === 'warn' ? 'RETIDO' : 'ERRO'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      )}

      {/* Concluded Load Celebration Modal */}
      <AnimatePresence>
        {showConcludedModal && (
          <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl border border-slate-100 p-6 text-center space-y-4 relative"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
              
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-10 h-10 animate-bounce" />
              </div>

              <div className="space-y-2 font-sans">
                <h3 className="text-md font-bold text-slate-900 uppercase tracking-tight">
                  Carregamento Finalizado!
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                  Excelente trabalho! Todos os paletes vinculados a esta rota de expedição foram validados e carregados com segurança.
                </p>
              </div>

              {/* Vehicle info & statistics summary */}
              <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 text-left space-y-2.5 font-sans">
                <div className="flex justify-between items-center text-xs text-slate-600 border-b border-slate-100 pb-1.5">
                  <span className="font-semibold text-slate-400 font-mono uppercase text-[9px] tracking-wider">Veículo Carregado:</span>
                  <strong className="text-slate-800 font-bold text-[11px] truncate max-w-[180px]">{activeVehicle?.name || 'Desconhecido'}</strong>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-600 border-b border-slate-100 pb-1.5">
                  <span className="font-semibold text-slate-400 font-mono uppercase text-[9px] tracking-wider">Paletes Embarcados:</span>
                  <strong className="text-emerald-700 font-black font-mono">{vehiclePallets.length} de {vehiclePallets.length}</strong>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-600">
                  <span className="font-semibold text-slate-400 font-mono uppercase text-[9px] tracking-wider">Volumes Totais:</span>
                  <strong className="text-slate-900 font-bold font-mono">
                    {vehiclePallets.reduce((acc, curr) => acc + curr.shipments.reduce((sum, item) => sum + item.volumes, 0), 0)} Volumes
                  </strong>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowConcludedModal(false)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-3 rounded-xl transition-all shadow-md shadow-emerald-500/10 active:scale-98 cursor-pointer"
                >
                  OK - Concluído
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
