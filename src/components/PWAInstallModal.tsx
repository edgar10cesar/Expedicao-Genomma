import React, { useState, useEffect } from 'react';
import { X, Download, Monitor, Smartphone, Check, ArrowUpRight, Share, PlusSquare } from 'lucide-react';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PWAInstallModal({ isOpen, onClose }: PWAInstallModalProps) {
  const [activeTab, setActiveTab] = useState<'pc' | 'android' | 'ios'>('pc');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Capture the deferred prompt event if stored globally
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Check if window.deferredPrompt already exists
    if ((window as any).deferredPrompt) {
      setDeferredPrompt((window as any).deferredPrompt);
    }

    // Detect if app is already running in standalone mode (installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isStandalone) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  if (!isOpen) return null;

  const handleNativeInstall = async () => {
    const promptEvent = deferredPrompt || (window as any).deferredPrompt;
    if (!promptEvent) {
      alert('A instalação direta não está disponível no momento. Siga as instruções passo a passo abaixo para o seu dispositivo!');
      return;
    }
    
    // Show the install prompt
    promptEvent.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await promptEvent.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    
    // Clear the deferred prompt variable
    setDeferredPrompt(null);
    (window as any).deferredPrompt = null;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
      <div 
        className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white p-6 relative">
          <button 
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="bg-white/15 p-2.5 rounded-2xl">
              <Download className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight">Baixar Aplicativo SGE</h2>
              <p className="text-xs text-white/80 mt-0.5">Instale a Expedição Genomma no seu computador ou celular</p>
            </div>
          </div>
        </div>

        {/* Content Tabs Header */}
        <div className="flex border-b border-slate-100 bg-slate-50/50 p-2 gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('pc')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'pc'
                ? 'bg-white text-blue-600 shadow-sm border border-slate-100'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
            }`}
          >
            <Monitor className="w-4 h-4" />
            <span>Computador</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('android')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'android'
                ? 'bg-white text-blue-600 shadow-sm border border-slate-100'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Android</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ios')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'ios'
                ? 'bg-white text-blue-600 shadow-sm border border-slate-100'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
            }`}
          >
            <span className="text-[14px]"></span>
            <span>iPhone / iOS</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {isInstalled ? (
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 text-center space-y-3">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Aplicativo Instalado!</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Você já está utilizando a versão de aplicativo ou ele já foi instalado no seu dispositivo. Abra-o diretamente na sua tela de início!
              </p>
            </div>
          ) : (
            <>
              {/* Quick Install Action Button if Browser supports native prompt */}
              {(deferredPrompt || (window as any).deferredPrompt) && (activeTab === 'pc' || activeTab === 'android') && (
                <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-left">
                    <h3 className="text-xs font-bold text-slate-800">Instalação Rápida Disponível!</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">Seu navegador permite instalar este portal com 1 clique.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleNativeInstall}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md shadow-blue-500/10 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-4 h-4" />
                    <span>Instalar Agora</span>
                  </button>
                </div>
              )}

              {/* PC / Desktop Instructions */}
              {activeTab === 'pc' && (
                <div className="space-y-4">
                  <h3 className="text-xs font-extrabold text-slate-400 font-mono uppercase tracking-wider">Instruções para Computador (Chrome ou Edge)</h3>
                  
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0">1</div>
                      <p className="text-xs text-slate-600 leading-relaxed pt-0.5">
                        Abra este portal no navegador <strong>Google Chrome</strong> ou <strong>Microsoft Edge</strong> no seu computador.
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0">2</div>
                      <p className="text-xs text-slate-600 leading-relaxed pt-0.5">
                        Olhe para a <strong>barra de endereços</strong> do navegador (no topo, ao lado da estrela de favoritos). Um ícone de monitor com uma seta para baixo <Download className="w-3.5 h-3.5 inline text-blue-500 stroke-[2.5]" /> irá aparecer.
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0">3</div>
                      <p className="text-xs text-slate-600 leading-relaxed pt-0.5">
                        Clique nesse ícone e selecione <strong>"Instalar"</strong>. Um atalho será criado em sua área de trabalho e o sistema abrirá como um aplicativo próprio, sem as barras do navegador!
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-center text-[11px] text-slate-500">
                    💡 <strong>Atalho do Teclado:</strong> No Chrome, você também pode clicar nos 3 pontos verticais no canto superior direito e escolher <strong>"Salvar e compartilhar"</strong> ➜ <strong>"Instalar página como app"</strong>.
                  </div>
                </div>
              )}

              {/* Android Instructions */}
              {activeTab === 'android' && (
                <div className="space-y-4">
                  <h3 className="text-xs font-extrabold text-slate-400 font-mono uppercase tracking-wider">Instruções para Celular Android (Chrome)</h3>
                  
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0">1</div>
                      <p className="text-xs text-slate-600 leading-relaxed pt-0.5">
                        Abra o portal utilizando o navegador <strong>Google Chrome</strong> no seu celular.
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0">2</div>
                      <p className="text-xs text-slate-600 leading-relaxed pt-0.5">
                        Toque nos <strong>três pontos verticais</strong> localizados no canto superior direito do navegador.
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0">3</div>
                      <p className="text-xs text-slate-600 leading-relaxed pt-0.5">
                        Toque na opção <strong>"Adicionar à tela inicial"</strong> ou <strong>"Instalar aplicativo"</strong>.
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0">4</div>
                      <p className="text-xs text-slate-600 leading-relaxed pt-0.5">
                        Confirme clicando em <strong>"Adicionar"</strong> ou <strong>"Instalar"</strong>. O ícone de atalho aparecerá no seu menu de aplicativos do celular!
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* iOS / iPhone Instructions */}
              {activeTab === 'ios' && (
                <div className="space-y-4">
                  <h3 className="text-xs font-extrabold text-slate-400 font-mono uppercase tracking-wider">Instruções para iPhone ou iPad (Safari)</h3>
                  
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0">1</div>
                      <p className="text-xs text-slate-600 leading-relaxed pt-0.5">
                        Abra o portal obrigatoriamente utilizando o navegador nativo <strong>Safari</strong> do seu iPhone.
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0">2</div>
                      <div className="text-xs text-slate-600 leading-relaxed pt-0.5">
                        Toque no botão de <strong>Compartilhar</strong> na barra inferior do Safari (um quadrado com uma seta para cima <Share className="w-3.5 h-3.5 inline text-blue-500 mx-1" />).
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0">3</div>
                      <div className="text-xs text-slate-600 leading-relaxed pt-0.5">
                        Role o menu de opções para baixo e toque em <strong>Adicionar à Tela de Início</strong> (ícone com o sinal de mais <PlusSquare className="w-3.5 h-3.5 inline text-slate-500 mx-1" />).
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0">4</div>
                      <p className="text-xs text-slate-600 leading-relaxed pt-0.5">
                        Toque em <strong>"Adicionar"</strong> no canto superior direito. Pronto! O app estará na tela de início do seu iPhone.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-100 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-all cursor-pointer"
          >
            Fechar Janela
          </button>
        </div>
      </div>
    </div>
  );
}
