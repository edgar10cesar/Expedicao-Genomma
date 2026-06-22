import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import PlanningSection from './components/PlanningSection';
import PalletAssemblySection from './components/PalletAssemblySection';
import TruckLoadingSection from './components/TruckLoadingSection';
import Login from './components/Login';
import UserManagement from './components/UserManagement';
import DashboardSection from './components/DashboardSection';
import { Carregamento, Shipment, Pallet, User, AuditLog, UserRole } from './types';
import {
  INITIAL_CARREGAMENTOS,
  INITIAL_SHIPMENTS,
  INITIAL_PALLETS
} from './utils/dataHelper';
import { db, handleFirestoreError, OperationType } from './lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, writeBatch, getDocs } from 'firebase/firestore';

function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  if (typeof obj === 'object') {
    const res: any = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val !== undefined) {
        res[key] = sanitizeObject(val);
      }
    }
    return res;
  }
  return obj;
}

async function syncToFirestore(collectionName: string, next: any[], prev: any[]) {
  try {
    const batch = writeBatch(db);
    let hasChanges = false;

    // 1. Add or set modified items
    for (const item of next) {
      const prevItem = prev.find(p => p.id === item.id);
      if (!prevItem || JSON.stringify(prevItem) !== JSON.stringify(item)) {
        batch.set(doc(db, collectionName, item.id), sanitizeObject(item));
        hasChanges = true;
      }
    }

    // 2. Remove deleted items
    for (const prevItem of prev) {
      if (!next.some(n => n.id === prevItem.id)) {
        batch.delete(doc(db, collectionName, prevItem.id));
        hasChanges = true;
      }
    }

    if (hasChanges) {
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, collectionName);
  }
}

export default function App() {
  // Navigation active tab: planning, assembly, loading, or admin
  const [activeTab, setActiveTab] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('sge_logged_user');
      if (saved) {
        const u = JSON.parse(saved);
        if (u.role === 'Gestor') return 'dashboard';
        if (u.role === 'Transporte') return 'planning';
        if (u.role === 'Checkout') return 'assembly';
        if (u.role === 'Expedição') return 'loading';
      }
    } catch {}
    return 'planning';
  });

  // Unified global databases loaded in real-time from Firestore
  const [carregamentos, _setCarregamentos] = useState<Carregamento[]>([]);
  const [shipments, _setShipments] = useState<Shipment[]>([]);
  const [pallets, _setPallets] = useState<Pallet[]>([]);
  const [users, _setUsers] = useState<User[]>([]);
  const [auditLogs, _setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Authenticated user session state
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('sge_logged_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    let active = true;

    // Safety timeout to force loading = false
    const timer = setTimeout(() => {
      if (active) {
        setLoading(false);
        console.warn('Firebase sync took longer than expected. Rendering workspace.');
      }
    }, 2500);

    // Seed Firestore if completely empty on first mount
    const initFirebaseData = async () => {
      try {
        const carrSnap = await getDocs(collection(db, 'carregamentos'));
        const shipSnap = await getDocs(collection(db, 'shipments'));
        const palSnap = await getDocs(collection(db, 'pallets'));
        const usersSnap = await getDocs(collection(db, 'users'));

        if (active) {
          const batch = writeBatch(db);
          let seeded = false;

          // Seeding business data
          if (carrSnap.empty && shipSnap.empty && palSnap.empty) {
            console.log('Firestore runs empty for first time. Seeding default payload...!');
            INITIAL_CARREGAMENTOS.forEach((item) => {
              batch.set(doc(db, 'carregamentos', item.id), item);
            });
            INITIAL_SHIPMENTS.forEach((item) => {
              batch.set(doc(db, 'shipments', item.id), item);
            });
            INITIAL_PALLETS.forEach((item) => {
              batch.set(doc(db, 'pallets', item.id), item);
            });
            seeded = true;
          }

          // Seeding default access credentials
          if (usersSnap.empty) {
            console.log('No users found in database. Seeding initial RBAC user profiles...!');
            const initialUsers: User[] = [
              { id: 'usr-gestor', fullName: 'Gestor do Sistema', username: 'gestor', password: '123', role: 'Gestor', status: 'Ativo', createdAt: new Date().toISOString() },
              { id: 'usr-transp', fullName: 'Operador de Transporte', username: 'transporte', password: '123', role: 'Transporte', status: 'Ativo', createdAt: new Date().toISOString() },
              { id: 'usr-check', fullName: 'Conferente de Checkout', username: 'checkout', password: '123', role: 'Checkout', status: 'Ativo', createdAt: new Date().toISOString() },
              { id: 'usr-exped', fullName: 'Operador de Expedição', username: 'expedicao', password: '123', role: 'Expedição', status: 'Ativo', createdAt: new Date().toISOString() },
            ];
            initialUsers.forEach((user) => {
              batch.set(doc(db, 'users', user.id), user);
            });
            seeded = true;
          }

          if (seeded) {
            await batch.commit();
          }
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, 'multiple_collections_seed');
      } finally {
        if (active) {
          setLoading(false);
          clearTimeout(timer);
        }
      }
    };

    initFirebaseData();

    // Setup real-time listeners for all devices sync
    const unsubCarr = onSnapshot(collection(db, 'carregamentos'), (snapshot) => {
      const list: Carregamento[] = [];
      snapshot.forEach((d) => list.push(d.data() as Carregamento));
      _setCarregamentos(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'carregamentos');
    });

    const unsubShip = onSnapshot(collection(db, 'shipments'), (snapshot) => {
      const list: Shipment[] = [];
      snapshot.forEach((d) => list.push(d.data() as Shipment));
      _setShipments(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'shipments');
    });

    const unsubPal = onSnapshot(collection(db, 'pallets'), (snapshot) => {
      const list: Pallet[] = [];
      snapshot.forEach((d) => list.push(d.data() as Pallet));
      _setPallets(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'pallets');
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const list: User[] = [];
      snapshot.forEach((d) => list.push(d.data() as User));
      _setUsers(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'users');
    });

    const unsubLogs = onSnapshot(collection(db, 'auditLogs'), (snapshot) => {
      const list: AuditLog[] = [];
      snapshot.forEach((d) => list.push(d.data() as AuditLog));
      _setAuditLogs(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'auditLogs');
    });

    return () => {
      active = false;
      clearTimeout(timer);
      unsubCarr();
      unsubShip();
      unsubPal();
      unsubUsers();
      unsubLogs();
    };
  }, []);

  // Update current user to match any updates on their account (e.g. status change or password reset)
  useEffect(() => {
    if (currentUser && users.length > 0) {
      const latestSelf = users.find(u => u.id === currentUser.id);
      if (latestSelf) {
        if (latestSelf.status === 'Inativo') {
          // Force logout if blocked
          handleLogout();
          alert('Aviso de Segurança: Sua conta foi inativada pelo Gestor e você foi desconectado(a).');
          return;
        }
        if (JSON.stringify(latestSelf) !== JSON.stringify(currentUser)) {
          setCurrentUser(latestSelf);
          localStorage.setItem('sge_logged_user', JSON.stringify(latestSelf));
        }
      }
    }
  }, [users, currentUser]);

  // Sync state helpers that propagate to Firestore automatically
  const setCarregamentos = (action: React.SetStateAction<Carregamento[]>) => {
    _setCarregamentos(prev => {
      const next = typeof action === 'function' ? (action as Function)(prev) : action;
      syncToFirestore('carregamentos', next, prev);
      return next;
    });
  };

  const setShipments = (action: React.SetStateAction<Shipment[]>) => {
    _setShipments(prev => {
      const next = typeof action === 'function' ? (action as Function)(prev) : action;
      syncToFirestore('shipments', next, prev);
      return next;
    });
  };

  const setPallets = (action: React.SetStateAction<Pallet[]>) => {
    _setPallets(prev => {
      const next = typeof action === 'function' ? (action as Function)(prev) : action;
      syncToFirestore('pallets', next, prev);
      return next;
    });
  };

  const setUsersState = (action: React.SetStateAction<User[]>) => {
    _setUsers(prev => {
      const next = typeof action === 'function' ? (action as Function)(prev) : action;
      syncToFirestore('users', next, prev);
      return next;
    });
  };

  const setAuditLogsState = (action: React.SetStateAction<AuditLog[]>) => {
    _setAuditLogs(prev => {
      const next = typeof action === 'function' ? (action as Function)(prev) : action;
      syncToFirestore('auditLogs', next, prev);
      return next;
    });
  };

  // Compile global statistics for display
  const stats = {
    totalCarregamentos: carregamentos.length,
    totalShipments: shipments.length,
    totalPallets: pallets.length,
    totalLoadedPallets: pallets.filter(p => p.loaded).length
  };

  const handleClearAllData = async () => {
    try {
      const batch = writeBatch(db);
      
      carregamentos.forEach((c) => {
        batch.delete(doc(db, 'carregamentos', c.id));
      });
      shipments.forEach((s) => {
        batch.delete(doc(db, 'shipments', s.id));
      });
      pallets.forEach((p) => {
        batch.delete(doc(db, 'pallets', p.id));
      });

      await batch.commit();

      _setCarregamentos([]);
      _setShipments([]);
      _setPallets([]);

      // Audit log the clearing action
      if (currentUser) {
        const logId = `log-${Math.random().toString(36).substring(2, 11)}`;
        const logObj: AuditLog = {
          id: logId,
          action: 'Alteração de Usuário',
          timestamp: new Date().toISOString(),
          actorId: currentUser.id,
          actorName: currentUser.username,
          details: `Iniciada a limpeza completa da base transacional de homologação por @${currentUser.username}.`
        };
        await setDoc(doc(db, 'auditLogs', logId), logObj);
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'multiple_collections_clear');
    }
  };

  // User Administration Methods
  const handleAddUser = (newU: Omit<User, 'id' | 'createdAt'>) => {
    if (!currentUser) return;
    const newId = `usr-${Math.random().toString(36).substring(2, 11)}`;
    const userObj: User = {
      ...newU,
      id: newId,
      createdAt: new Date().toISOString()
    };
    
    setUsersState(prev => [...prev, userObj]);
    
    const logId = `log-${Math.random().toString(36).substring(2, 11)}`;
    const logObj: AuditLog = {
      id: logId,
      action: 'Criação de Usuário',
      timestamp: new Date().toISOString(),
      actorId: currentUser.id,
      actorName: currentUser.username,
      details: `Novo colaborador "${userObj.fullName}" (@${userObj.username}) foi cadastrado com perfil "${userObj.role}" e status "${userObj.status}".`
    };
    setAuditLogsState(prev => [...prev, logObj]);
  };

  const handleUpdateUser = (updatedU: User) => {
    if (!currentUser) return;
    
    const oldU = users.find(u => u.id === updatedU.id);
    let detailsStr = `Cadastro do colaborador "${updatedU.fullName}" (@${updatedU.username}) foi atualizado pelo gestor SGE.`;
    let act: AuditLog['action'] = 'Alteração de Usuário';

    if (oldU) {
      const changes: string[] = [];
      if (oldU.role !== updatedU.role) {
        act = 'Alteração de Permissões';
        changes.push(`perfil ajustado de "${oldU.role}" para "${updatedU.role}"`);
      }
      if (oldU.status !== updatedU.status) {
        changes.push(`status alterado de "${oldU.status}" para "${updatedU.status}"`);
      }
      if (oldU.fullName !== updatedU.fullName) {
        changes.push(`nome corrigido de "${oldU.fullName}" para "${updatedU.fullName}"`);
      }
      if (oldU.username !== updatedU.username) {
        changes.push(`username alterado de "@${oldU.username}" para "@${updatedU.username}"`);
      }
      if (changes.length > 0) {
        detailsStr = `Modificações no cadastro de "${updatedU.fullName}" (@${updatedU.username}): ${changes.join(', ')}.`;
      }
    }

    setUsersState(prev => prev.map(u => u.id === updatedU.id ? updatedU : u));

    const logId = `log-${Math.random().toString(36).substring(2, 11)}`;
    const logObj: AuditLog = {
      id: logId,
      action: act,
      timestamp: new Date().toISOString(),
      actorId: currentUser.id,
      actorName: currentUser.username,
      details: detailsStr
    };
    setAuditLogsState(prev => [...prev, logObj]);
  };

  const handleDeleteUser = (idToDelete: string) => {
    if (!currentUser) return;
    const targetU = users.find(u => u.id === idToDelete);
    if (!targetU) return;

    setUsersState(prev => prev.filter(u => u.id !== idToDelete));

    const logId = `log-${Math.random().toString(36).substring(2, 11)}`;
    const logObj: AuditLog = {
      id: logId,
      action: 'Exclusão de Usuário',
      timestamp: new Date().toISOString(),
      actorId: currentUser.id,
      actorName: currentUser.username,
      details: `Colaborador "${targetU.fullName}" (@${targetU.username}) foi apagado permanentemente do sistema.`
    };
    setAuditLogsState(prev => [...prev, logObj]);
  };

  const handleResetPassword = (targetUserId: string, newPass: string) => {
    if (!currentUser) return;
    const targetU = users.find(u => u.id === targetUserId);
    if (!targetU) return;

    setUsersState(prev => prev.map(u => u.id === targetUserId ? { ...u, password: newPass } : u));

    const logId = `log-${Math.random().toString(36).substring(2, 11)}`;
    const logObj: AuditLog = {
      id: logId,
      action: 'Redefinição de Senha',
      timestamp: new Date().toISOString(),
      actorId: currentUser.id,
      actorName: currentUser.username,
      details: `Nova senha corporativa definida para o colaborador "${targetU.fullName}" (@${targetU.username}) pelo gestor responsável.`
    };
    setAuditLogsState(prev => [...prev, logObj]);
  };

  // Login session initialization
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('sge_logged_user', JSON.stringify(user));
    
    // Redirect to permitted layout
    if (user.role === 'Transporte') {
      setActiveTab('planning');
    } else if (user.role === 'Checkout') {
      setActiveTab('assembly');
    } else if (user.role === 'Expedição') {
      setActiveTab('loading');
    } else if (user.role === 'Gestor') {
      setActiveTab('dashboard');
    } else {
      setActiveTab('planning');
    }

    const logId = `log-${Math.random().toString(36).substring(2, 11)}`;
    const logObj: AuditLog = {
      id: logId,
      action: 'Login',
      timestamp: new Date().toISOString(),
      actorId: user.id,
      actorName: user.username,
      details: `Dispositivo autenticado com sucesso sob perfil "${user.role}" pelo operador "${user.fullName}".`
    };
    setAuditLogsState(prev => [...prev, logObj]);
  };

  const handleLogout = () => {
    if (!currentUser) return;

    const logId = `log-${Math.random().toString(36).substring(2, 11)}`;
    const logObj: AuditLog = {
      id: logId,
      action: 'Logout',
      timestamp: new Date().toISOString(),
      actorId: currentUser.id,
      actorName: currentUser.username,
      details: `Sessão do operador "${currentUser.fullName}" (@${currentUser.username}) encerrada voluntariamente.`
    };
    setAuditLogsState(prev => [...prev, logObj]);

    setCurrentUser(null);
    localStorage.removeItem('sge_logged_user');
  };

  // Safe tab selection wrapper
  const handleSetTabFiltered = (tab: string) => {
    if (!currentUser) return;

    if (currentUser.role === 'Transporte' && tab !== 'planning') {
      alert('Acesso Bloqueado: Seu cargo Transporte possui acesso exclusivo à Programação de Transportes.');
      return;
    }
    if (currentUser.role === 'Checkout' && tab !== 'assembly') {
      alert('Acesso Bloqueado: Seu cargo Checkout possui acesso exclusivo à Montagem de Paletes.');
      return;
    }
    if (currentUser.role === 'Expedição' && tab !== 'loading') {
      alert('Acesso Bloqueado: Seu cargo Expedição possui acesso exclusivo à Conferência de Carregamento.');
      return;
    }
    if (tab === 'admin' && currentUser.role !== 'Gestor') {
      alert('Acesso Bloqueado: Painel administrativo restrito a Gestores do Sistema.');
      return;
    }
    if (tab === 'dashboard' && currentUser.role !== 'Gestor') {
      alert('Acesso Bloqueado: Painel de Indicadores e Dashboard Gerencial restrito a Gestores do Sistema.');
      return;
    }

    setActiveTab(tab);
  };

  // Rendering screen based on database sync status
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center font-sans p-6 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin"></div>
          <div className="space-y-1">
            <span className="text-sm font-semibold text-slate-300 font-mono tracking-widest uppercase block">Sincronizando SGE</span>
            <span className="text-xs text-slate-500 font-mono">Realizando comunicação criptografada com Firestore...</span>
          </div>
        </div>
      </div>
    );
  }

  // Auth gate
  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} users={users} />;
  }

  // Permission validation guard checks
  const isTabAllowed = () => {
    if (currentUser.role === 'Gestor') return true;
    if (currentUser.role === 'Transporte') return activeTab === 'planning';
    if (currentUser.role === 'Checkout') return activeTab === 'assembly';
    if (currentUser.role === 'Expedição') return activeTab === 'loading';
    return false;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col antialiased">
      
      {/* Portals Main Header Navigation */}
      <Header 
        activeTab={activeTab} 
        setActiveTab={handleSetTabFiltered} 
        stats={stats} 
        onClearAllData={handleClearAllData} 
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Primary Workstation Dashboard container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        
        {/* If tab is not allowed, render Access Denied alert to block views */}
        {!isTabAllowed() ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 shadow-sm space-y-4 max-w-lg mx-auto text-center font-sans">
            <h3 className="text-md font-black text-red-900 uppercase">Acesso Não Autorizado pelo Servidor</h3>
            <p className="text-xs text-red-700 leading-relaxed">
              Tentativa de bypass detectada. Seu perfil corporativo atual <strong>({currentUser.role})</strong> não possui privilégios para executar tarefas neste módulo.
            </p>
            <button
              onClick={() => {
                if (currentUser.role === 'Transporte') setActiveTab('planning');
                else if (currentUser.role === 'Checkout') setActiveTab('assembly');
                else if (currentUser.role === 'Expedição') setActiveTab('loading');
              }}
              className="mt-2 bg-red-650 hover:bg-red-750 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer"
            >
              Retornar ao meu Módulo Permitido
            </button>
          </div>
        ) : (
          <>
            {/* Render Active Session Views with Double Route Guard Protection */}
            {activeTab === 'dashboard' && currentUser.role === 'Gestor' && (
              <DashboardSection
                carregamentos={carregamentos}
                shipments={shipments}
                pallets={pallets}
                currentUser={currentUser}
              />
            )}

            {activeTab === 'planning' && (currentUser.role === 'Gestor' || currentUser.role === 'Transporte') && (
              <PlanningSection
                carregamentos={carregamentos}
                shipments={shipments}
                setCarregamentos={setCarregamentos}
                setShipments={setShipments}
                currentUser={currentUser}
                pallets={pallets}
                setPallets={setPallets}
              />
            )}

            {activeTab === 'assembly' && (currentUser.role === 'Gestor' || currentUser.role === 'Checkout') && (
              <PalletAssemblySection
                carregamentos={carregamentos}
                shipments={shipments}
                pallets={pallets}
                setShipments={setShipments}
                setPallets={setPallets}
                setCarregamentos={setCarregamentos}
              />
            )}

            {activeTab === 'loading' && (currentUser.role === 'Gestor' || currentUser.role === 'Expedição') && (
              <TruckLoadingSection
                carregamentos={carregamentos}
                shipments={shipments}
                pallets={pallets}
                setShipments={setShipments}
                setPallets={setPallets}
                setCarregamentos={setCarregamentos}
              />
            )}

            {activeTab === 'admin' && currentUser.role === 'Gestor' && (
              <UserManagement
                currentUser={currentUser}
                users={users}
                logs={auditLogs}
                onAddUser={handleAddUser}
                onUpdateUser={handleUpdateUser}
                onDeleteUser={handleDeleteUser}
                onResetPassword={handleResetPassword}
              />
            )}
          </>
        )}

      </main>

      {/* Corporate platform footer */}
      <footer className="bg-white border-t border-slate-200 py-5 text-center mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-xs text-slate-400 font-mono flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <span>Genomma Lab. Brasil © {new Date().getFullYear()} • Plataforma SGE</span>
          <span>Modulo de Expedição de Alta Fidelidade • v2.4.0 (QR Codes GS1-128)</span>
        </div>
      </footer>
    </div>
  );
}

