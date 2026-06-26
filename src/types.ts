export interface Shipment {
  id: string; // Internal identifier
  shipmentNumber: string; // The physical GS1-128 code/shipment ID
  clientName: string;
  carrierName: string;
  volumes: number;
  carregamentoId: string; // Associated load
  status: 'Pendente' | 'Montado' | 'Carregado';
  palletId?: string; // Assigned pallet if any
}

export interface Carregamento {
  id: string;
  name: string; // Name of load/vehicle, e.g. "Carregamento #204 - Placa MER-4521"
  date: string;
  status: 'Pendente' | 'Em_Andamento' | 'Concluido';
  vehicleCapacity?: number; // Capacidade de Pallets do Veículo
}

export interface Pallet {
  id: string; // ID printed on QR code, e.g. "PAL-20260618-001"
  carregamentoId: string; // Load it is meant for (can be cross-checked)
  createdAt: string;
  shipments: {
    shipmentNumber: string;
    clientName: string;
    carrierName: string;
    volumes: number;
  }[];
  loaded: boolean;
  loadedAt?: string;
  loadedVehicleId?: string; // Vehicle it was actually loaded onto
  volumeInicial?: number;
  volumeFinal?: number;
}

export interface ScanResult {
  palletId: string;
  carregamentoId: string;
  shipments: {
    shipmentNumber: string;
    clientName: string;
    carrierName: string;
    volumes: number;
  }[];
}

export type UserRole = 'Transporte' | 'Checkout' | 'Expedição' | 'Gestor';

export interface User {
  id: string;
  fullName: string;
  username: string;
  password?: string;
  role: UserRole;
  status: 'Ativo' | 'Inativo';
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: 'Login' | 'Logout' | 'Criação de Usuário' | 'Alteração de Usuário' | 'Exclusão de Usuário' | 'Alteração de Permissões' | 'Redefinição de Senha';
  timestamp: string;
  actorId: string;
  actorName: string;
  details: string;
}

