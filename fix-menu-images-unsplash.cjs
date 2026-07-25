const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/data/menu.ts');
let content = fs.readFileSync(file, 'utf8');

// Replace 40, 42, 26
content = content.replace(/'\/40-iscas-de-carne\.png'/g, "'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=500&auto=format&fit=crop'");
content = content.replace(/'\/42-estrogonofe-de-carne-inverso\.png'/g, "'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=500&auto=format&fit=crop'");
content = content.replace(/'\/26-margherita\.png'/g, "'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?q=80&w=500&auto=format&fit=crop'");

// Replace bebidas
content = content.replace(/'\/coca-cola-lata\.png'/g, "'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?q=80&w=500&auto=format&fit=crop'");
content = content.replace(/'\/fanta-laranja\.png'/g, "'https://images.unsplash.com/photo-1624517452488-04869289c4ca?q=80&w=500&auto=format&fit=crop'");
content = content.replace(/'\/7up\.png'/g, "'https://images.unsplash.com/photo-1625938146369-adc83368bda7?q=80&w=500&auto=format&fit=crop'");
content = content.replace(/'\/coca-zero-lata\.png'/g, "'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?q=80&w=500&auto=format&fit=crop'");
content = content.replace(/'\/guarana\.png'/g, "'https://images.unsplash.com/photo-1625938144755-652e08e359b7?q=80&w=500&auto=format&fit=crop'"); // generic soda
content = content.replace(/'\/sumol-laranja\.png'/g, "'https://images.unsplash.com/photo-1624517452488-04869289c4ca?q=80&w=500&auto=format&fit=crop'");
content = content.replace(/'\/ice-pessego\.png'/g, "'https://images.unsplash.com/photo-1556679343-c7306c1976bc?q=80&w=500&auto=format&fit=crop'");
content = content.replace(/'\/agua\.png'/g, "'https://images.unsplash.com/photo-1523362628745-0c100150b504?q=80&w=500&auto=format&fit=crop'");
content = content.replace(/'\/coca-zero-garrafa\.png'/g, "'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?q=80&w=500&auto=format&fit=crop'");
content = content.replace(/'\/sagres-cerveja\.png'/g, "'https://images.unsplash.com/photo-1608270586620-248524c67de9?q=80&w=500&auto=format&fit=crop'");
content = content.replace(/'\/haineken\.png'/g, "'https://images.unsplash.com/photo-1614316315570-5b65103c2a07?q=80&w=500&auto=format&fit=crop'");

fs.writeFileSync(file, content, 'utf8');
console.log("Updated Unsplash images!");
