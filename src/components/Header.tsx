import React, { useState, useRef } from 'react';
import { Truck, Boxes, FileSpreadsheet, LayoutDashboard, Trash2, Shield, LogOut, User as UserIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { User, UserRole } from '../types';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  stats: {
    totalCarregamentos: number;
    totalShipments: number;
    totalPallets: number;
    totalLoadedPallets: number;
  };
  onClearAllData: () => void;
  currentUser: User | null;
  onLogout: () => void;
}

export default function Header({ activeTab, setActiveTab, stats, onClearAllData, currentUser, onLogout }: HeaderProps) {
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollTabs = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 280;
      const currentScroll = scrollRef.current.scrollLeft;
      const targetScroll = direction === 'left' ? currentScroll - scrollAmount : currentScroll + scrollAmount;
      scrollRef.current.scrollTo({
        left: targetScroll,
        behavior: 'smooth'
      });
    }
  };
  
  const roleName = (role?: UserRole) => {
    switch(role) {
      case 'Gestor': return 'Gestor do Sistema';
      case 'Transporte': return 'Transporte';
      case 'Checkout': return 'Checkout';
      case 'Expedição': return 'Expedição';
      default: return 'Colaborador';
    }
  };

  const getRoleColor = (role?: UserRole) => {
    switch (role) {
      case 'Gestor':
        return 'bg-indigo-100 text-indigo-700 border border-indigo-200';
      case 'Transporte':
        return 'bg-blue-100 text-blue-700 border border-blue-200';
      case 'Checkout':
        return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
      case 'Expedição':
        return 'bg-amber-100 text-amber-700 border border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between md:h-16 py-3 md:py-0 md:items-center gap-3">
          {/* Logo & Branding */}
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white p-2 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/15">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg text-slate-900 tracking-tight">Genomma Lab.</span>
                <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Expedição SGE
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono tracking-tight">Portal SGE • Sistema de Gestão de Embarques</p>
            </div>
          </div>

          {/* User Profile Info Card and Actions */}
          {currentUser && (
            <div className="flex flex-wrap items-center gap-3">
              {/* Authenticated label / user indicators */}
              <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-1.5 px-3 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center">
                  <UserIcon className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-800 leading-3">{currentUser.fullName}</div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className={`text-[8px] font-extrabold px-1.5 py-px uppercase rounded-full ${getRoleColor(currentUser.role)}`}>
                      {roleName(currentUser.role)}
                    </span>
                    <span className="text-[8px] font-bold text-slate-400 font-mono">@{currentUser.username}</span>
                  </div>
                </div>
              </div>

              {/* Quick Action to Clear Local Testing Data */}
              {currentUser.role === 'Gestor' && (
                <button
                  id="clear-all-data-btn"
                  onClick={() => {
                    if (confirmClear) {
                      onClearAllData();
                      setConfirmClear(false);
                    } else {
                      setConfirmClear(true);
                      setTimeout(() => setConfirmClear(false), 4000);
                    }
                  }}
                  className={`text-xs font-semibold px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                    confirmClear
                      ? 'bg-red-655 text-white bg-red-600 border border-red-600 animate-pulse'
                      : 'text-red-600 border border-red-200 hover:bg-red-600 hover:text-white bg-red-50/50'
                  }`}
                  title="Zera a base de dados em cache deste navegador para recomeçar do zero"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{confirmClear ? "Confirmar Limpar?" : "Limpar Dados"}</span>
                </button>
              )}

              {/* Secure Log Out button */}
              <button
                onClick={() => {
                  if (confirmLogout) {
                    onLogout();
                    setConfirmLogout(false);
                  } else {
                    setConfirmLogout(true);
                    setTimeout(() => setConfirmLogout(false), 4000);
                  }
                }}
                className={`text-xs font-black px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                  confirmLogout
                    ? 'bg-rose-600 text-white border border-rose-600 animate-pulse'
                    : 'text-slate-600 border border-slate-200 hover:border-rose-200 hover:bg-rose-50 bg-white'
                }`}
                title="Sair com segurança e bloquear acesso"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{confirmLogout ? "Confirmar Sair?" : "Sair"}</span>
              </button>
            </div>
          )}
        </div>

        {/* Real-time Workflow Steps - Interactive Navigation styled after the Sleek Interface theme with Arrow controls and scrollbar */}
        {currentUser && (
          <div className="relative border-t border-slate-100 -mb-px flex items-center bg-slate-50/10">
            {/* Left Scroll Button */}
            <button
              type="button"
              onClick={() => scrollTabs('left')}
              className="absolute left-0 top-[1px] bottom-0 z-10 px-2 lg:px-3 bg-gradient-to-r from-white via-white/95 to-transparent flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all cursor-pointer select-none border-r border-slate-100"
              title="Voltar sessões"
              aria-label="Voltar sessões"
            >
              <div className="bg-white border border-slate-200/80 hover:border-blue-400 hover:text-blue-600 shadow-xs hover:shadow-sm rounded-full p-1.5 flex items-center justify-center transition-all duration-200 hover:bg-blue-50/30">
                <ChevronLeft className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
            </button>

            {/* Scrollable container with exact ref */}
            <div
              ref={scrollRef}
              className="flex-1 flex overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent py-0.5 px-12 md:px-16 -mb-px"
              style={{
                scrollBehavior: 'smooth',
                scrollbarWidth: 'thin'
              }}
            >
              {currentUser.role === 'Gestor' && (
                <button
                  id="nav-tab-dashboard"
                  onClick={() => setActiveTab('dashboard')}
                  className={`flex items-center gap-2 py-3.5 px-4 border-b-2 text-sm font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                    activeTab === 'dashboard'
                      ? 'border-indigo-600 text-indigo-600 bg-indigo-50/40'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="flex items-center gap-1.5 font-bold">
                    Dashboard Gerencial
                    <span className={`text-[10px] rounded-full px-1.5 font-bold ${activeTab === 'dashboard' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>Indicadores</span>
                  </span>
                </button>
              )}

              {(currentUser.role === 'Gestor' || currentUser.role === 'Transporte') && (
                <button
                  id="nav-tab-planning"
                  onClick={() => setActiveTab('planning')}
                  className={`flex items-center gap-2 py-3.5 px-4 border-b-2 text-sm font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                    activeTab === 'planning'
                      ? 'border-blue-600 text-blue-600 bg-blue-50/40'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span className="flex items-center gap-1.5">
                    1. Programação de Transportes
                    <span className={`text-[10px] rounded-full px-1.5 font-bold ${activeTab === 'planning' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>Lançador</span>
                  </span>
                </button>
              )}

              {(currentUser.role === 'Gestor' || currentUser.role === 'Checkout') && (
                <button
                  id="nav-tab-assembly"
                  onClick={() => setActiveTab('assembly')}
                  className={`flex items-center gap-2 py-3.5 px-4 border-b-2 text-sm font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                    activeTab === 'assembly'
                      ? 'border-blue-600 text-blue-600 bg-blue-50/40'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                  }`}
                >
                  <Boxes className="w-4 h-4" />
                  <span className="flex items-center gap-1.5">
                    2. Montagem de Paletes (Checkout)
                    <span className={`text-[10px] rounded-full px-1.5 font-bold ${activeTab === 'assembly' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>Expedição</span>
                  </span>
                </button>
              )}

              {(currentUser.role === 'Gestor' || currentUser.role === 'Expedição') && (
                <button
                  id="nav-tab-loading"
                  onClick={() => setActiveTab('loading')}
                  className={`flex items-center gap-2 py-3.5 px-4 border-b-2 text-sm font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                    activeTab === 'loading'
                      ? 'border-blue-600 text-blue-600 bg-blue-50/40'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                  }`}
                >
                  <Truck className="w-4 h-4" />
                  <span className="flex items-center gap-1.5">
                    3. Conferência de Carregamento
                    <span className={`text-[10px] rounded-full px-1.5 font-bold ${activeTab === 'loading' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>Carga final</span>
                  </span>
                </button>
              )}

              {currentUser.role === 'Gestor' && (
                <button
                  id="nav-tab-admin"
                  onClick={() => setActiveTab('admin')}
                  className={`flex items-center gap-2 py-3.5 px-4 border-b-2 text-sm font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                    activeTab === 'admin'
                      ? 'border-indigo-600 text-indigo-600 bg-indigo-50/40'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span className="flex items-center gap-1.5">
                    Painel de Controle
                    <span className={`text-[10px] rounded-full px-1.5 font-bold ${activeTab === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>Gestão & Auditoria</span>
                  </span>
                </button>
              )}
            </div>

            {/* Right Scroll Button */}
            <button
              type="button"
              onClick={() => scrollTabs('right')}
              className="absolute right-0 top-[1px] bottom-0 z-10 px-2 lg:px-3 bg-gradient-to-l from-white via-white/95 to-transparent flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all cursor-pointer select-none border-l border-slate-100"
              title="Avançar sessões"
              aria-label="Avançar sessões"
            >
              <div className="bg-white border border-slate-200/80 hover:border-blue-400 hover:text-blue-600 shadow-xs hover:shadow-sm rounded-full p-1.5 flex items-center justify-center transition-all duration-200 hover:bg-blue-50/30">
                <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

