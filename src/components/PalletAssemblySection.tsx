import React, { useState, useEffect } from 'react';
import { Pallet, Shipment, Carregamento } from '../types';
import { Printer, Plus, Trash2, RotateCcw, Boxes, HelpCircle, FileText, CheckCircle2, ChevronRight, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import LabelModal from './LabelModal';

interface PalletAssemblySectionProps {
  carregamentos: Carregamento[];
  shipments: Shipment[];
  pallets: Pallet[];
  setShipments: React.Dispatch<React.SetStateAction<Shipment[]>>;
  setPallets: React.Dispatch<React.SetStateAction<Pallet[]>>;
  setCarregamentos?: React.Dispatch<React.SetStateAction<Carregamento[]>>;
}

export default function PalletAssemblySection({
  carregamentos,
  shipments,
  pallets,
  setShipments,
  setPallets,
  setCarregamentos
}: PalletAssemblySectionProps) {
  // Filter out completed loads (loads where all programmed shipments have been paletized)
  const visibleCarregamentos = carregamentos.filter(c => {
    const loadShipments = shipments.filter(s => s.carregamentoId === c.id);
    if (loadShipments.length === 0) return true;
    return loadShipments.some(s => s.status === 'Pendente');
  });

  // Active selected carregamento we are packing for
  const [selectedLoadId, setSelectedLoadId] = useState<string>('');

  // Sync selectedLoadId when visible loads change
  useEffect(() => {
    if (visibleCarregamentos.length > 0) {
      if (!selectedLoadId || !visibleCarregamentos.some(c => c.id === selectedLoadId)) {
        setSelectedLoadId(visibleCarregamentos[0].id);
      }
    } else {
      setSelectedLoadId('');
    }
  }, [visibleCarregamentos, selectedLoadId]);

  // The 3 mandatory form inputs requested by the user
  const [shipmentNumber, setShipmentNumber] = useState('');
  const [clientName, setClientName] = useState('');
  const [carrierName, setCarrierName] = useState('');
  const [volumes, setVolumes] = useState(1);

  // Feedback states
  const [inputFeedback, setInputFeedback] = useState<{
    type: 'success' | 'info' | 'error';
    text: string;
  } | null>(null);

  // Active pallet being assembled (currently holds up to 5 items)
  const [activePalletItems, setActivePalletItems] = useState<{
    shipmentNumber: string;
    clientName: string;
    carrierName: string;
    volumes: number;
    originalShipId?: string; // Links back to the shipment database if any
  }[]>([]);

  // Safety confirmation helper state
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Modal print target
  const [selectedPrintPallet, setSelectedPrintPallet] = useState<Pallet | null>(null);

  // Track pallet deletion confirmation
  const [deletingPalletId, setDeletingPalletId] = useState<string | null>(null);

  const handleDeletePallet = (palletId: string) => {
    // 1. Reset shipments belonging to this pallet back to 'Pendente' and clear their palletId
    setShipments(prev =>
      prev.map(sh => {
        if (sh.palletId === palletId) {
          const { palletId: _, ...rest } = sh;
          return { ...rest, status: 'Pendente' as const };
        }
        return sh;
      })
    );

    // 2. Remove the pallet from pallets array
    setPallets(prev => prev.filter(p => p.id !== palletId));

    // 3. Reset the delete tracking state
    setDeletingPalletId(null);
  };

  // Trigger auto-fill when shipmentNumber is entered/changed
  useEffect(() => {
    const trimmedNum = shipmentNumber.trim();
    if (!trimmedNum) {
      setInputFeedback(null);
      return;
    }

    // Lookup across the planning shipments database corresponding to either current load or overall
    const foundPlanned = shipments.find(
      sh => sh && String(sh.shipmentNumber).trim() === String(trimmedNum).trim() && sh.carregamentoId === selectedLoadId
    );

    if (foundPlanned) {
      setClientName(foundPlanned.clientName);
      setCarrierName(foundPlanned.carrierName);

      // Sum volumes of this shipment already packed in finalized/existing pallets for this loading
      const alreadyPacked = pallets.reduce((sum, p) => {
        if (!p || !Array.isArray(p.shipments)) return sum;
        const item = p.shipments.find(s => s && String(s.shipmentNumber).trim() === String(trimmedNum).trim());
        return sum + (item ? Number(item.volumes) || 0 : 0);
      }, 0);

      const plannedVolumes = Number(foundPlanned.volumes) || 0;
      const remaining = Math.max(0, plannedVolumes - alreadyPacked);
      setVolumes(remaining);

      if (remaining === 0) {
        setInputFeedback({
          type: 'error',
          text: `Aviso: Todos os ${plannedVolumes} volumes planejados deste embarque já foram paletizados.`
        });
      } else if (alreadyPacked > 0) {
        setInputFeedback({
          type: 'success',
          text: `Embarques parciais localizados: ${alreadyPacked} de ${plannedVolumes} volumes já paletizados. Restam auto-preenchidos ${remaining} volumes.`
        });
      } else {
        setInputFeedback({
          type: 'success',
          text: `Embarque planejado localizado! Campos auto-preenchidos.`
        });
      }
    } else {
      // Look globally if it's on a different load
      const globalPlanned = shipments.find(sh => sh && String(sh.shipmentNumber).trim() === String(trimmedNum).trim());
      if (globalPlanned) {
        const matchingLoad = carregamentos.find(c => c.id === globalPlanned.carregamentoId);
        setInputFeedback({
          type: 'error',
          text: `Erro: Este embarque pertence a outro processo (${matchingLoad?.name || 'outro carregamento'})!`
        });
        setClientName(globalPlanned.clientName);
        setCarrierName(globalPlanned.carrierName);

        const alreadyPacked = pallets.reduce((sum, p) => {
          if (!p || !Array.isArray(p.shipments)) return sum;
          const item = p.shipments.find(s => s && String(s.shipmentNumber).trim() === String(trimmedNum).trim());
          return sum + (item ? Number(item.volumes) || 0 : 0);
        }, 0);
        const plannedVolumes = Number(globalPlanned.volumes) || 0;
        const remaining = Math.max(0, plannedVolumes - alreadyPacked);
        setVolumes(remaining);
      } else {
        setInputFeedback({
          type: 'info',
          text: 'Entrada manual: Código novo não localizado na programação ativa.'
        });
      }
    }
  }, [shipmentNumber, selectedLoadId, shipments, carregamentos, pallets]);

  // Clean form inputs
  const resetForm = () => {
    setShipmentNumber('');
    setClientName('');
    setCarrierName('');
    setVolumes(1);
    setInputFeedback(null);
  };

  // Add parsed/input shipment entry to the current active pallet draft
  const handleAddShipmentToPalletDraft = (e: React.FormEvent) => {
    e.preventDefault();

    if (!shipmentNumber.trim()) {
      alert('Por favor, insira o número do embarque.');
      return;
    }
    if (!clientName.trim() || !carrierName.trim()) {
      alert('Favor preencher o Nome do Cliente e Transportadora.');
      return;
    }

    // Constraint: Max 5 shipments per pallet
    if (activePalletItems.length >= 5) {
      alert('Limite operacional atingido! Cada pallet suporta no máximo 5 embarques agrupados.');
      return;
    }

    // Prevent adding the same shipment number twice inside the same pallet
    const isAlreadyOnPallet = activePalletItems.some(item => String(item.shipmentNumber).trim() === String(shipmentNumber).trim());
    if (isAlreadyOnPallet) {
      alert('Este embarque já foi adicionado a este palete.');
      return;
    }

    // BLOCK cross-loading: Check if this shipment belongs to another carregamento of different ID
    const globalShipment = shipments.find(sh => sh && String(sh.shipmentNumber).trim() === String(shipmentNumber).trim());
    if (globalShipment && globalShipment.carregamentoId !== selectedLoadId) {
      const matchingLoad = carregamentos.find(c => c.id === globalShipment.carregamentoId);
      alert(`Bloqueado: Este embarque pertence ao processo "${matchingLoad?.name || 'outro carregamento'}" e não pode ser misturado neste palete.`);
      return;
    }

    // Deduce if this relates to a valid pre-planned shipment ID
    const matchedShipment = shipments.find(
      sh => sh && String(sh.shipmentNumber).trim() === String(shipmentNumber).trim() && sh.carregamentoId === selectedLoadId
    );

    // Append to list
    setActivePalletItems(prev => [
      ...prev,
      {
        shipmentNumber: shipmentNumber.trim(),
        clientName: clientName.trim(),
        carrierName: carrierName.trim(),
        volumes: Number(volumes) || 1,
        originalShipId: matchedShipment?.id
      }
    ]);

    // Cleanup input form for next item scan
    resetForm();
  };

  // Remove a shipment draft from the build list
  const handleRemoveShipmentDraft = (index: number) => {
    setActivePalletItems(prev => prev.filter((_, idx) => idx !== index));
  };

  // Clean whole build pallet draft
  const handleResetPalletDraft = () => {
    setActivePalletItems([]);
    resetForm();
    setShowResetConfirm(false);
  };

  // Finalize Pallet: Create Pallet Registry, save to DB, print
  const handleFinalizePallet = () => {
    if (activePalletItems.length === 0) {
      alert('Adicione pelo menos 1 embarque para finalizar o palete.');
      return;
    }
    if (!selectedLoadId) {
      alert('Selecione o carregamento associado.');
      return;
    }

    const loadPallets = pallets.filter(p => p.carregamentoId === selectedLoadId);
    let nextNum = 1;
    if (loadPallets.length > 0) {
      const nums = loadPallets.map(p => {
        const parts = p.id.split('-');
        const lastPart = parts[parts.length - 1];
        const parsed = parseInt(lastPart, 10);
        return isNaN(parsed) ? 1 : parsed;
      });
      nextNum = Math.max(...nums, 0) + 1;
    }
    const sequenceStr = nextNum.toString().padStart(3, '0');
    const loadSuffix = selectedLoadId.replace('carr_', '');
    const datePrefix = `PAL-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}${new Date().getDate().toString().padStart(2, '0')}`;
    const palletId = `${datePrefix}-${loadSuffix}-${sequenceStr}`;
    
    const newPallet: Pallet = {
      id: palletId,
      carregamentoId: selectedLoadId,
      createdAt: new Date().toISOString(),
      shipments: activePalletItems.map(item => ({
        shipmentNumber: item.shipmentNumber,
        clientName: item.clientName,
        carrierName: item.carrierName,
        volumes: item.volumes
      })),
      loaded: false
    };

    // Update statuses of shipments involved in the database based on completeness
    const shipmentNumbersOnPallet = activePalletItems.map(item => String(item.shipmentNumber).trim());
    setShipments(prev =>
      prev.map(sh => {
        if (!sh) return sh;
        const shNum = String(sh.shipmentNumber).trim();
        if (sh.carregamentoId === selectedLoadId && shipmentNumbersOnPallet.includes(shNum)) {
          const currentItem = activePalletItems.find(item => String(item.shipmentNumber).trim() === shNum);
          const currentVolumes = currentItem ? Number(currentItem.volumes) || 0 : 0;

          // Sum volumes of this shipment already packed in prior pallets
          const alreadyPacked = pallets.reduce((sum, p) => {
            if (!p || !Array.isArray(p.shipments)) return sum;
            const match = p.shipments.find(item => item && String(item.shipmentNumber).trim() === shNum);
            return sum + (match ? Number(match.volumes) || 0 : 0);
          }, 0);

          const totalPlanned = Number(sh.volumes) || 0;
          const totalPacked = alreadyPacked + currentVolumes;

          if (totalPacked >= totalPlanned) {
            return { ...sh, status: 'Montado', palletId };
          } else {
            return { ...sh, status: 'Pendente', palletId }; // Still pending more volumes!
          }
        }
        return sh;
      })
    );

    // Also update load status to 'Em_Andamento' if it is currently 'Pendente'
    if (setCarregamentos) {
      setCarregamentos(prev =>
        prev.map(c => (c.id === selectedLoadId && c.status === 'Pendente' ? { ...c, status: 'Em_Andamento' } : c))
      );
    }

    // Append new pallet
    setPallets(prev => [newPallet, ...prev]);
    // Set for printing immediately
    setSelectedPrintPallet(newPallet);
    // Clear assembling floor
    setActivePalletItems([]);
    resetForm();
  };

  const activeCarregamento = carregamentos.find(c => c.id === selectedLoadId);
  const filteredPallets = pallets.filter(p => p.carregamentoId === selectedLoadId);

  const getPalletNumber = (p: Pallet | null) => {
    if (!p) return 1;
    const siblingPallets = pallets.filter(item => item.carregamentoId === p.carregamentoId);
    const sorted = [...siblingPallets].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const index = sorted.findIndex(item => item.id === p.id);
    return index !== -1 ? index + 1 : 1;
  };

  return (
    <div className="space-y-6">
      {/* Intro Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Boxes className="w-40 h-40" />
        </div>
        <div className="relative z-15 max-w-3xl">
          <span className="bg-blue-600 text-white font-mono text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-lg shadow-blue-500/20">
            Painel do Conferente de Expedição
          </span>
          <h2 className="text-2xl font-bold tracking-tight mt-2.5 sm:text-3xl text-white">
            Montagem de Paletes e Impressão de Etiquetas QR Code
          </h2>
          <p className="mt-1 text-slate-350 text-sm max-w-2xl leading-relaxed">
            Consolide fisicamente as mercadorias. Insira ou leia os códigos de barra dos embarques para agrupá-los em lotes de até 5 entregas e gere as etiquetas térmicas com identificador QR Code SGE.
          </p>
        </div>
      </div>

      {visibleCarregamentos.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-sm text-center max-w-xl mx-auto space-y-4 font-sans mt-8">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-md">
            <CheckCircle2 className="w-10 h-10 animate-bounce" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Tudo Pronto - Checkout Concluído!</h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            Não há carregamentos contendo embarques pendentes de paletização no momento. Todos os processos de conferência e montagem de paletes para os carregamentos planejados foram concluídos. Por favor, aguarde novas programações do Setor de Transporte.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Form & Assembly */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              
              {/* Load selector for tracking */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">
                    Carregamento Alvo da Paletização
                  </label>
                  <p className="text-xs text-slate-500 font-medium font-sans">Os paletes serão marcados para esta rota.</p>
                </div>
                <select
                  value={selectedLoadId}
                  onChange={e => {
                    setSelectedLoadId(e.target.value);
                    setActivePalletItems([]); // Wipe draft if you swap load to protect integrity
                  }}
                  className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {visibleCarregamentos.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

            {/* Checkout / Three Fields Scan inputs */}
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3.5 font-mono">
              Entrada do Checkout (3 campos obrigatórios)
            </h3>

            <form onSubmit={handleAddShipmentToPalletDraft} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
                
                {/* Field 1: Número do Embarque */}
                <div className="md:col-span-4">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    1. Número do Embarque *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={shipmentNumber}
                      onChange={e => setShipmentNumber(e.target.value)}
                      placeholder="Ex: 30890111"
                      className="w-full bg-slate-50/70 text-slate-800 border border-slate-200 rounded-lg py-2 pl-3 pr-8 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-mono font-bold"
                    />
                    <div className="absolute right-2.5 top-2.5 text-slate-400" title="Bipagem com Leitor de Código de Barras">
                      <Search className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Field 2: Nome do Cliente */}
                <div className="md:col-span-4">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    2. Nome do Cliente *
                  </label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    placeholder="Ex: Droga Raia - CD Embu SP"
                    className="w-full bg-slate-50/70 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                {/* Field 3: Nome da Transportadora */}
                <div className="md:col-span-4">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    3. Nome da Transportadora *
                  </label>
                  <input
                    type="text"
                    required
                    value={carrierName}
                    onChange={e => setCarrierName(e.target.value)}
                    placeholder="Ex: Transportadora Braspress"
                    className="w-full bg-slate-50/70 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

              </div>

              {/* Volume scale */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium font-mono">Volumes desta caixa:</span>
                  <input
                    type="number"
                    min={1}
                    value={volumes}
                    onChange={e => setVolumes(Math.max(1, Number(e.target.value)))}
                    className="w-16 bg-slate-50 text-slate-800 border border-slate-200 rounded-md py-1 text-center text-xs font-bold outline-none"
                  />
                </div>

                {/* Feedbacks of auto completes */}
                {inputFeedback && (
                  <div className={`text-xs px-2.5 py-1 rounded font-medium ${
                    inputFeedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-700'
                      : inputFeedback.type === 'error'
                      ? 'bg-red-50 text-red-700'
                      : 'bg-blue-50 text-blue-700'
                  }`}>
                    {inputFeedback.text}
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer transition-colors"
                >
                  Limpar Campos
                </button>
                <button
                  type="submit"
                  disabled={!shipmentNumber.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-transparent text-white font-bold text-xs px-5 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all shadow-md active:scale-95 border border-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar na Etiqueta
                </button>
              </div>

            </form>
          </div>

          {/* PALLET PHYSICAL GRID VISUALIZER */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                  Palete em Montagem Física
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Capacidade:{' '}
                  <span className={`${activePalletItems.length === 5 ? 'text-red-600' : 'text-blue-600'} font-bold`}>
                    {activePalletItems.length} de 5 embarques agrupados
                  </span>
                </p>
              </div>

              {activePalletItems.length > 0 && (
                showResetConfirm ? (
                  <div className="flex items-center gap-1.5 bg-red-50 px-2 py-1.5 rounded-lg border border-red-150 animate-fade-in">
                    <span className="text-[10px] font-bold text-red-700 font-mono">LIMPAR PALETE?</span>
                    <button
                      type="button"
                      onClick={handleResetPalletDraft}
                      className="text-[10.5px] bg-red-600 hover:bg-red-700 text-white font-bold px-2.5 py-1 rounded-md shadow-2xs leading-none cursor-pointer"
                    >
                      Sim
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowResetConfirm(false)}
                      className="text-[10.5px] bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-2.5 py-1 rounded-md leading-none cursor-pointer"
                    >
                      Não
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(true)}
                    className="text-xs text-slate-400 hover:text-red-500 font-mono font-semibold flex items-center gap-1 hover:bg-red-50 px-2 py-1 rounded transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Resetar Palete
                  </button>
                )
              )}
            </div>

            {/* Graphic pallet visualizer */}
            <div className="grid grid-cols-5 gap-3.5 bg-slate-50 border border-slate-150 p-6 rounded-2xl relative overflow-hidden">
              
              {/* Stack items */}
              {Array.from({ length: 5 }).map((_, idx) => {
                const item = activePalletItems[idx];
                const active = !!item;

                return (
                  <div
                    key={idx}
                    className={`col-span-1 h-32 rounded-xl transition-all duration-300 flex flex-col justify-between p-3 border ${
                      active
                        ? 'bg-gradient-to-br from-blue-50 to-white border-blue-300 shadow-md transform -translate-y-1'
                        : 'bg-white border-dashed border-slate-300 opacity-60 flex items-center justify-center'
                    }`}
                  >
                    {active ? (
                      <>
                        <div className="flex justify-between items-start">
                          <span className="font-mono text-[9px] text-blue-600 font-extrabold uppercase">
                            SLOT {idx + 1}
                          </span>
                          <button
                            onClick={() => handleRemoveShipmentDraft(idx)}
                            className="p-1 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-md transition-colors"
                            title="Remover"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="my-1.5 font-sans">
                          <strong className="text-slate-900 block font-mono text-center font-black text-xs">
                            {item.shipmentNumber}
                          </strong>
                          <span className="text-[10px] text-slate-500 block truncate text-center font-medium mt-0.5">
                            {item.clientName}
                          </span>
                        </div>
                        <div className="bg-slate-100 text-[10px] font-mono rounded text-center py-0.5 text-slate-600">
                          {item.volumes} Volumes
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center font-mono py-6">
                        <Boxes className="w-5 h-5 text-slate-300 animate-pulse" />
                        <span className="text-[9px] text-slate-400 mt-1 font-bold">SLOT LIMPO</span>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Wooden pallet footer representation */}
              <div className="col-span-full h-4 bg-slate-800 rounded-md flex justify-between items-center px-4 shadow-sm">
                <span className="text-[8px] font-mono text-slate-300 tracking-widest font-black leading-none">
                  BASE DO PALETE DE CARREGAMENTO (ESTRUTURA DE MADEIRA)
                </span>
                <span className="text-[8px] font-mono text-blue-400 font-extrabold leading-none">
                  CONCEITO SLEEK
                </span>
              </div>
            </div>

            {/* Assemble / Finalize action */}
            {activePalletItems.length > 0 ? (
              <div className="flex justify-between items-center bg-blue-50 border border-blue-100 p-4 rounded-xl">
                <div className="text-xs text-blue-850 flex items-center gap-1.5 font-sans">
                  <HelpCircle className="w-4 h-4 shrink-0 text-blue-600" />
                  <div>
                    Você agrupou <strong className="font-bold">{activePalletItems.length} embarques</strong>. O pallet possui{' '}
                    <strong className="underline">{5 - activePalletItems.length} posições ociosas</strong>, mas pode ser impresso.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleFinalizePallet}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-blue-500/20 shrink-0"
                >
                  <Printer className="w-4 h-4" />
                  Gerar QR & Imprimir Etiqueta
                </button>
              </div>
            ) : (
              <div className="text-center py-5 text-xs text-slate-400 font-mono">
                * Adicione no mínimo 1 caixa acima para liberar a ferramenta de embalagem e impressão.
              </div>
            )}

          </div>

        </div>

        {/* Right Column: List of Finalized Pallets */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 font-mono">
              Paletes Concluídos ({filteredPallets.length})
            </h3>

            {filteredPallets.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Nenhum palete gerado para o carregamento{' '}
                <strong className="text-slate-600">{activeCarregamento?.name.split(' ')[0] || ''}</strong>.
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {filteredPallets.map(p => (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-xl border border-slate-150 bg-slate-50 hover:bg-slate-100/60 transition-colors text-slate-700 text-xs flex flex-col justify-between"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <strong className="font-mono text-slate-900 font-black tracking-tight block flex items-center gap-1.5">
                          <span>{p.id}</span>
                          <span className="bg-slate-950 text-white text-[9px] font-sans font-black px-1.5 py-0.5 rounded tracking-tight">
                            PALETE {getPalletNumber(p)}
                          </span>
                        </strong>
                        <span className="text-[10px] text-slate-400 font-mono block">
                          Gerado em: {new Date(p.createdAt).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}
                        </span>
                      </div>
                      
                      {/* Loaded / Expedited status badge */}
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        p.loaded 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {p.loaded ? 'Carregado' : 'Aguardando carga'}
                      </span>
                    </div>

                    <div className="mt-3 space-y-1 bg-white p-2 rounded-lg border border-slate-200 font-mono text-[10px]">
                      <div className="text-[9px] text-slate-400 uppercase font-bold border-b border-slate-100 pb-0.5 mb-1 flex items-center gap-1">
                        <FileText className="w-3 h-3 text-slate-500" />
                        Embarques Integrados ({p.shipments.length}/5):
                      </div>
                      {p.shipments.map((sh, idx) => (
                        <div key={idx} className="flex justify-between text-slate-700">
                          <span className="font-semibold">{sh.shipmentNumber}</span>
                          <span className="text-slate-400 truncate max-w-[120px]">{sh.clientName}</span>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-3.5">
                      <button
                        type="button"
                        onClick={() => setSelectedPrintPallet(p)}
                        className="border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold py-1.5 rounded-lg flex items-center justify-center gap-1 text-[10.5px] transition-colors cursor-pointer"
                      >
                        <Printer className="w-3 h-3 text-slate-500" />
                        <span>Reimprimir</span>
                      </button>

                      {deletingPalletId === p.id ? (
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => handleDeletePallet(p.id)}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-extrabold py-1.5 rounded-lg text-[9.5px] uppercase tracking-wider cursor-pointer border border-red-700"
                          >
                            Sim
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingPalletId(null)}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-2.5 py-1.5 rounded-lg text-[9.5px] cursor-pointer"
                          >
                            Não
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeletingPalletId(p.id)}
                          className="border border-red-200 hover:border-red-300 bg-red-50 hover:bg-red-100 text-red-700 font-semibold py-1.5 rounded-lg flex items-center justify-center gap-1 text-[10.5px] transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3 text-red-500" />
                          <span>Excluir</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      )}

      {/* Printer Modal triggered */}
      <LabelModal
        pallet={selectedPrintPallet}
        onClose={() => setSelectedPrintPallet(null)}
        palletNumber={getPalletNumber(selectedPrintPallet)}
      />
    </div>
  );
}
