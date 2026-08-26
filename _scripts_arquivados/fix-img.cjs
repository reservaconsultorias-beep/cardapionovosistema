const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/components/MenuItemCard.tsx');
let content = fs.readFileSync(file, 'utf8');

// We need to replace the img tag with {hasPhoto && <img ... />}
content = content.replace(
  /<img\s+src=\{currentSrc\}[\s\S]*?\/>/,
  `{hasPhoto && (<img
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
        />)}`
);

fs.writeFileSync(file, content, 'utf8');
console.log("MenuItemCard updated!");
