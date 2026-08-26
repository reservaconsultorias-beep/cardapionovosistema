const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/data/menu.ts');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/'https:\/\/images\.unsplash\.com\/photo-1513104890138-7c749659a591\?q=80&w=500&auto=format&fit=crop'/g, "'/40-iscas-de-carne.png'");
content = content.replace(/'https:\/\/images\.unsplash\.com\/photo-1565299624946-b28f40a0ae38\?q=80&w=500&auto=format&fit=crop'/g, "'/42-estrogonofe-de-carne-inverso.png'");
content = content.replace(/'https:\/\/images\.unsplash\.com\/photo-1574071318508-1cdbab80d002\?q=80&w=500&auto=format&fit=crop'/g, "'/26-margherita.png'");

content = content.replace(/{id: 'b-1',name: 'Coca Cola \(Lata\)',ingredients: 'Refrigerante em lata.',priceSingle: 2\.00,category: 'bebidas', imageUrl: '[^']+'}/g, "{id: 'b-1',name: 'Coca Cola (Lata)',ingredients: 'Refrigerante em lata.',priceSingle: 2.00,category: 'bebidas', imageUrl: '/coca-cola-lata.png'}");
content = content.replace(/{id: 'b-2',name: 'Fanta Laranja \(Lata\)',ingredients: 'Refrigerante em lata.',priceSingle: 2\.00,category: 'bebidas', imageUrl: '[^']+'}/g, "{id: 'b-2',name: 'Fanta Laranja (Lata)',ingredients: 'Refrigerante em lata.',priceSingle: 2.00,category: 'bebidas', imageUrl: '/fanta-laranja.png'}");
content = content.replace(/{id: 'b-3',name: '7up \(Lata\)',ingredients: 'Refrigerante em lata.',priceSingle: 2\.00,category: 'bebidas', imageUrl: '[^']+'}/g, "{id: 'b-3',name: '7up (Lata)',ingredients: 'Refrigerante em lata.',priceSingle: 2.00,category: 'bebidas', imageUrl: '/7up.png'}");
content = content.replace(/{id: 'b-4',name: 'Coca Zero \(Lata\)',ingredients: 'Refrigerante em lata.',priceSingle: 2\.00,category: 'bebidas', imageUrl: '[^']+'}/g, "{id: 'b-4',name: 'Coca Zero (Lata)',ingredients: 'Refrigerante em lata.',priceSingle: 2.00,category: 'bebidas', imageUrl: '/coca-zero-lata.png'}");
content = content.replace(/{id: 'b-5',name: 'Guaraná Antártica \(Lata\)',ingredients: 'Refrigerante em lata.',priceSingle: 2\.00,category: 'bebidas', imageUrl: '[^']+'}/g, "{id: 'b-5',name: 'Guaraná Antártica (Lata)',ingredients: 'Refrigerante em lata.',priceSingle: 2.00,category: 'bebidas', imageUrl: '/guarana.png'}");
content = content.replace(/{id: 'b-6',name: 'Sumol Laranja \(Lata\)',ingredients: 'Refrigerante em lata.',priceSingle: 2\.00,category: 'bebidas', imageUrl: '[^']+'}/g, "{id: 'b-6',name: 'Sumol Laranja (Lata)',ingredients: 'Refrigerante em lata.',priceSingle: 2.00,category: 'bebidas', imageUrl: '/sumol-laranja.png'}");
content = content.replace(/{id: 'b-7',name: 'Ice Tea Pêssego \(Lata\)',ingredients: 'Ice tea em lata.',priceSingle: 2\.00,category: 'bebidas', imageUrl: '[^']+'}/g, "{id: 'b-7',name: 'Ice Tea Pêssego (Lata)',ingredients: 'Ice tea em lata.',priceSingle: 2.00,category: 'bebidas', imageUrl: '/ice-pessego.png'}");
content = content.replace(/{id: 'b-8',name: 'Água',ingredients: 'Água mineral.',priceSingle: 1\.50,category: 'bebidas', imageUrl: '[^']+'}/g, "{id: 'b-8',name: 'Água',ingredients: 'Água mineral.',priceSingle: 1.50,category: 'bebidas', imageUrl: '/agua.png'}");
content = content.replace(/{id: 'b-9',name: 'Coca-Cola \(Garrafa 1 litro\) Normal e Zero',ingredients: 'Refrigerante em garrafa.',priceSingle: 3\.00,category: 'bebidas', imageUrl: '[^']+'}/g, "{id: 'b-9',name: 'Coca-Cola (Garrafa 1 litro) Normal e Zero',ingredients: 'Refrigerante em garrafa.',priceSingle: 3.00,category: 'bebidas', imageUrl: '/coca-zero-garrafa.png'}");
content = content.replace(/{id: 'b-10',name: 'Cerveja Sagres',ingredients: 'Cerveja.',priceSingle: 3\.00,category: 'bebidas', imageUrl: '[^']+'}/g, "{id: 'b-10',name: 'Cerveja Sagres',ingredients: 'Cerveja.',priceSingle: 3.00,category: 'bebidas', imageUrl: '/sagres-cerveja.png'}");
content = content.replace(/{id: 'b-11',name: 'Cerveja Heineken',ingredients: 'Cerveja.',priceSingle: 3\.50,category: 'bebidas', imageUrl: '[^']+'}/g, "{id: 'b-11',name: 'Cerveja Heineken',ingredients: 'Cerveja.',priceSingle: 3.50,category: 'bebidas', imageUrl: '/haineken.png'}");

fs.writeFileSync(file, content, 'utf8');
console.log("Updated Unsplash images back to local!");
