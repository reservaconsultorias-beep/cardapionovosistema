const fs = require('fs');
const file = '/app/applet/src/components/PizzaModal.tsx';
let content = fs.readFileSync(file, 'utf8');

// add state
content = content.replace(
  "const [notes, setNotes] = useState('');",
  "const [notes, setNotes] = useState('');\n  const [selectedVariant, setSelectedVariant] = useState('Normal');"
);

// reset in useEffect
content = content.replace(
  "setNotes('');",
  "setNotes('');\n       setSelectedVariant('Normal');"
);

// update handleAddToCart
content = content.replace(
  "menuItem: item,",
  "menuItem: item.id === 'b-9' ? { ...item, name: `Coca-Cola 1L (${selectedVariant})` } : item,"
);

fs.writeFileSync(file, content, 'utf8');
console.log("Patched PizzaModal states.");
