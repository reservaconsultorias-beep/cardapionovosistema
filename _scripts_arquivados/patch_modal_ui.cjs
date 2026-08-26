const fs = require('fs');
const file = '/app/applet/src/components/PizzaModal.tsx';
let content = fs.readFileSync(file, 'utf8');

const variantUI = `           {item.id === 'b-9' && (
             <div className="mb-6">
                <h4 className="font-bold mb-3 text-sm uppercase tracking-wide text-gray-800">Escolha a Versão:</h4>
                <div className="flex flex-col gap-3">
                   <button
                     onClick={() => setSelectedVariant('Normal')}
                     className={\`p-3 rounded-xl border-2 text-left transition-all \${selectedVariant === 'Normal' ? 'border-[#8b0000] bg-[#8b0000]/5' : 'border-gray-200 hover:border-gray-300 bg-white'}\`}
                   >
                      <div className="flex justify-between items-center">
                         <span className="font-bold text-sm">Normal</span>
                         <div className={\`w-4 h-4 rounded-full border flex items-center justify-center \${selectedVariant === 'Normal' ? 'border-[#8b0000] bg-[#8b0000]' : 'border-gray-300'}\`}>
                            {selectedVariant === 'Normal' && <Check className="w-3 h-3 text-white" />}
                         </div>
                      </div>
                   </button>
                   <button
                     onClick={() => setSelectedVariant('Zero')}
                     className={\`p-3 rounded-xl border-2 text-left transition-all \${selectedVariant === 'Zero' ? 'border-[#8b0000] bg-[#8b0000]/5' : 'border-gray-200 hover:border-gray-300 bg-white'}\`}
                   >
                      <div className="flex justify-between items-center">
                         <span className="font-bold text-sm">Zero</span>
                         <div className={\`w-4 h-4 rounded-full border flex items-center justify-center \${selectedVariant === 'Zero' ? 'border-[#8b0000] bg-[#8b0000]' : 'border-gray-300'}\`}>
                            {selectedVariant === 'Zero' && <Check className="w-3 h-3 text-white" />}
                         </div>
                      </div>
                   </button>
                </div>
             </div>
           )}
`;

content = content.replace(
  '<p className="text-gray-500 text-sm mb-6 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">{item.ingredients}</p>',
  '<p className="text-gray-500 text-sm mb-6 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">{item.ingredients}</p>\n' + variantUI
);

fs.writeFileSync(file, content, 'utf8');
console.log("Patched PizzaModal UI.");
