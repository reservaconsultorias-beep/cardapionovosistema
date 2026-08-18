const fs = require('fs');

let code = fs.readFileSync('src/data/menu.ts', 'utf8');

// We want to transform each object in the array to either have imageUrl: '/' + name + '.png',
// EXCEPT if it's an http link (like the unsplash one).

const lines = code.split('\n');
const newLines = lines.map(line => {
    if (line.includes('{id:')) {
        // extract name
        const nameMatch = line.match(/name:\s*'([^']+)'/);
        if (nameMatch) {
            const name = nameMatch[1];
            
            // if imageUrl is already http, leave it? 
            // The user said "as fotos estão no padrao numero do item + nome do item"
            // So we should just forcefully set imageUrl to `/${name}.png` (or .jpg)
            // Wait, we can just replace any existing imageUrl or append it.
            
            // Remove existing imageUrl: '...', or imageUrl: "..."
            let newLine = line.replace(/,\s*imageUrl:\s*['"][^'"]*['"]/g, '');
            // Remove trailing imageUrl: ''
            newLine = newLine.replace(/,\s*imageUrl:\s*''/g, '');
            
            // Insert the new imageUrl before the closing }
            // only if it's an esfiha, pizza, or bebida that we want. Actually let's do it for all.
            newLine = newLine.replace(/}(?!.*})/, `, imageUrl: '/${name}.png'}`);
            return newLine;
        }
    }
    return line;
});

fs.writeFileSync('src/data/menu.ts', newLines.join('\n'));
console.log("Updated menu.ts");
