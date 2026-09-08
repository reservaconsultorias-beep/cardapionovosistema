const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');
const startIdx = code.indexOf('<div className="p-3 flex-1 space-y-1 font-sans text-sm overflow-y-auto hide-scrollbar">');
const endIdx = code.indexOf('</aside>', startIdx);
let sidebar = code.substring(startIdx, endIdx);

sidebar = sidebar.replace(/p-3 flex-1 space-y-1 font-sans text-sm/g, 'p-1.5 flex-1 space-y-px font-sans text-[10px]');
sidebar = sidebar.replace(/gap-3 px-3 py-2/g, 'gap-1.5 px-2 py-[3px]');
sidebar = sidebar.replace(/gap-2\.5 px-3 py-2/g, 'gap-1.5 px-2 py-[3px]');
sidebar = sidebar.replace(/size=\{18\}/g, 'size={13}');
sidebar = sidebar.replace(/size=\{16\}/g, 'size={13}');
sidebar = sidebar.replace(/mb-2/g, 'mb-px');
sidebar = sidebar.replace(/mb-1/g, 'mb-px');

const btnIA = `
              {hasPermission('gerenciar_configuracoes') && (
                <button 
                  onClick={() => setActiveTab("agente-ia")} 
                  className={\`w-full flex items-center gap-1.5 px-2 py-[3px] rounded-lg font-semibold transition-colors cursor-pointer \${activeTab === 'agente-ia' ? 'bg-[#fdde58] text-stone-950 font-bold shadow-xs border border-[#d8ba39]' : 'text-stone-400 hover:text-white hover:bg-stone-900'}\`}
                >
                  <BotMessageSquare size={13} className={activeTab === 'agente-ia' ? 'text-stone-950' : 'text-stone-500'} />
                  Agente IA
                </button>
              )}`;
const targetPoint = 'Configurações\n                </button>\n              )}';
sidebar = sidebar.replace(targetPoint, targetPoint + btnIA);

code = code.substring(0, startIdx) + sidebar + code.substring(endIdx);
fs.writeFileSync('src/pages/AdminDashboard.tsx', code);
