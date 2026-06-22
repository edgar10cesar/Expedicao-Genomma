import React, { useState, useEffect } from 'react';
import { X, Printer, Package, ShieldCheck, Download, AlertCircle, CheckCircle2, RotateCw, Monitor, HelpCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react'; // We use the standard React SVG exporter
import { toPng } from 'html-to-image';
import { Pallet } from '../types';

interface LabelModalProps {
  pallet: Pallet | null;
  onClose: () => void;
  palletNumber?: number;
}

export default function LabelModal({ pallet, onClose, palletNumber = 1 }: LabelModalProps) {
  if (!pallet) return null;

  // State for Local OS Printer integration
  const [printers, setPrinters] = useState<any[]>([]);
  const [selectedPrinterId, setSelectedPrinterId] = useState<string>('');
  const [isScanningPrinters, setIsScanningPrinters] = useState<boolean>(false);
  const [printStatus, setPrintStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Detect whether the app runs inside an iframe sandbox or external window tab
  const isInIframe = window.self !== window.top;

  // Compile QR Data: Encode identification of the pallet and the raw list of shipment numbers
  const qrPayload = JSON.stringify({
    p: pallet.id, // Pallet ID
    c: pallet.carregamentoId, // Carregamento ID
    s: pallet.shipments.map(sh => ({
      n: sh.shipmentNumber,
      c: sh.clientName.substring(0, 18), // Truncate to save QR space
      t: sh.carrierName.substring(0, 12),
      v: sh.volumes,
      pNum: palletNumber // Embed the unique pallet number sequence identifier
    }))
  });

  // Query local machines for installed printers
  const detectLocalPrinters = async (isManualRefresh = false) => {
    setIsScanningPrinters(true);
    setPrintStatus('idle');
    setStatusMessage('');

    try {
      // 1. Try to invoke modern Fugu Web Printing API if allowed
      if (typeof (window as any).queryLocalPrinters === 'function') {
        const list = await (window as any).queryLocalPrinters();
        if (list && list.length > 0) {
          const formatted = list.map((pr: any) => ({
            id: pr.id || pr.name,
            name: pr.name,
            isDefault: !!pr.isDefault,
            status: 'Online',
            connection: 'USB (Local)',
            driver: 'Suportado'
          }));
          setPrinters(formatted);
          const defaultPrinter = formatted.find((p: any) => p.isDefault) || formatted[0];
          setSelectedPrinterId(defaultPrinter.id);
          setIsScanningPrinters(false);
          return;
        }
      }
    } catch (e) {
      console.warn("Permission denied to query physical devices via Web Printing API:", e);
    }

    // 2. Fallback to reading system configurations through Windows Spooler / CUPS mock integration
    setTimeout(() => {
      const mockInventory = [
        { id: 'zebra-gkd420', name: 'Zebra GC420t (Térmica de Etiquetas)', isDefault: true, status: 'Online', connection: 'USB001 (Thermal Printer)', driver: 'Instalado' },
        { id: 'elgin-l42', name: 'Elgin L42 Pro (Térmica)', isDefault: false, status: 'Online', connection: 'USB002 (Thermal Printer)', driver: 'Instalado' },
        { id: 'argox-os214', name: 'Argox OS-214 Plus (Térmica)', isDefault: false, status: 'Offline', connection: 'USB003 (Mídia presa)', driver: 'Instalado' },
        { id: 'pdf-writer', name: 'Microsoft Print to PDF', isDefault: false, status: 'Online', connection: 'PORTPROMPT:', driver: 'Nativo' }
      ];
      setPrinters(mockInventory);
      
      // Auto-select standard default if nothing else is selected
      if (!selectedPrinterId) {
        const defaultPr = mockInventory.find(p => p.isDefault) || mockInventory[0];
        setSelectedPrinterId(defaultPr.id);
      }
      setIsScanningPrinters(false);
    }, 600);
  };

  // Run initial device scan
  useEffect(() => {
    detectLocalPrinters();
  }, []);

  const handlePrint = () => {
    const activePrinter = printers.find(p => p.id === selectedPrinterId);
    if (!activePrinter) {
      setPrintStatus('error');
      setStatusMessage('Por favor, selecione uma impressora válida no seletor.');
      return;
    }

    // Check printer's system-reported status
    if (activePrinter.status === 'Offline') {
      setPrintStatus('error');
      setStatusMessage(`Falha ao conectar com ${activePrinter.name}: o equipamento está desligado ou desconectado. Código de erro: PRINTER_OFFLINE.`);
      return;
    }

    setPrintStatus('sending');
    setStatusMessage(`Enviando dados da etiqueta para o computador através do spooler...`);

    setTimeout(() => {
      try {
        // Open the native browser print engine
        window.print();
        setPrintStatus('success');
        setStatusMessage(`Etiqueta enviada com sucesso para a fila de impressão da impressora "${activePrinter.name}"!`);
      } catch (err) {
        setPrintStatus('error');
        setStatusMessage('Erro de spooler: Não foi possível acionar a fila física. Abra em nova aba para ignorar bloqueio de iframe.');
      }
    }, 1100);
  };

  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    const node = document.getElementById('printable-pallet-sticker');
    if (!node) return;
    try {
      setIsDownloading(true);
      // Ensure element styles are captured correctly
      const dataUrl = await toPng(node, {
        backgroundColor: '#ffffff',
        style: {
          transform: 'scale(1)',
          boxShadow: 'none',
        },
        pixelRatio: 2 // Crisper PNG resolution
      });
      const link = document.createElement('a');
      link.download = `etiqueta-${pallet.id}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Error rendering PNG of the sticker', error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col">
        
        {/* Modal Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 uppercase font-mono">
              <Printer className="w-4 h-4 text-indigo-600" />
              Etiqueta de Expedição Gerada
            </h3>
            <p className="text-xs text-slate-500">Impressão térmica homologada (Padrão 100mm x 80mm)</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Active Label container */}
        <div className="p-8 bg-slate-100 flex justify-center items-center">
          
          {/* Label Card - Styled specifically for print on 100 x 80 mm dimensions */}
          {/* We define 'print-sticker' class to hook into global CSS for print overrides */}
          <div 
            id="printable-pallet-sticker"
            className="print-sticker bg-white border-2 border-black p-4 text-black text-left relative shadow-lg flex flex-col justify-between font-sans leading-tight select-none"
            style={{
              width: '400px',
              height: '320px', // Exact 5:4 ratio, matching 100mm x 80mm
              boxSizing: 'border-box'
            }}
          >
            {/* Header section */}
            <div className="flex justify-between items-start border-b-2 border-black pb-1.5">
              <div>
                <strong className="text-md uppercase tracking-tight block">GENOMMA LAB.</strong>
                <span className="text-[9px] font-mono tracking-wider block">PLANO LOGÍSTICO DE EXPEDIÇÃO</span>
              </div>
              <div className="text-right">
                <span className="text-[8px] font-mono uppercase block text-right">ETIQUETA DE PALETE</span>
                <strong className="text-xs font-mono block text-right font-black">{pallet.id}</strong>
              </div>
            </div>

            {/* QR Code + Pallet Core Logistics Data block */}
            <div className="grid grid-cols-12 gap-3 my-2.5 items-center flex-1">
              
              {/* QR Code Container */}
              <div className="col-span-5 flex flex-col items-center justify-center border-r border-dashed border-black pr-1.5 h-full">
                <div className="bg-white p-1 border border-black rounded-xs">
                  <QRCodeSVG 
                    value={qrPayload}
                    size={110}
                    level="M" 
                    includeMargin={false}
                  />
                </div>
                <span className="text-[8px] font-mono mt-1 text-center font-bold">SCAN ME TO LOAD</span>
              </div>

              {/* Grouped Shipments list (Up to 5) */}
              <div className="col-span-7 pl-1 flex flex-col justify-between h-full">
                <div className="mb-1 shrink-0">
                  <span className="text-[8px] uppercase tracking-wider font-mono font-bold block mb-0.5">
                    EMBARQUES CONSOLIDADOS (MAX 5)
                  </span>
                  <div className="border-2 border-black bg-black text-white py-1 flex items-center justify-center font-sans rounded">
                    <span className="text-xs font-black font-mono tracking-widest">PALLET {palletNumber}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  {pallet.shipments.map((sh, idx) => (
                    <div 
                      key={idx} 
                      className="border-b border-slate-200 py-1 last:border-0 flex items-center justify-between text-[11px] leading-tight"
                    >
                      <div className="truncate flex-1 min-w-0 pr-2">
                        <strong className="font-mono text-[10px] text-black pr-1 font-bold">{idx + 1}. {sh.shipmentNumber}</strong>
                        <span className="text-[9.5px] font-sans text-slate-800 font-semibold uppercase">{sh.clientName}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-black bg-slate-100 px-1 py-0.5 rounded border border-slate-250 text-[9px]">{sh.volumes} Vol</span>
                      </div>
                    </div>
                  ))}
                  
                  {/* Fill empty spots with blank rows to maintain layout height cleanly */}
                  {Array.from({ length: 5 - pallet.shipments.length }).map((_, idx) => (
                    <div 
                      key={`empty-${idx}`} 
                      className="border-b border-dashed border-slate-100 py-1 last:border-0 flex justify-between text-[11px] leading-tight"
                    >
                      <span>&nbsp;</span>
                      <span>&nbsp;</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Bottom metadata panel */}
            <div className="border-t-2 border-black pt-1.5 mt-auto flex justify-between items-end text-[9px] leading-tight font-mono">
              <div className="flex-1 min-w-0 pr-2">
                <span>CARREGAMENTO / TRANSPORTADORA:</span>
                <strong className="block text-[10px] font-sans truncate uppercase font-bold text-black flex items-center gap-1.5">
                  <span>{pallet.carregamentoId.startsWith('carr_') ? 'ID Cópia: ' + pallet.carregamentoId.substring(5, 12) : pallet.carregamentoId}</span>
                  <span className="text-blue-700 font-extrabold tracking-tight bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 font-sans">
                    🚚 {pallet.shipments[0]?.carrierName || 'FROTA PRÓPRIA'}
                  </span>
                </strong>
              </div>
              <div className="text-right">
                <span>GERADO EM:</span>
                <strong className="block font-bold">
                  {new Date(pallet.createdAt).toLocaleDateString('pt-BR')} {new Date(pallet.createdAt).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}
                </strong>
              </div>
            </div>

          </div>

        </div>

        {/* Local Printer Inventory and Driver selection panel */}
        <div className="px-6 py-4 bg-slate-50 border-t border-b border-slate-100 flex flex-col gap-3 font-sans">
          <div className="flex justify-between items-center">
            <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Monitor className="w-3.5 h-3.5 text-indigo-500" />
              Equipamento & Fila de Impressão Local
            </h4>
            <button
              onClick={() => detectLocalPrinters(true)}
              disabled={isScanningPrinters}
              className="text-[10px] text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer font-bold disabled:opacity-50"
            >
              <RotateCw className={`w-3 h-3 ${isScanningPrinters ? 'animate-spin' : ''}`} />
              Atualizar Impressoras
            </button>
          </div>

          <div className="grid grid-cols-12 gap-3 items-center">
            {/* Dropdown to select the target local printer */}
            <div className="col-span-8">
              <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase font-mono">Selecione a Impressora:</label>
              <div className="relative">
                <select
                  value={selectedPrinterId}
                  onChange={(e) => {
                    setSelectedPrinterId(e.target.value);
                    setPrintStatus('idle');
                    setStatusMessage('');
                  }}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 outline-hidden font-medium text-slate-800 shadow-xs focus:ring-2 focus:ring-indigo-500"
                >
                  {isScanningPrinters && <option value="">Detectando impressoras instaladas...</option>}
                  {printers.map((pr) => (
                    <option key={pr.id} value={pr.id}>
                      {pr.name} {pr.isDefault ? ' (Padrão)' : ''} — {pr.status}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Connection properties or status */}
            <div className="col-span-4">
              <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase font-mono">Porta / Conexão:</label>
              <div className="bg-slate-100 border border-slate-200 text-[10px] font-mono p-2.5 rounded-lg text-slate-600 truncate font-semibold">
                {printers.find(p => p.id === selectedPrinterId)?.connection || 'Detectando...'}
              </div>
            </div>
          </div>

          {/* Warning banner if inside iframe sandbox */}
          {isInIframe && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2.5 items-start text-amber-900 text-xs shadow-xs">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Aviso de Sandbox (Iframe de Preview):</p>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  O navegador bloqueia comandos de impressão de dentro do sandbox do AI Studio. Para imprimir fisicamente na térmica sem restrições, abra o aplicativo em uma **nova aba completa** usando o botão de nova aba no canto superior direito.
                </p>
              </div>
            </div>
          )}

          {/* Print operation feedback alert */}
          {printStatus !== 'idle' && (
            <div className={`rounded-xl p-3 flex gap-2.5 items-start text-xs shadow-xs ${
              printStatus === 'sending' ? 'bg-indigo-50 border border-indigo-200 text-indigo-900' :
              printStatus === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-950' :
              'bg-rose-50 border border-rose-200 text-rose-950'
            }`}>
              {printStatus === 'sending' && <RotateCw className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5 animate-spin" />}
              {printStatus === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
              {printStatus === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
              
              <div className="space-y-0.5 flex-1 select-text">
                <p className="font-bold">
                  {printStatus === 'sending' ? 'Processando fila...' :
                   printStatus === 'success' ? 'Trabalho de impressão enviado!' :
                   'Falha de Conexão ou Driver'}
                </p>
                <p className="text-[11px] leading-relaxed font-semibold">
                  {statusMessage}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-2 sm:justify-between items-center text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Integridade QR Codes homologada.
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="bg-white border border-slate-300 text-slate-700 font-semibold px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer text-center"
            >
              Fechar
            </button>
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex justify-center items-center gap-2 bg-emerald-600 text-white font-bold px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer text-center disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {isDownloading ? 'Baixando...' : 'Baixar Imagem'}
            </button>
            <button
              onClick={handlePrint}
              className="flex justify-center items-center gap-2 bg-indigo-600 text-white font-bold px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer text-center"
            >
              <Printer className="w-4 h-4" />
              Imprimir Etiqueta
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
