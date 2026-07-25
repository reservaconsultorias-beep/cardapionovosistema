const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/components/MenuDoDiaModal.tsx');
let content = fs.readFileSync(file, 'utf8');

const target = `<div className="w-full aspect-[4/5] max-w-[320px] mx-auto mb-4 rounded-xl shadow-sm border border-gray-100 overflow-hidden bg-gray-100">
                        <img src={item.imageUrl ? (item.imageUrl.startsWith('http') ? item.imageUrl : (item.imageUrl.startsWith('/') ? item.imageUrl : '/' + item.imageUrl)) : "/menudia3.webp"} alt={item.name} className="w-full h-full object-cover object-top" />
                      </div>`;

const replacement = `<div className="w-full flex gap-3 mb-4">
                        <div className="flex-1 aspect-[4/5] rounded-xl shadow-sm border border-gray-100 overflow-hidden bg-gray-100 relative group">
                          <img src={item.imageUrl ? (item.imageUrl.startsWith('http') ? item.imageUrl : (item.imageUrl.startsWith('/') ? item.imageUrl : '/' + item.imageUrl)) : "/menudia3.webp"} alt={\`\${item.name} - Pizza\`} className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500" />
                          <div className="absolute bottom-2 left-0 right-0 flex justify-center"><span className="bg-black/70 backdrop-blur-sm text-white text-[10px] font-bold px-3 py-1 rounded-full tracking-wider">PIZZA</span></div>
                        </div>
                        <div className="flex-1 aspect-[4/5] rounded-xl shadow-sm border border-gray-100 overflow-hidden bg-gray-100 relative group">
                          <img src={(item as any).imageUrl2 ? ((item as any).imageUrl2.startsWith('http') ? (item as any).imageUrl2 : ((item as any).imageUrl2.startsWith('/') ? (item as any).imageUrl2 : '/' + (item as any).imageUrl2)) : "/placeholder.webp"} alt={\`\${item.name} - Esfirra\`} className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500" />
                          <div className="absolute bottom-2 left-0 right-0 flex justify-center"><span className="bg-[#8b0000]/90 backdrop-blur-sm text-white text-[10px] font-bold px-3 py-1 rounded-full tracking-wider">ESFIRRA</span></div>
                        </div>
                      </div>`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content, 'utf8');
console.log("Updated!");
