const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/components/MenuItemCard.tsx');
let content = fs.readFileSync(file, 'utf8');

const target = `{hasPhoto && (<img
          src={currentSrc}
          alt={item.name}
          className="absolute inset-0 w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
          onError={() => {
            if (imgAttempt < exts.length) {
              setImgAttempt(prev => prev + 1);
            } else {
              onImageError();
            }
          }}
        />)}`;

const replacement = `{hasPhoto && catId === 'menu-do-dia' ? (
          <div className="absolute inset-0 flex flex-row">
            <div className="flex-1 h-full relative group/img1 border-r border-[#8b0000]">
              <img
                src={currentSrc}
                alt={item.name + " - Pizza"}
                className="w-full h-full object-cover object-top group-hover/img1:scale-105 transition-transform duration-700"
                onError={() => {
                  if (imgAttempt < exts.length) {
                    setImgAttempt(prev => prev + 1);
                  } else {
                    onImageError();
                  }
                }}
              />
              <div className="absolute bottom-4 left-0 right-0 flex justify-center z-10"><span className="bg-black/80 text-white text-xs font-bold px-3 py-1 rounded-full">PIZZA</span></div>
            </div>
            <div className="flex-1 h-full relative group/img2">
              <img
                src={(item as any).imageUrl2 ? ((item as any).imageUrl2.startsWith('http') ? (item as any).imageUrl2 : ((item as any).imageUrl2.startsWith('/') ? (item as any).imageUrl2 : '/' + (item as any).imageUrl2)) : "/placeholder.webp"}
                alt={item.name + " - Esfirra"}
                className="w-full h-full object-cover object-top group-hover/img2:scale-105 transition-transform duration-700"
              />
              <div className="absolute bottom-4 left-0 right-0 flex justify-center z-10"><span className="bg-[#8b0000]/90 text-white text-xs font-bold px-3 py-1 rounded-full">ESFIRRA</span></div>
            </div>
          </div>
        ) : hasPhoto && (
          <img
            src={currentSrc}
            alt={item.name}
            className="absolute inset-0 w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
            onError={() => {
              if (imgAttempt < exts.length) {
                setImgAttempt(prev => prev + 1);
              } else {
                onImageError();
              }
            }}
          />
        )}`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content, 'utf8');
console.log("MenuItemCard updated!");
