import React, { useState } from 'react';
import { Shield, KeyRound, User as UserIcon, AlertCircle, Eye, EyeOff, Check, Boxes } from 'lucide-react';
import { User } from '../types';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
  users: User[];
}

export default function Login({ onLoginSuccess, users }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fallbackUsers: User[] = [
    { id: 'usr-gestor', fullName: 'Gestor do Sistema', username: 'gestor', password: '123', role: 'Gestor', status: 'Ativo', createdAt: new Date().toISOString() },
    { id: 'usr-transp', fullName: 'Operador de Transporte', username: 'transporte', password: '123', role: 'Transporte', status: 'Ativo', createdAt: new Date().toISOString() },
    { id: 'usr-check', fullName: 'Conferente de Checkout', username: 'checkout', password: '123', role: 'Checkout', status: 'Ativo', createdAt: new Date().toISOString() },
    { id: 'usr-exped', fullName: 'Operador de Expedição', username: 'expedicao', password: '123', role: 'Expedição', status: 'Ativo', createdAt: new Date().toISOString() },
  ];

  const activeUsers = users && users.length > 0 ? users : fallbackUsers;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Por favor, informe o nome de usuário e a senha.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    // Small delay to simulate verification and look premium
    setTimeout(() => {
      const foundUser = activeUsers.find(
        (u) => u.username.toLowerCase() === username.trim().toLowerCase()
      );

      if (!foundUser) {
        setError('Usuário não localizado no sistema de expedição.');
        setIsSubmitting(false);
        return;
      }

      if (foundUser.password !== password) {
        setError('Credenciais inválidas. Verifique a senha e tente novamente.');
        setIsSubmitting(false);
        return;
      }

      if (foundUser.status === 'Inativo') {
        setError('Este usuário está bloqueado/inativo no sistema. Procure o Gestor do Sistema.');
        setIsSubmitting(false);
        return;
      }

      // Successful login
      onLoginSuccess(foundUser);
      setIsSubmitting(false);
    }, 400);
  };

  const handleQuickLogin = (quickUser: string) => {
    setUsername(quickUser);
    setPassword('123');
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      
      {/* Decorative colored ambient blobs */}
      <div className="absolute top-1/4 left-1/4 -translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-y-1/2 translate-x-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full relative z-10 space-y-6">
        
        {/* Logo & Headline */}
        <div className="text-center space-y-4">
          <div className="mx-auto bg-white text-slate-900 w-24 h-24 rounded-3xl flex items-center justify-center shadow-xl shadow-blue-500/5 border border-slate-200/80">
            <Boxes className="w-12 h-12 text-slate-800" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2">
              Genomma Lab. 
              <span className="bg-blue-500/20 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                SGE
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-mono">Sistema de Gestão de Embarques • Controle de Acesso (RBAC)</p>
          </div>
        </div>

        {/* Login Box */}
        <div className="bg-slate-800/90 border border-slate-700/50 rounded-2xl p-6 shadow-2xl backdrop-blur-md space-y-6">
          <div className="border-b border-slate-700/50 pb-4">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono">Identificação Funcional</h2>
            <p className="text-xs text-slate-400">Entre com suas credenciais registradas para acessar o painel administrativo.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex gap-2.5 items-start text-red-200 text-xs">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed font-semibold">{error}</p>
              </div>
            )}

            {/* Input Username */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">Nome de Usuário</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="Ex: gestor"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full text-xs text-white bg-slate-900 border border-slate-700 rounded-xl py-3 pl-10 pr-4 outline-none placeholder-slate-500 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Input Password */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">Senha de Acesso</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Min. 3 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs text-white bg-slate-900 border border-slate-700 rounded-xl py-3 pl-10 pr-10 outline-none placeholder-slate-500 focus:border-blue-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-3.5 rounded-xl transition-all shadow-md active:scale-98 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSubmitting ? 'Verificando Permissões...' : 'Acessar Workspace Seguro'}
            </button>
          </form>

          {/* Quick-select profiles list helper - only shown for Gestor profiles */}
          {(username.trim().toLowerCase() === 'gestor' || activeUsers.some(u => u.username.toLowerCase() === username.trim().toLowerCase() && u.role === 'Gestor')) && (
            <div className="border-t border-slate-700/50 pt-4 space-y-3">
              <div className="flex items-center justify-between font-mono">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Controle de Testes Rápido:</span>
                <span className="text-[9px] bg-slate-750 text-slate-300 px-1.5 py-0.5 rounded font-semibold border border-slate-700">Senha comum: 123</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('gestor')}
                  className={`py-1.5 px-2 bg-slate-900 hover:bg-slate-750 border rounded-lg text-left truncate flex items-center justify-between text-slate-300 cursor-pointer transition-colors ${
                    username === 'gestor' ? 'border-indigo-500 bg-slate-800' : 'border-slate-700'
                  }`}
                >
                  <span>👑 Gestor</span>
                  {username === 'gestor' && <Check className="w-3.5 h-3.5 text-indigo-500" />}
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('transporte')}
                  className={`py-1.5 px-2 bg-slate-900 hover:bg-slate-750 border rounded-lg text-left truncate flex items-center justify-between text-slate-300 cursor-pointer transition-colors ${
                    username === 'transporte' ? 'border-blue-500 bg-slate-800' : 'border-slate-700'
                  }`}
                >
                  <span>📦 Transporte</span>
                  {username === 'transporte' && <Check className="w-3.5 h-3.5 text-blue-500" />}
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('checkout')}
                  className={`py-1.5 px-2 bg-slate-900 hover:bg-slate-750 border rounded-lg text-left truncate flex items-center justify-between text-slate-300 cursor-pointer transition-colors ${
                    username === 'checkout' ? 'border-blue-500 bg-slate-800' : 'border-slate-700'
                  }`}
                >
                  <span>🏷️ Checkout</span>
                  {username === 'checkout' && <Check className="w-3.5 h-3.5 text-blue-500" />}
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('expedicao')}
                  className={`py-1.5 px-2 bg-slate-900 hover:bg-slate-750 border rounded-lg text-left truncate flex items-center justify-between text-slate-300 cursor-pointer transition-colors ${
                    username === 'expedicao' ? 'border-blue-500 bg-slate-800' : 'border-slate-700'
                  }`}
                >
                  <span>🚚 Expedição</span>
                  {username === 'expedicao' && <Check className="w-3.5 h-3.5 text-blue-500" />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Safety Disclaimer */}
        <p className="text-center text-[10px] text-slate-500 leading-relaxed font-mono">
          Acesso restrito de alta fidabilidade. Todos os acessos e modificações de estado de carga são gravados em logs de auditoria não-voláteis para a Gerência Logística.
        </p>

      </div>
    </div>
  );
}
