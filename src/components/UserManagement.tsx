import React, { useState } from 'react';
import { 
  Users, Shield, UserPlus, FileClock, Check, X, AlertTriangle, 
  Trash2, Edit, KeyRound, CheckSquare, Search, Ban, Key
} from 'lucide-react';
import { User, AuditLog, UserRole } from '../types';

interface UserManagementProps {
  currentUser: User;
  users: User[];
  logs: AuditLog[];
  onAddUser: (u: Omit<User, 'id' | 'createdAt'>) => void;
  onUpdateUser: (u: User) => void;
  onDeleteUser: (id: string) => void;
  onResetPassword: (targetUserId: string, newPass: string) => void;
}

export default function UserManagement({
  currentUser,
  users,
  logs,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onResetPassword
}: UserManagementProps) {
  
  // Tabs within Admin Section (User Directory vs Audit Trail)
  const [adminSubTab, setAdminSubTab] = useState<'users' | 'audit'>('users');
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  // Modals / Form states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Payload for Add User
  const [newFullName, setNewFullName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('Transporte');
  const [newStatus, setNewStatus] = useState<'Ativo' | 'Inativo'>('Ativo');
  const [addError, setAddError] = useState('');

  // Payload for Editing User
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editError, setEditError] = useState('');

  // Payload for Passwords Redefinitions
  const [passwordTargetUser, setPasswordTargetUser] = useState<User | null>(null);
  const [newSecretPassword, setNewSecretPassword] = useState('');
  const [passError, setPassError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Roles utility names
  const roleLabels: Record<UserRole, { label: string; color: string }> = {
    'Gestor': { label: 'Gestor do Sistema', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
    'Transporte': { label: 'Transporte (Programação)', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    'Checkout': { label: 'Checkout (Etiquetas)', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    'Expedição': { label: 'Expedição (Conferência)', color: 'bg-amber-100 text-amber-800 border-amber-200' }
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');

    if (!newFullName.trim() || !newUsername.trim() || !newPassword.trim()) {
      setAddError('Por favor preencha todos os campos obrigatórios.');
      return;
    }

    const usernameExists = users.some(u => u.username.toLowerCase() === newUsername.trim().toLowerCase());
    if (usernameExists) {
      setAddError(`O nome de usuário "${newUsername}" já está em uso.`);
      return;
    }

    onAddUser({
      fullName: newFullName.trim(),
      username: newUsername.trim().toLowerCase(),
      password: newPassword,
      role: newRole,
      status: newStatus
    });

    // Reset Form
    setNewFullName('');
    setNewUsername('');
    setNewPassword('');
    setNewRole('Transporte');
    setNewStatus('Ativo');
    setShowAddModal(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');

    if (!editingUser) return;

    if (!editingUser.fullName.trim() || !editingUser.username.trim()) {
      setEditError('Nome e Usuário são campos obrigatórios.');
      return;
    }

    // Check username duplicates excluding self
    const usernameExists = users.some(u => u.id !== editingUser.id && u.username.toLowerCase() === editingUser.username.trim().toLowerCase());
    if (usernameExists) {
      setEditError(`O nome de usuário "${editingUser.username}" já está sendo usado por outra pessoa.`);
      return;
    }

    onUpdateUser({
      ...editingUser,
      fullName: editingUser.fullName.trim(),
      username: editingUser.username.trim().toLowerCase()
    });

    setEditingUser(null);
    setShowEditModal(false);
  };

  const handlePasswordResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');

    if (!passwordTargetUser) return;

    if (!newSecretPassword.trim() || newSecretPassword.length < 3) {
      setPassError('A nova senha precisa ter no mínimo 3 caracteres.');
      return;
    }

    onResetPassword(passwordTargetUser.id, newSecretPassword.trim());

    setPasswordTargetUser(null);
    setNewSecretPassword('');
    setShowPasswordModal(false);
  };

  const toggleUserStatus = (user: User) => {
    if (user.id === currentUser.id) {
      alert('Bloqueio proibido: Você não pode inativar sua própria conta corrente.');
      return;
    }

    onUpdateUser({
      ...user,
      status: user.status === 'Ativo' ? 'Inativo' : 'Ativo'
    });
  };

  const handleDeleteClick = (user: User) => {
    if (user.id === currentUser.id) {
      alert('Exclusão negada: Você não pode excluir seu próprio login de gestor ativo.');
      return;
    }

    if (confirmDeleteId === user.id) {
      onDeleteUser(user.id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(user.id);
      setTimeout(() => {
        setConfirmDeleteId(prev => prev === user.id ? null : prev);
      }, 4000);
    }
  };

  // Filter lists based on search term
  const filteredUsers = users.filter(u => 
    u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getLogBadge = (action: string) => {
    switch (action) {
      case 'Login':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Logout':
        return 'bg-slate-200 text-slate-800 border-slate-300';
      case 'Criação de Usuário':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Alteração de Usuário':
      case 'Alteração de Permissões':
        return 'bg-pink-100 text-pink-800 border-pink-200';
      case 'Redefinição de Senha':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Exclusão de Usuário':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Page Title & Navigation Tabs */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-start md:items-center font-sans">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Shield className="w-5 h-5 flex-shrink-0" />
            </div>
            <h2 className="text-md font-extrabold text-slate-900 tracking-tight uppercase">
              Área Administrativa & Logs de Sistema
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-mono">
            Bem-vindo(a), {currentUser.fullName.split(' ')[0]} • Registro de conexões, RBAC e rastreabilidade SGE
          </p>
        </div>

        {/* Local Admin Navigation Menu */}
        <div className="flex bg-slate-100 rounded-xl p-0.5 border border-slate-200/50 w-full md:w-auto">
          <button
            onClick={() => setAdminSubTab('users')}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-1 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              adminSubTab === 'users' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-850'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Diretório de Usuários ({users.length})</span>
          </button>
          
          <button
            onClick={() => setAdminSubTab('audit')}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-1 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              adminSubTab === 'audit' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-850'
            }`}
          >
            <FileClock className="w-3.5 h-3.5" />
            <span>Trilha de Auditoria ({logs.length})</span>
          </button>
        </div>
      </div>

      {minifiedWorkspace()}

    </div>
  );

  function minifiedWorkspace() {
    if (adminSubTab === 'users') {
      return (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm font-sans">
          
          {/* Header Actions */}
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-slate-50/50">
            <div className="relative flex-1 max-w-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Pesquisar por nome, usuário ou perfil..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs text-slate-800 bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2.5 outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-xs"
              />
            </div>

            <button
              onClick={() => {
                setAddError('');
                setShowAddModal(true);
              }}
              className="bg-indigo-600 text-white font-black text-xs px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Cadastrar Novo Usuário</span>
            </button>
          </div>

          {/* Directory Grid/Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 font-mono uppercase bg-slate-50">
                  <th className="py-3 px-5">Colaborador / Acesso</th>
                  <th className="py-3 px-5">Nome de Usuário</th>
                  <th className="py-3 px-5">Perfil de Acesso SGE</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5">Criado Em</th>
                  <th className="py-3 px-5 text-right">Controles Administrativos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400 font-medium">
                      Nenhum colaborador localizado com os termos informados.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const profile = roleLabels[user.role] || { label: 'Desconhecido', color: 'bg-slate-100 text-slate-600' };
                    return (
                      <tr key={user.id} className="hover:bg-slate-50/50">
                        {/* Name and lock icon */}
                        <td className="py-3 px-5">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold font-mono text-[11px] ${
                              user.status === 'Inativo' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {user.fullName.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-slate-900 font-bold block">{user.fullName}</div>
                              {user.id === currentUser.id && (
                                <span className="inline-block mt-0.5 text-[9px] font-bold text-indigo-600 font-mono uppercase bg-indigo-50 border border-indigo-100 px-1 rounded">Seu Perfil Ativo</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Username */}
                        <td className="py-3 px-5 font-mono text-slate-600 font-bold">
                          @{user.username}
                        </td>

                        {/* Role label badge */}
                        <td className="py-3 px-5">
                          <span className={`inline-block border rounded-full px-2 py-0.5 font-bold text-[10px] ${profile.color}`}>
                            {profile.label}
                          </span>
                        </td>

                        {/* User Status Switch */}
                        <td className="py-3 px-5">
                          <button
                            onClick={() => toggleUserStatus(user)}
                            disabled={user.id === currentUser.id}
                            className={`inline-flex items-center gap-1 border px-2 py-0.5 rounded-full font-bold text-[10px] cursor-pointer focus:outline-hidden disabled:opacity-50 disabled:cursor-not-allowed ${
                              user.status === 'Ativo'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                            }`}
                            title={user.id === currentUser.id ? 'Não é possível inativar seu próprio login.' : 'Clique para chavear status'}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'Ativo' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            {user.status}
                          </button>
                        </td>

                        {/* Created At Date info */}
                        <td className="py-3 px-5 text-slate-400 font-mono text-[10px] font-semibold">
                          {new Date(user.createdAt).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </td>

                        {/* Action controls */}
                        <td className="py-3 px-5 text-right space-x-1">
                          {/* Sync Password button */}
                          <button
                            onClick={() => {
                              setPasswordTargetUser(user);
                              setNewSecretPassword('');
                              setPassError('');
                              setShowPasswordModal(true);
                            }}
                            className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg cursor-pointer transition-colors inline-flex"
                            title="Redefinir senha de acesso corporativa"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>
                          
                          {/* Edit basic profile */}
                          <button
                            onClick={() => {
                              setEditingUser({ ...user });
                              setEditError('');
                              setShowEditModal(true);
                            }}
                            className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 rounded-lg cursor-pointer transition-colors inline-flex"
                            title="Editar nome ou cargo"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete account */}
                          <button
                            onClick={() => handleDeleteClick(user)}
                            disabled={user.id === currentUser.id}
                            className={`p-1.5 rounded-lg cursor-pointer transition-all inline-flex disabled:opacity-20 disabled:pointer-events-none ${
                              confirmDeleteId === user.id
                                ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse scale-105'
                                : 'hover:bg-slate-100 text-slate-300 hover:text-red-600'
                            }`}
                            title={confirmDeleteId === user.id ? "Clique de novo para CONFIRMAR a exclusão" : "Apagar permanentemente"}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* User Create Modal */}
          {showAddModal && (
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl max-w-md w-full border border-slate-150 shadow-2xl overflow-hidden font-sans">
                <div className="bg-slate-900 p-4 flex justify-between items-center text-white">
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-indigo-400" />
                    <span className="font-bold text-xs uppercase tracking-wider font-mono">Cadastrar Colaborador</span>
                  </div>
                  <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white cursor-pointer p-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                  {addError && (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex gap-2.5 items-start text-xs text-rose-900">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <p className="font-bold">{addError}</p>
                    </div>
                  )}

                  {/* Nome Completo */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Nome Completo:</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: João da Silva"
                      value={newFullName}
                      onChange={(e) => setNewFullName(e.target.value)}
                      className="w-full text-xs text-slate-800 bg-white border border-slate-300 rounded-xl p-2.5 outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-xs font-semibold"
                    />
                  </div>

                  {/* Nome de Usuário */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Nome de Usuário (Username):</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: joaosilva (apenas letras)"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                      className="w-full text-xs text-slate-800 bg-white border border-slate-300 rounded-xl p-2.5 outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-xs font-mono font-bold text-indigo-650"
                    />
                  </div>

                  {/* Senha Corrente */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Senha Inicial:</label>
                    <input
                      type="password"
                      required
                      placeholder="Min. 3 caracteres"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full text-xs text-slate-800 bg-white border border-slate-300 rounded-xl p-2.5 outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-xs"
                    />
                  </div>

                  {/* Perfil Selection */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Perfil de Acesso do Usuário (RBAC):</label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as UserRole)}
                      className="w-full text-xs text-slate-800 bg-white border border-slate-300 rounded-xl p-2.5 outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-xs font-bold"
                    >
                      <option value="Transporte">Transporte (Módulo: Programação de Carga)</option>
                      <option value="Checkout">Checkout (Módulo: Montagem de Paletes)</option>
                      <option value="Expedição">Expedição (Módulo: Conferência de Carga)</option>
                      <option value="Gestor">Gestor do Sistema (Acesso Total)</option>
                    </select>
                  </div>

                  {/* Status Selection */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Status de Cadastro:</label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as any)}
                      className="w-full text-xs text-slate-800 bg-white border border-slate-300 rounded-xl p-2.5 outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-xs font-bold"
                    >
                      <option value="Ativo">Ativo (Permitir acesso completo)</option>
                      <option value="Inativo">Inativo (Bloquear logins imediatamente)</option>
                    </select>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2 border border-slate-300 rounded-xl text-slate-500 hover:bg-slate-100 font-bold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl transition-colors shadow-sm"
                    >
                      Confirmar Criação
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* User Edit Modal */}
          {showEditModal && editingUser && (
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl max-w-md w-full border border-slate-150 shadow-2xl overflow-hidden font-sans">
                <div className="bg-slate-900 p-4 flex justify-between items-center text-white">
                  <div className="flex items-center gap-2">
                    <Edit className="w-5 h-5 text-indigo-400" />
                    <span className="font-bold text-xs uppercase tracking-wider font-mono">Editar Cadastro SGE</span>
                  </div>
                  <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-white cursor-pointer p-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
                  {editError && (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex gap-2.5 items-start text-xs text-rose-900">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <p className="font-bold">{editError}</p>
                    </div>
                  )}

                  {/* Nome Completo */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Nome Completo:</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: João da Silva"
                      value={editingUser.fullName}
                      onChange={(e) => setEditingUser({ ...editingUser, fullName: e.target.value })}
                      className="w-full text-xs text-slate-800 bg-white border border-slate-300 rounded-xl p-2.5 outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-xs font-semibold"
                    />
                  </div>

                  {/* Nome de Usuário */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Nome de Usuário:</label>
                    <input
                      type="text"
                      required
                      placeholder="joaosilva"
                      value={editingUser.username}
                      onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value.replace(/[^a-zA-Z0-9]/g, '') })}
                      className="w-full text-xs text-slate-800 bg-white border border-slate-300 rounded-xl p-2.5 outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-xs font-mono font-bold text-indigo-650"
                    />
                  </div>

                  {/* Perfil Selection */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Perfil de Acesso (RBAC):</label>
                    <select
                      value={editingUser.role}
                      onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                      disabled={editingUser.id === currentUser.id}
                      className="w-full text-xs text-slate-800 bg-white border border-slate-300 rounded-xl p-2.5 outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-xs font-bold"
                    >
                      <option value="Transporte">Transporte (Módulo: Programação de Carga)</option>
                      <option value="Checkout">Checkout (Módulo: Montagem de Paletes)</option>
                      <option value="Expedição">Expedição (Módulo: Conferência de Carga)</option>
                      <option value="Gestor">Gestor do Sistema (Acesso Total)</option>
                    </select>
                    {editingUser.id === currentUser.id && (
                      <p className="text-[10px] text-slate-400 font-mono italic mt-0.5">Você não pode rebaixar seu próprio perfil de Gestor ativo.</p>
                    )}
                  </div>

                  {/* Status Selection */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Status Coorporativo:</label>
                    <select
                      value={editingUser.status}
                      onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value as any })}
                      disabled={editingUser.id === currentUser.id}
                      className="w-full text-xs text-slate-800 bg-white border border-slate-300 rounded-xl p-2.5 outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-xs font-bold"
                    >
                      <option value="Ativo">Ativo (Acesso autorizado)</option>
                      <option value="Inativo">Inativo (Bloqueado temporariamente)</option>
                    </select>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setEditingUser(null)}
                      className="px-4 py-2 border border-slate-300 rounded-xl text-slate-500 hover:bg-slate-100 font-bold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl transition-colors shadow-sm"
                    >
                      Salvar Alterações
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* User Reset Password Modal */}
          {showPasswordModal && passwordTargetUser && (
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl max-w-md w-full border border-slate-150 shadow-2xl overflow-hidden font-sans">
                <div className="bg-slate-900 p-4 flex justify-between items-center text-white">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-indigo-400" />
                    <span className="font-bold text-xs uppercase tracking-wider font-mono">Redefinir Senha do Usuário</span>
                  </div>
                  <button onClick={() => setPasswordTargetUser(null)} className="text-slate-400 hover:text-white cursor-pointer p-1 font-bold">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handlePasswordResetSubmit} className="p-6 space-y-4">
                  {passError && (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex gap-2.5 items-start text-xs text-rose-900">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <p className="font-bold">{passError}</p>
                    </div>
                  )}

                  <div className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-150 p-4 rounded-xl space-y-1.5 font-sans leading-snug">
                    <p className="text-xs font-bold text-slate-800">
                      Você está redefinindo a senha do colaborador:
                    </p>
                    <p className="text-sm font-black text-indigo-850">
                      {passwordTargetUser.fullName} (@{passwordTargetUser.username})
                    </p>
                    <p className="text-[10px] text-indigo-700 font-medium">
                      Esta ação gera um log de auditoria permanente assinado digitalmente com seu nome de gestor (@{currentUser.username}).
                    </p>
                  </div>

                  {/* Nova Senha */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Nova Senha de Acesso:</label>
                    <input
                      type="password"
                      required
                      placeholder="Mínimo 3 caracteres"
                      value={newSecretPassword}
                      onChange={(e) => setNewSecretPassword(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-300 rounded-xl p-2.5 outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-xs font-extrabold tracking-widest text-slate-800"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setPasswordTargetUser(null)}
                      className="px-4 py-2 border border-slate-300 rounded-xl text-slate-500 hover:bg-slate-100 font-bold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl transition-colors shadow-sm"
                    >
                      Confirmar Nova Senha
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      );
    } else {
      // RENDERS AUDIT LOOGS VIEW PANEL
      return (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden font-sans">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight font-mono">logs de conexões e segurança</h3>
              <p className="text-[11px] text-slate-400">Listagem histórica em ordem cronológica de eventos audorizados pela equipe técnica.</p>
            </div>
            <span className="text-[10px] font-semibold text-slate-400 font-mono bg-slate-100 px-2 py-1 rounded">
              {logs.length} EVENTOS REGISTRADOS
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto selection:bg-indigo-100">
            {logs.length === 0 ? (
              <div className="py-16 text-center text-slate-400 font-medium">
                Nenhum log de auditoria emitido ainda. Os eventos de autenticação e redefinição aparecem nesta tela automaticamente.
              </div>
            ) : (
              // Order logs in reverse chronological order
              [...logs].reverse().map((log) => (
                <div key={log.id} className="p-4 flex gap-4 hover:bg-slate-50/50 transition-colors">
                  {/* Action Label Icon */}
                  <div className="shrink-0 mt-0.5">
                    <span className={`inline-block border text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-full font-black ${getLogBadge(log.action)}`}>
                      {log.action}
                    </span>
                  </div>

                  {/* Main Details content */}
                  <div className="flex-1 space-y-1">
                    <p className="text-slate-850 font-bold text-xs select-text">
                      {log.details}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold font-mono">
                      <span>Operador:</span>
                      <strong className="text-slate-600">@{log.actorName}</strong>
                      <span>•</span>
                      <span>Horário:</span>
                      <span>
                        {new Date(log.timestamp).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      );
    }
  }
}
