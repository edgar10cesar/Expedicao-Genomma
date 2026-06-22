import { Carregamento, Shipment, Pallet } from '../types';

// Pre-populate with realistic Genomma Lab shipment data
export const INITIAL_CARREGAMENTOS: Carregamento[] = [
  {
    id: 'carr_sp_01',
    name: 'Carregamento Rota SP-Sul (Placa GNM-4522)',
    date: '18/06/2026',
    status: 'Em_Andamento'
  },
  {
    id: 'carr_rj_02',
    name: 'Carregamento CD Rio Jamef (Placa BRA-9X31)',
    date: '18/06/2026',
    status: 'Pendente'
  },
  {
    id: 'carr_ne_03',
    name: 'Carregamento Nordeste Express (Placa GNM-8819)',
    date: '19/06/2026',
    status: 'Pendente'
  }
];

export const INITIAL_SHIPMENTS: Shipment[] = [
  // SP-Sul Shipment List
  {
    id: 'ship_01',
    shipmentNumber: '30890111',
    clientName: 'Droga Raia - CD Embu SP',
    carrierName: 'Transportadora Braspress',
    volumes: 12,
    carregamentoId: 'carr_sp_01',
    status: 'Pendente'
  },
  {
    id: 'ship_02',
    shipmentNumber: '30890112',
    clientName: 'Droga Raia - CD Embu SP',
    carrierName: 'Transportadora Braspress',
    volumes: 8,
    carregamentoId: 'carr_sp_01',
    status: 'Pendente'
  },
  {
    id: 'ship_03',
    shipmentNumber: '30890113',
    clientName: 'Drogasil - CD Cajamar SP',
    carrierName: 'Cargo BR Logística',
    volumes: 25,
    carregamentoId: 'carr_sp_01',
    status: 'Pendente'
  },
  {
    id: 'ship_04',
    shipmentNumber: '30890114',
    clientName: 'Carrefour Cajamar',
    carrierName: 'Genomma Frota Própria',
    volumes: 15,
    carregamentoId: 'carr_sp_01',
    status: 'Pendente'
  },
  {
    id: 'ship_05',
    shipmentNumber: '30890115',
    clientName: 'Farmácias Pague Menos - CD Sul',
    carrierName: 'Express São Miguel',
    volumes: 14,
    carregamentoId: 'carr_sp_01',
    status: 'Pendente'
  },
  {
    id: 'ship_06',
    shipmentNumber: '30890116',
    clientName: 'Farmácias Pague Menos - CD Sul',
    carrierName: 'Express São Miguel',
    volumes: 10,
    carregamentoId: 'carr_sp_01',
    status: 'Pendente'
  },
  {
    id: 'ship_07',
    shipmentNumber: '30890117',
    clientName: 'Drogaria São Paulo - CD Osasco',
    carrierName: 'Express São Miguel',
    volumes: 18,
    carregamentoId: 'carr_sp_01',
    status: 'Pendente'
  },

  // RJ Shipment List
  {
    id: 'ship_08',
    shipmentNumber: '31920221',
    clientName: 'Pacheco CD Pavia RJ',
    carrierName: 'Tercerizado Jamef',
    volumes: 30,
    carregamentoId: 'carr_rj_02',
    status: 'Pendente'
  },
  {
    id: 'ship_09',
    shipmentNumber: '31920222',
    clientName: 'Drogaria Venancio CD Rio',
    carrierName: 'Tercerizado Jamef',
    volumes: 20,
    carregamentoId: 'carr_rj_02',
    status: 'Pendente'
  }
];

// Initial Pallets generated in system
export const INITIAL_PALLETS: Pallet[] = [
  {
    id: 'PAL-20260618-001',
    carregamentoId: 'carr_sp_01',
    createdAt: '2026-06-18T09:30:00.000Z',
    shipments: [
      { shipmentNumber: '30890111', clientName: 'Droga Raia - CD Embu SP', carrierName: 'Transportadora Braspress', volumes: 12 },
      { shipmentNumber: '30890112', clientName: 'Droga Raia - CD Embu SP', carrierName: 'Transportadora Braspress', volumes: 8 },
      { shipmentNumber: '30890113', clientName: 'Drogasil - CD Cajamar SP', carrierName: 'Cargo BR Logística', volumes: 25 }
    ],
    loaded: false
  }
];

// Localstorage state helpers
export const loadLocalStorage = (key: string, defaultValue: any) => {
  try {
    const saved = localStorage.getItem(`genomma_expedicao_${key}`);
    return saved ? JSON.parse(saved) : defaultValue;
  } catch (e) {
    console.error('Error loading key: ', key, e);
    return defaultValue;
  }
};

export const saveLocalStorage = (key: string, value: any) => {
  try {
    localStorage.setItem(`genomma_expedicao_${key}`, JSON.stringify(value));
  } catch (e) {
    console.error('Error saving key: ', key, e);
  }
};
