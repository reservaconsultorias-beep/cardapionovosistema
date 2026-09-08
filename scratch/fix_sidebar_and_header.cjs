const fs = require('fs');

let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');
const isCRLF = content.includes('\r\n');

// Find Sistema section in sidebar
const sIdx = content.indexOf('uppercase tracking-wider mb-1">Sistema</p>');
const eIdx = content.indexOf('{activeTab === "usuarios" && hasPermission(\'gerenciar_usuarios\') && (');

console.log('sIdx:', sIdx, 'eIdx:', eIdx);

if (sIdx !== -1 && eIdx !== -1) {
  const replacement = `uppercase tracking-wider mb-1">Sistema</p>
              {hasPermission('gerenciar_configuracoes') && (
                <button 
                  onClick={() => setActiveTab("configuracoes")} 
                  className={\`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold transition-colors cursor-pointer \${activeTab === 'configuracoes' ? 'bg-[#fdde58] text-stone-950 font-bold shadow-xs border border-[#d8ba39]' : 'text-stone-400 hover:text-white hover:bg-stone-900'}\`}
                >
                  <Settings size={16} className={activeTab === 'configuracoes' ? 'text-stone-950' : 'text-stone-500'} />
                  Configurações
                </button>
              )}
              {hasPermission('gerenciar_usuarios') && (
                <button 
                  onClick={() => setActiveTab("usuarios")} 
                  className={\`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold transition-colors cursor-pointer \${activeTab === 'usuarios' ? 'bg-[#fdde58] text-stone-950 font-bold shadow-xs border border-[#d8ba39]' : 'text-stone-400 hover:text-white hover:bg-stone-900'}\`}
                >
                  <Shield size={16} className={activeTab === 'usuarios' ? 'text-stone-950' : 'text-stone-500'} />
                  Usuários & Acesso
                </button>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 p-4 md:p-8 h-screen overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Header Section */}
          <div className={\`flex flex-col md:flex-row md:items-center justify-between gap-2.5 pb-2.5 \${['despesas', 'relatorios', 'caixa', 'funil'].includes(activeTab) ? 'border-b border-transparent mb-0' : 'border-b border-stone-200/80 mb-4'}\`}>
            {!['despesas', 'relatorios', 'caixa', 'funil'].includes(activeTab) ? (
              <div>
                <h1 className="text-xl font-bold tracking-tight text-stone-900">
                  {PAGE_TITLES[activeTab]?.title || 'Painel'}
                </h1>
                <p className="text-xs text-stone-500 font-mono mt-0.5">
                  {PAGE_TITLES[activeTab]?.subtitle || ''}
                </p>
              </div>
            ) : <div />}
            <div className="flex items-center gap-2 self-end md:self-auto">
              {adminLogoUrl && (
                <>
                  <img src={adminLogoUrl} alt="Logo do restaurante" className="h-7 object-contain" />
                  <div className="w-px h-5 bg-stone-200" />
                </>
              )}
              <button 
                onClick={handleLogout} 
                className="h-8 px-2.5 rounded-lg border border-stone-200 bg-white text-stone-600 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors cursor-pointer text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
                title="Sair do Sistema"
              >
                <LogOut size={13} />
                <span className="hidden sm:inline text-[11px]">Sair</span>
              </button>
            </div>
          </div>

        {autoPrint && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-4 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-1">Impressão Automática Ativada!</p>
              <p>O sistema verificará novos pedidos a cada 15 segundos e enviará para a impressora. Para que a impressão ocorra de forma invisível (sem abrir janela de confirmação), inicie o Google Chrome com o atalho <b>--kiosk-printing</b> apontando para a sua impressora padrão (térmica 80mm).</p>
            </div>
          </div>
        )}

        `;

  const finalReplacement = isCRLF ? replacement.replace(/\n/g, '\r\n') : replacement;
  content = content.substring(0, sIdx) + finalReplacement + content.substring(eIdx);
  fs.writeFileSync('src/pages/AdminDashboard.tsx', content, 'utf8');
  console.log('Replaced successfully!');
}
