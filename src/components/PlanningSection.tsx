import React, { useState } from 'react';
import { Carregamento, Shipment, User, Pallet } from '../types';
import { parseSpreadsheetText, convert2DArrayToText } from '../utils/parser';
import { FileSpreadsheet, Plus, Upload, Trash2, CheckCircle2, RefreshCw, AlertCircle, Sparkles, UploadCloud, X, Clipboard, FileText, Unlock, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';

interface PlanningSectionProps {
  carregamentos: Carregamento[];
  shipments: Shipment[];
  setCarregamentos: React.Dispatch<React.SetStateAction<Carregamento[]>>;
  setShipments: React.Dispatch<React.SetStateAction<Shipment[]>>;
  currentUser?: User;
  pallets?: Pallet[];
  setPallets?: React.Dispatch<React.SetStateAction<Pallet[]>>;
}

export default function PlanningSection({
  carregamentos,
  shipments,
  setCarregamentos,
  setShipments,
  currentUser,
  pallets = [],
  setPallets
}: PlanningSectionProps) {
  // Input states for new load
  const [newLoadName, setNewLoadName] = useState('');
  const [newLoadCapacity, setNewLoadCapacity] = useState<number>(28);
  const [vehicleType, setVehicleType] = useState<string>('Carreta');
  
  // Selection
  const [selectedLoadId, setSelectedLoadId] = useState<string>(
    carregamentos.length > 0 ? carregamentos[0].id : ''
  );

  // Deletion confirmation helper state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Drag and drop / file selector states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadTab, setUploadTab] = useState<'file' | 'text'>('file');

  // Raw clipboard paste / manual upload state
  const [spreadsheetText, setSpreadsheetText] = useState('');
  const [importResult, setImportResult] = useState<{
    success: boolean;
    count: number;
    error?: string;
  } | null>(null);

  // Manual shipment on-the-fly inputs
  const [manualShipmentNumber, setManualShipmentNumber] = useState('');
  const [manualClientName, setManualClientName] = useState('');
  const [manualCarrierName, setManualCarrierName] = useState('');
  const [manualVolumes, setManualVolumes] = useState(1);
  const [manualError, setManualError] = useState('');

  // State for Reopening Load Tool
  const [reopenLoadId, setReopenLoadId] = useState('');
  const [reopenFeedback, setReopenFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Process selected or dropped file
  const processUploadedFile = (file: File) => {
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const isTxtOrCsv = file.name.endsWith('.csv') || file.name.endsWith('.tsv') || file.name.endsWith('.txt');

    if (!isExcel && !isTxtOrCsv) {
      setImportResult({
        success: false,
        count: 0,
        error: 'Extensão de arquivo inválida. Envie arquivos .xlsx, .xls, .csv, .tsv ou .txt'
      });
      return;
    }

    const reader = new FileReader();
    if (isExcel) {
      reader.onload = (e) => {
        try {
          if (!e.target?.result) {
            throw new Error('Não foi possível ler o conteúdo do arquivo.');
          }
          const data = new Uint8Array(e.target.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames?.[0];
          if (!firstSheetName) {
            throw new Error('A planilha está vazia ou não possui abas.');
          }
          const worksheet = workbook.Sheets[firstSheetName];
          if (!worksheet) {
            throw new Error('Não foi possível carregar a aba da planilha.');
          }
          const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
          const textRepresentation = convert2DArrayToText(jsonData);
          setSpreadsheetText(textRepresentation);
          setSelectedFile(file);
          setImportResult({
            success: true,
            count: 0, // Staging state indicator
            error: undefined
          });
          setTimeout(() => setImportResult(null), 3500);
        } catch (err: any) {
          setImportResult({
            success: false,
            count: 0,
            error: 'Erro lendo arquivo Excel: ' + err.message
          });
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = (e) => {
        try {
          const textRepresentation = e.target?.result as string;
          setSpreadsheetText(textRepresentation);
          setSelectedFile(file);
          setImportResult({
            success: true,
            count: 0, // Staging state indicator
            error: undefined
          });
          setTimeout(() => setImportResult(null), 3500);
        } catch (err: any) {
          setImportResult({
            success: false,
            count: 0,
            error: 'Erro lendo arquivo de texto: ' + err.message
          });
        }
      };
      reader.readAsText(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      processUploadedFile(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      processUploadedFile(file);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setSpreadsheetText('');
    setImportResult(null);
    const inputElement = document.getElementById('spreadsheet-file-input') as HTMLInputElement;
    if (inputElement) {
      inputElement.value = '';
    }
  };

  // Setup sample spreadsheet text for the user to try easily with 1 click
  const loadSampleSpreadsheet = () => {
    const sample = `Transportadora\tEmbarque\tCliente\tNr PedCli\tUF\tValor Embarque\tVolume Embarque\tPeso Embarque
Braspress\t30890121\tDroga Raia - CD Osasco\tPD-9901\tSP\t14250.50\t10\t45.2
Cargo BR Logística\t30890122\tDrogaria São Paulo - CD Cajamar\tPD-9902\tSP\t28410.00\t15\t120.4
Genomma Frota Própria\t30890123\tCarrefour Cajamar\tPD-9903\tSP\t8900.20\t6\t32.1
Cargo BR Logística\t30890124\tDrogasil - CD Contagem MG\tPD-9904\tMG\t32100.80\t22\t210.0
Express São Miguel\t30890125\tFarmácia Pague Menos - CD Campinas\tPD-9905\tSP\t11400.00\t8\t55.5`;
    setSpreadsheetText(sample);
    setSelectedFile(null);
    setUploadTab('text');
    setImportResult(null);
  };

  // Create loading vessel/trip
  const handleCreateCarregamento = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLoadName.trim()) return;

    const id = 'carr_' + Date.now();
    const newLoad: Carregamento = {
      id,
      name: newLoadName.trim(),
      date: new Date().toLocaleDateString('pt-BR'),
      status: 'Pendente',
      vehicleCapacity: newLoadCapacity
    };

    setCarregamentos(prev => [newLoad, ...prev]);
    setSelectedLoadId(id);
    setNewLoadName('');
  };

  // Import shipments from pasted spreadsheet code
  const handleImportSpreadsheet = () => {
    // ALWAYS create a brand new load container for this new spreadsheet!
    const newId = 'carr_' + Date.now();
    
    // Determine a descriptive and recognizable name for the new carregamento
    let loadName = '';
    if (selectedFile) {
      const baseName = selectedFile.name.replace(/\.[^/.]+$/, "");
      loadName = `Carga - ${baseName}`;
    } else {
      loadName = `Carga Planilha nº ${carregamentos.length + 1}`;
    }

    const newLoad: Carregamento = {
      id: newId,
      name: loadName,
      date: new Date().toLocaleDateString('pt-BR'),
      status: 'Pendente',
      vehicleCapacity: newLoadCapacity
    };

    try {
      const parsed = parseSpreadsheetText(spreadsheetText);

      if (parsed.length === 0) {
        setImportResult({
          success: false,
          count: 0,
          error: 'Nenhum embarque válido pôde ser extraído do texto. Verifique as colunas.'
        });
        return;
      }

      // First set the new Carregamento so it's committed to db/state
      setCarregamentos(prev => [newLoad, ...prev]);

      // Convert parsed elements to actual database shipments as a new process
      const newShipments: Shipment[] = parsed.map((item, index) => {
        const uniqueSalt = Math.random().toString(36).substring(2, 9);
        return {
          id: `ship_${Date.now()}_${uniqueSalt}_${index}`,
          shipmentNumber: String(item.shipmentNumber || ''),
          clientName: String(item.clientName || 'Cliente Geral'),
          carrierName: String(item.carrierName || 'Transportadora Geral'),
          volumes: Number(item.volumes) || 1,
          carregamentoId: newId,
          status: 'Pendente'
        };
      });

      // Set shipments (this will sync to firestore)
      setShipments(prev => [...prev, ...newShipments]);

      // Focus on the new load automatically
      setSelectedLoadId(newId);

      setImportResult({
        success: true,
        count: newShipments.length
      });
      setSpreadsheetText('');
      setSelectedFile(null);
      
      // Auto clearance animation after 4 seconds
      setTimeout(() => setImportResult(null), 4000);
    } catch (e: any) {
      setImportResult({
        success: false,
        count: 0,
        error: 'Ocorreu um erro no processamento: ' + e.message
      });
    }
  };

  // Add individual manual shipment
  const handleAddManualShipment = (e: React.FormEvent) => {
    e.preventDefault();
    setManualError('');

    if (!selectedLoadId) {
      setManualError('Crie ou selecione um Carregamento antes.');
      return;
    }
    if (!manualShipmentNumber.trim()) {
      setManualError('O número do embarque é obrigatório.');
      return;
    }
    if (!manualClientName.trim()) {
      setManualError('O nome do cliente é obrigatório.');
      return;
    }
    if (!manualCarrierName.trim()) {
      setManualError('A transportadora é obrigatória.');
      return;
    }

    // Check if duplicate for this load
    const isDup = shipments.some(
      s => s.shipmentNumber === manualShipmentNumber.trim() && s.carregamentoId === selectedLoadId
    );
    if (isDup) {
      setManualError('Este número de embarque já está cadastrado neste carregamento.');
      return;
    }

    const newShip: Shipment = {
      id: `ship_manual_${Date.now()}`,
      shipmentNumber: manualShipmentNumber.trim(),
      clientName: manualClientName.trim(),
      carrierName: manualCarrierName.trim(),
      volumes: Number(manualVolumes) || 1,
      carregamentoId: selectedLoadId,
      status: 'Pendente'
    };

    setShipments(prev => [...prev, newShip]);
    
    // Clear fields
    setManualShipmentNumber('');
    setManualClientName('');
    setManualCarrierName('');
    setManualVolumes(1);
  };

  // Delete an entire load and its shipments
  const handleDeleteCarregamento = (id: string) => {
    setCarregamentos(prev => prev.filter(c => c.id !== id));
    setShipments(prev => prev.filter(s => s.carregamentoId !== id));
    if (selectedLoadId === id) {
      const remaining = carregamentos.filter(c => c.id !== id);
      setSelectedLoadId(remaining.length > 0 ? remaining[0].id : '');
    }
    setDeleteConfirmId(null);
  };

  // Delete individual planned shipment
  const handleDeleteShipment = (shipId: string) => {
    setShipments(prev => prev.filter(s => s.id !== shipId));
  };

  // Mover um embarque já programado para outra carga (mesmo que já tenha sido paletizado)
  const handleMoveShipment = (shipId: string, newLoadId: string) => {
    if (!newLoadId) return;
    setShipments(prev =>
      prev.map(sh => (sh.id === shipId ? { ...sh, carregamentoId: newLoadId } : sh))
    );
  };

  // Reopen loads for either pallet assembly or truck loading
  const handleReopenAssembly = (loadId: string) => {
    if (!loadId) return;
    const targetLoad = carregamentos.find(c => c.id === loadId);
    if (!targetLoad) return;

    // 1. Set load status back to 'Em_Andamento'
    setCarregamentos(prev =>
      prev.map(c => c.id === loadId ? { ...c, status: 'Em_Andamento' as const } : c)
    );

    // 2. Set all shipments of this carregamento that are 'Montado' back to 'Pendente'
    setShipments(prev =>
      prev.map(sh => {
        if (sh.carregamentoId === loadId && sh.status === 'Montado') {
          return { ...sh, status: 'Pendente' as const };
        }
        return sh;
      })
    );

    setReopenFeedback({
      type: 'success',
      text: `SUCESSO: A carga "${targetLoad.name}" foi reaberta para Montagem de Paletes. As equipes de checkout já podem prosseguir.`
    });
    setTimeout(() => setReopenFeedback(null), 6000);
  };

  const handleReopenLoading = (loadId: string) => {
    if (!loadId) return;
    const targetLoad = carregamentos.find(c => c.id === loadId);
    if (!targetLoad) return;

    // 1. Set load status back to 'Em_Andamento'
    setCarregamentos(prev =>
      prev.map(c => c.id === loadId ? { ...c, status: 'Em_Andamento' as const } : c)
    );

    // 2. Set all shipments of this loading that are 'Carregado' back to 'Montado'
    setShipments(prev =>
      prev.map(sh => {
        if (sh.carregamentoId === loadId && sh.status === 'Carregado') {
          return { ...sh, status: 'Montado' as const };
        }
        return sh;
      })
    );

    // 3. Reset loaded state of pallets in this loading
    if (setPallets) {
      setPallets(prev =>
        prev.map(p => {
          if (p.carregamentoId === loadId) {
            const { loadedAt: _, loadedVehicleId: __, ...rest } = p;
            return { ...rest, loaded: false };
          }
          return p;
        })
      );
    }

    setReopenFeedback({
      type: 'success',
      text: `SUCESSO: O veículo "${targetLoad.name}" foi reaberto para Carregamento. Todos os paletes desta carga retornaram ao pátio.`
    });
    setTimeout(() => setReopenFeedback(null), 6000);
  };

  // Active planning metrics
  const activeCarregamento = carregamentos.find(c => c.id === selectedLoadId);
  const activeShipments = shipments.filter(s => s.carregamentoId === selectedLoadId);
  const totalVolumes = activeShipments.reduce((sum, s) => sum + s.volumes, 0);

  return (
    <div className="space-y-6">
      {/* Visual Workspace Intro banner */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <FileSpreadsheet className="w-40 h-40" />
        </div>
        <div className="relative z-15 max-w-3xl">
          <span className="bg-blue-600 text-white font-mono text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-lg shadow-blue-500/20">
            Painel de Planejamento de Carga
          </span>
          <h2 className="text-2xl font-bold tracking-tight mt-2.5 sm:text-3xl text-white">
            Programação e Lançamento de Embarques
          </h2>
          <p className="mt-1 text-slate-300 text-sm max-w-2xl leading-relaxed">
            Área operacional para o time de transportes. Crie carregamentos (veículos/placas), faça o upload da programação prévia via cópia do Excel e alimente o fluxo que será conferido e paletizado na expedição física.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Carregamentos (Loads) register & selector */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 font-mono">
              1. Identificar Carregamento / Veículo
            </h3>

            {/* Quick add form */}
            <form onSubmit={handleCreateCarregamento} className="space-y-3 mb-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Criar Novo Carregamento / Placa
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newLoadName}
                    onChange={e => setNewLoadName(e.target.value)}
                    placeholder="Ex: Placa ABC-1234"
                    className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!newLoadName.trim()}
                    className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-sm animate-pulse"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">
                  Tipo de Veículo
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={vehicleType}
                    onChange={e => {
                      const val = e.target.value;
                      setVehicleType(val);
                      if (val === 'Toco') {
                        setNewLoadCapacity(10);
                      } else if (val === 'Truck') {
                        setNewLoadCapacity(14);
                      } else if (val === 'Carreta') {
                        setNewLoadCapacity(28);
                      } else if (val === 'Bitrem') {
                        setNewLoadCapacity(56);
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none font-medium text-slate-700 h-[38px]"
                  >
                    <option value="Toco">Toco</option>
                    <option value="Truck">Truck</option>
                    <option value="Carreta">Carreta</option>
                    <option value="Bitrem">Bitrem</option>
                  </select>

                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 text-xs focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white h-[38px]">
                    <input
                      type="number"
                      min={1}
                      max={150}
                      value={newLoadCapacity}
                      onChange={e => {
                        const val = Math.max(1, Number(e.target.value));
                        setNewLoadCapacity(val);
                      }}
                      className="w-full bg-transparent border-none outline-none font-medium text-slate-700 h-full"
                    />
                    <span className="text-slate-400 font-mono text-[10px] shrink-0">Pallets</span>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-slate-400">
                A capacidade do veículo é salva para calcular taxas de ocupação operacional.
              </p>
            </form>

            <hr className="border-slate-100 my-4" />

            {/* Select load */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">
                Carregamentos Ativos ({carregamentos.length})
              </label>

              {carregamentos.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  Nenhum carregamento cadastrado.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                  {carregamentos.map(c => {
                    const count = shipments.filter(s => s.carregamentoId === c.id).length;
                    const loadedCount = shipments.filter(s => s.carregamentoId === c.id && s.status === 'Carregado').length;
                    const progress = count > 0 ? Math.round((loadedCount / count) * 100) : 0;

                    return (
                      <div
                        key={c.id}
                        onClick={() => setSelectedLoadId(c.id)}
                        className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer text-left relative overflow-hidden ${
                          selectedLoadId === c.id
                            ? 'bg-blue-50/70 border-blue-200 ring-1 ring-blue-100'
                            : 'bg-white border-slate-150 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        {/* Inline deletion overlay */}
                        {deleteConfirmId === c.id && (
                          <div className="absolute inset-0 bg-red-50/95 border-2 border-red-200 backdrop-blur-xs flex flex-col justify-center items-center px-4 py-2.5 z-20 text-center animate-fade-in">
                            <p className="text-xs font-bold text-red-900 leading-tight">Excluir este carregamento e todos os seus embarques?</p>
                            <div className="flex gap-2 mt-2 w-full justify-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCarregamento(c.id);
                                }}
                                className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-wider px-4 py-1.5 rounded-lg shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer border border-red-700 shrink-0"
                              >
                                Sim, excluir
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirmId(null);
                                }}
                                className="bg-slate-200 hover:bg-slate-300 text-slate-800 text-[10px] font-black uppercase tracking-wider px-4 py-1.5 rounded-lg transition-all cursor-pointer border border-slate-300 shrink-0"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="flex justify-between items-start gap-2">
                          <span className="font-bold text-slate-850 text-sm block tracking-tight truncate leading-tight">
                            {c.name}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmId(c.id);
                            }}
                            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                            title="Excluir Carregamento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex justify-between items-center mt-2 text-[11px] font-mono text-slate-500">
                          <span>Data: {c.date}</span>
                          <span className="font-medium bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                            {count} emb. {count > 0 && `(${progress}% carg)`}
                          </span>
                        </div>
                        {count > 0 && (
                          <div className="w-full bg-slate-150 h-1 mt-2.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-emerald-500 h-full transition-all duration-500" 
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {activeCarregamento && (
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-2.5">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                    Capacidade do Veículo Selecionado
                  </span>
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-800">
                    <span className="truncate max-w-[150px]">{activeCarregamento.name}</span>
                    <span className="font-mono text-xs text-blue-700 font-extrabold bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">
                      {activeCarregamento.vehicleCapacity || 28} Pallets
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { label: 'Toco (10p)', val: 10 },
                      { label: 'Truck (14p)', val: 14 },
                      { label: 'Carreta (28p)', val: 28 },
                      { label: 'Bitrem (56p)', val: 56 }
                    ].map(opt => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => {
                          setCarregamentos(prev => prev.map(c => 
                            c.id === activeCarregamento.id 
                              ? { ...c, vehicleCapacity: opt.val } 
                              : c
                          ));
                        }}
                        className={`text-[10px] py-1.5 px-0.5 rounded-lg border font-medium text-center transition-all cursor-pointer ${
                          (activeCarregamento.vehicleCapacity || 28) === opt.val
                            ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50/80 hover:border-slate-300'
                        }`}
                      >
                        {opt.label.split(' ')[0]}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5 justify-between bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus-within:ring-1 focus-within:ring-blue-500">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider font-mono">
                      Qtd Personalizada:
                    </span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={1}
                        max={150}
                        value={activeCarregamento.vehicleCapacity || 28}
                        onChange={e => {
                          const val = Math.max(1, Number(e.target.value));
                          setCarregamentos(prev => prev.map(c => 
                            c.id === activeCarregamento.id 
                              ? { ...c, vehicleCapacity: val } 
                              : c
                          ));
                        }}
                        className="w-12 text-center bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                      />
                      <span className="text-slate-400 font-mono text-[9px] font-bold uppercase">Paletes</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Especial: Painel de Reabertura de Carregamentos (Apenas Gestor) */}
          {currentUser?.role === 'Gestor' && (
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4 text-white">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <div className="bg-indigo-650 text-white bg-indigo-600 p-2 rounded-xl flex items-center justify-center">
                  <Unlock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-tight text-white leading-none">
                    🔑 Painel do Gestor
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Reabertura de Cargas Concluídas
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Utilize este seletor para desbloquear ou reabrir processos de conferência ou paletização que já foram finalizados e por isso sumiram das filas de visualização operacional.
              </p>

              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 font-mono mb-1">
                    Selecionar Carga para Reabrir
                  </label>
                  <select
                    value={reopenLoadId}
                    onChange={e => {
                      setReopenLoadId(e.target.value);
                      setReopenFeedback(null);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:ring-1 focus:ring-indigo-500 outline-none font-medium"
                  >
                    <option value="">Selecione uma carga...</option>
                    {carregamentos.map(c => {
                      const totalShipCount = shipments.filter(s => s.carregamentoId === c.id).length;
                      const completedCount = shipments.filter(s => s.carregamentoId === c.id && s.status === 'Carregado').length;
                      const assemblyCompleted = totalShipCount > 0 && shipments.filter(s => s.carregamentoId === c.id && s.status === 'Pendente').length === 0;
                      
                      let displayStatus = 'Pendente';
                      if (c.status === 'Concluido' || (totalShipCount > 0 && completedCount === totalShipCount)) {
                        displayStatus = 'CONCLUÍDA (Carregado)';
                      } else if (assemblyCompleted) {
                        displayStatus = 'PALETIZADA (Pronta)';
                      } else if (totalShipCount > 0) {
                        displayStatus = 'EM ANDAMENTO';
                      }

                      return (
                        <option key={c.id} value={c.id}>
                          {c.name} ({displayStatus})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {reopenLoadId && (
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-850 space-y-3.5">
                    <div className="text-[11px] font-mono space-y-1 text-slate-400">
                      <div>
                        <strong>Embarques Cadastrados:</strong> {shipments.filter(s => s.carregamentoId === reopenLoadId).length}
                      </div>
                      <div>
                        <strong>Volumes Paletizados:</strong> {shipments.filter(s => s.carregamentoId === reopenLoadId && s.status !== 'Pendente').length}
                      </div>
                      <div>
                        <strong>Volumes Carregados:</strong> {shipments.filter(s => s.carregamentoId === reopenLoadId && s.status === 'Carregado').length}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      <button
                        type="button"
                        onClick={() => handleReopenAssembly(reopenLoadId)}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2.5 px-3 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer border border-blue-700"
                        title="Torna a carga visível na Montagem de Paletes e define os embarques como Pendentes para ajuste"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reabrir Montagem de Paletes (Checkout)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleReopenLoading(reopenLoadId)}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2.5 px-3 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer border border-indigo-700"
                        title="Reabre a carga para conferência de carregamento física no pátio de embarque"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Reabrir Carregamento (Expedição)</span>
                      </button>
                    </div>
                  </div>
                )}

                {reopenFeedback && (
                  <div className={`p-3 rounded-xl text-xs font-medium animate-fade-in ${
                    reopenFeedback.type === 'success' 
                      ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300' 
                      : 'bg-rose-950/80 border border-rose-800 text-rose-300'
                  }`}>
                    <div className="flex items-start gap-1.5 leading-relaxed">
                      <AlertCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{reopenFeedback.text}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Columns: Import spreadsheets and view active load contents */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active load spreadsheet input */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 font-mono">
                  2. Importar Planilha de Programação
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Operando em <strong className="text-blue-600">{activeCarregamento?.name || 'Selecione um carregamento'}</strong>
                </p>
              </div>

              <button
                type="button"
                onClick={loadSampleSpreadsheet}
                className="self-start text-[11px] flex items-center gap-1.5 text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-100 font-medium transition-colors cursor-pointer animate-pulse"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Carregar Modelo de Teste
              </button>
            </div>

            {/* Ingestion Tabs */}
            <div className="flex border-b border-slate-100 mb-4">
              <button
                type="button"
                onClick={() => setUploadTab('file')}
                className={`py-2 px-3 text-xs font-bold font-sans flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                  uploadTab === 'file'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                Subir Arquivo (Excel ou CSV)
              </button>
              <button
                type="button"
                onClick={() => setUploadTab('text')}
                className={`py-2 px-3 text-xs font-bold font-sans flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                  uploadTab === 'text'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <Clipboard className="w-4 h-4" />
                Copiar e Colar Texto
              </button>
            </div>

            {/* Input Form Box */}
            <div className="space-y-4">
              {/* HIDDEN FILE INPUT TARGETED BY THE CARD CLICK - Enabled regardless of selectedLoadId */}
              <input
                type="file"
                id="spreadsheet-file-input"
                accept=".xlsx,.xls,.csv,.tsv,.txt"
                className="hidden"
                onChange={handleFileChange}
              />

              {uploadTab === 'file' ? (
                /* Drag and drop zone */
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => {
                    document.getElementById('spreadsheet-file-input')?.click();
                  }}
                  className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                    dragActive
                      ? 'border-blue-500 bg-blue-50/60 shadow-md scale-[1.01]'
                      : selectedFile
                      ? 'border-emerald-500 bg-emerald-50/10'
                      : 'border-slate-300 hover:border-blue-500 bg-slate-50/40 hover:bg-slate-50/85'
                  }`}
                >
                  {selectedFile ? (
                    <div className="space-y-2">
                      <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
                        <FileText className="w-6 h-6 animate-bounce" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-700">{selectedFile.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {(selectedFile.size / 1024).toFixed(1)} KB — Planilha carregada!
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSelectedFile();
                        }}
                        className="text-[10px] bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 font-bold px-2.5 py-1 rounded-md transition-colors inline-flex items-center gap-1 border border-red-200"
                      >
                        <X className="w-3 h-3" />
                        Remover Arquivo
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-700">
                          Clique aqui para escolher ou arraste o arquivo da planilha
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto font-sans leading-relaxed">
                          {!selectedLoadId ? (
                            <span className="text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full inline-block mt-1 animate-pulse">
                              💡 Criaremos um carregamento automático de planilha para você!
                            </span>
                          ) : (
                            <span>Suporta formatos do Excel (.xlsx, .xls) ou de texto (.csv, .tsv, .txt).</span>
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Textarea copy-paste view */
                <div className="relative">
                  <textarea
                    value={spreadsheetText}
                    onChange={e => {
                      setSpreadsheetText(e.target.value);
                      setImportResult(null);
                    }}
                    rows={5}
                    placeholder={
                      selectedLoadId
                        ? "Cole aqui as linhas da sua planilha diretamente do Excel.\nO sistema irá ler as colunas 'Cliente', 'Transportadora', 'Embarque' e 'Volume Embarque' automaticamente, ignorando colunas de Pedido, Peso, Valor e UF."
                        : "Cole aqui as linhas do Excel diretamente. Criaremos um novo carregamento automático para você com os embarques lidos!"
                    }
                    className="w-full bg-slate-50/70 text-slate-700 border border-slate-200 rounded-xl p-3.5 text-xs font-mono focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none placeholder-slate-400"
                  />
                  {spreadsheetText && (
                    <button
                      type="button"
                      onClick={() => {
                        setSpreadsheetText('');
                        setImportResult(null);
                      }}
                      className="absolute top-2 right-2 p-1 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors"
                      title="Clear text"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60 p-3 rounded-xl border border-slate-150">
                <div className="text-[11px] text-slate-500 flex items-start gap-1.5 max-w-sm">
                  <AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    Extraímos apenas os campos <strong className="text-slate-800">Cliente, Transportadora, Embarque e volume</strong>. As demais colunas são filtradas automaticamente.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleImportSpreadsheet}
                  disabled={!spreadsheetText.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:border-transparent text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md active:scale-95 shrink-0 border border-blue-700"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Processar e Importar Planilha
                </button>
              </div>

              {/* Import status block */}
              <AnimatePresence>
                {importResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
                      importResult.success
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-red-50 border-red-200 text-red-800'
                    }`}
                  >
                    {importResult.success ? (
                      importResult.count === 0 ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          <div>
                            <strong>Planilha carregada!</strong> O arquivo foi lido com sucesso. Clique em <span className="font-bold">"Processar e Importar Planilha"</span> para carregar os embarques.
                          </div>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 animate-pulse" />
                          <div>
                            <strong>Sucesso!</strong> Foram importados{' '}
                            <span className="font-bold underline">{importResult.count} embarques</span> com sucesso para este carregamento. Eles estão disponíveis para conferência e expedição.
                          </div>
                        </>
                      )
                    ) : (
                      <>
                        <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                        <div>
                          <strong>Falha de importação:</strong> {importResult.error ?? 'Verifique o formato das informações inseridas.'}
                        </div>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Active Shipments Table list */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-850 uppercase tracking-tight">
                  Grade de Embarques Planejados (Planning DB)
                </h3>
                <p className="text-xs text-slate-500">
                  Visualização da lista ativa para o veículo:{' '}
                  <strong className="text-slate-700">{activeCarregamento?.name || 'Selecione um carregamento'}</strong>
                </p>
              </div>
              <div className="flex gap-2 font-mono text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-150">
                <div>Total Embarques: <strong className="text-slate-800">{activeShipments.length}</strong></div>
                <div className="border-l border-slate-200 pl-2">Volumes: <strong className="text-slate-800">{totalVolumes}</strong></div>
              </div>
            </div>

            {/* Manual Shipments Form on-the-fly */}
            <form onSubmit={handleAddManualShipment} className="bg-slate-50/50 p-4 border-b border-slate-100 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-3">
                <label className="block text-[10px] font-semibold text-slate-500 uppercase font-mono tracking-tight mb-1">
                  Embarque (Cod. Barras)
                </label>
                <input
                  type="text"
                  value={manualShipmentNumber}
                  onChange={e => setManualShipmentNumber(e.target.value)}
                  placeholder="Ex: 30890550"
                  className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="md:col-span-4">
                <label className="block text-[10px] font-semibold text-slate-500 uppercase font-mono tracking-tight mb-1">
                  Cliente (Nome Completo)
                </label>
                <input
                  type="text"
                  value={manualClientName}
                  onChange={e => setManualClientName(e.target.value)}
                  placeholder="Ex: Drogasil CD Cajamar"
                  className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-[10px] font-semibold text-slate-500 uppercase font-mono tracking-tight mb-1">
                  Transportadora
                </label>
                <input
                  type="text"
                  value={manualCarrierName}
                  onChange={e => setManualCarrierName(e.target.value)}
                  placeholder="Ex: Braspress"
                  className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="md:col-span-1">
                <label className="block text-[10px] font-semibold text-slate-500 uppercase font-mono tracking-tight mb-1">
                  Vol.
                </label>
                <input
                  type="number"
                  min={1}
                  value={manualVolumes}
                  onChange={e => setManualVolumes(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-xs text-center focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="md:col-span-1">
                <button
                  type="submit"
                  className="w-full bg-slate-800 text-white hover:bg-slate-900 py-1.5 rounded-lg flex items-center justify-center transition-colors cursor-pointer text-xs font-semibold"
                  title="Adicionar Embarque Manual"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {manualError && (
                <div className="col-span-full text-[10px] text-red-600 font-medium">
                  * {manualError}
                </div>
              )}
            </form>

            {/* Shipment Grid */}
            {activeShipments.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                Nenhum embarque adicionado ao planejamento deste carregamento.<br />
                <span className="text-xs text-slate-400 mt-1 block">Escreva/cole uma planilha de teste acima ou crie logs individuais.</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-left text-xs bg-white">
                  <thead className="bg-slate-50 text-slate-500 font-mono tracking-wider uppercase font-semibold text-[10px]">
                    <tr>
                      <th className="py-2.5 px-4">Cód. Embarque</th>
                      <th className="py-2.5 px-4">Destinatário/Cliente</th>
                      <th className="py-2.5 px-4">Transportadora</th>
                      <th className="py-2.5 px-4 text-center">Volumes</th>
                      <th className="py-2.5 px-4 text-center">Status</th>
                      <th className="py-2.5 px-4 text-center w-32">Mover de Carga</th>
                      <th className="py-2.5 px-4 text-center w-12">Remover</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {activeShipments.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {s.shipmentNumber}
                        </td>
                        <td className="py-3 px-4 font-medium max-w-[200px] truncate">
                          {s.clientName}
                        </td>
                        <td className="py-3 px-4 text-slate-600 truncate">
                          {s.carrierName}
                        </td>
                        <td className="py-3 px-4 text-center font-bold">
                          {s.volumes}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            s.status === 'Carregado'
                              ? 'bg-emerald-100 text-emerald-800'
                              : s.status === 'Montado'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {s.status === 'Carregado' ? 'Carregado' : s.status === 'Montado' ? 'No Palete' : 'Pendente'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <select
                            value=""
                            onChange={e => {
                              if (e.target.value) handleMoveShipment(s.id, e.target.value);
                            }}
                            className="text-[10px] font-medium border border-slate-200 rounded-md px-1.5 py-1 outline-none bg-slate-50 text-slate-600 focus:ring-1 focus:ring-blue-500"
                            title="Transferir este embarque para outra carga, mesmo já paletizado"
                          >
                            <option value="">Mover para...</option>
                            {carregamentos
                              .filter(c => c.id !== s.carregamentoId)
                              .map(c => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                          </select>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteShipment(s.id)}
                            className="text-slate-400 hover:text-red-500 p-1 rounded-md hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
