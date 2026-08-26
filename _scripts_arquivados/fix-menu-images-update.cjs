const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/data/menu.ts');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /{id: 'p-9',name: '9 - Camorra',ingredients: 'Molho de tomate, mozzarella farta, calabresa defumada, fatias de bacon e catupiry.',priceP: 12.9,priceM: 14.9,priceG: 18.9,category: 'tradicionais'}/g,
  "{id: 'p-9',name: '9 - Camorra',ingredients: 'Molho de tomate, mozzarella farta, calabresa defumada, fatias de bacon e catupiry.',priceP: 12.9,priceM: 14.9,priceG: 18.9,category: 'tradicionais', imageUrl: '/9-camorra.png'}"
);

content = content.replace(
  /{id: 'p-11',name: '11 - Chambacon',ingredients: 'Molho de tomate, mozzarella farta, cogumelos frescos fatiados e pedaços de bacon.',priceP: 12.9,priceM: 14.9,priceG: 18.9,category: 'tradicionais'}/g,
  "{id: 'p-11',name: '11 - Chambacon',ingredients: 'Molho de tomate, mozzarella farta, cogumelos frescos fatiados e pedaços de bacon.',priceP: 12.9,priceM: 14.9,priceG: 18.9,category: 'tradicionais', imageUrl: '/11-chambacon.png'}"
);

content = content.replace(
  /{id: 'p-15',name: '15 - 4 Queijos',ingredients: 'Molho de tomate caseiro, mozzarella farta, parmesão ralado, queijo provolone e catupiry.',priceP: 12.9,priceM: 14.9,priceG: 18.9,category: 'tradicionais'}/g,
  "{id: 'p-15',name: '15 - 4 Queijos',ingredients: 'Molho de tomate caseiro, mozzarella farta, parmesão ralado, queijo provolone e catupiry.',priceP: 12.9,priceM: 14.9,priceG: 18.9,category: 'tradicionais', imageUrl: '/15-4queijos.png'}"
);

content = content.replace(
  /{id: 'p-22',name: '22 - Milho com Bacon',ingredients: 'Molho de tomate caseiro, mozzarella farta, bacon crocante defumado e milho doce gratinado.',priceP: 12.9,priceM: 14.9,priceG: 18.9,category: 'tradicionais'}/g,
  "{id: 'p-22',name: '22 - Milho com Bacon',ingredients: 'Molho de tomate caseiro, mozzarella farta, bacon crocante defumado e milho doce gratinado.',priceP: 12.9,priceM: 14.9,priceG: 18.9,category: 'tradicionais', imageUrl: '/22-milhocombacon.png'}"
);

content = content.replace(
  /{id: 'p-28',name: '28 - Alho Poró - Francês',ingredients: 'Molho de tomate, mozzarella, lombo fatiado \(paio\), alho poró \(francês\) salteado e catupiry.',priceP: 15.9,priceM: 17.9,priceG: 21.9,category: 'especiais'}/g,
  "{id: 'p-28',name: '28 - Alho Poró - Francês',ingredients: 'Molho de tomate, mozzarella, lombo fatiado (paio), alho poró (francês) salteado e catupiry.',priceP: 15.9,priceM: 17.9,priceG: 21.9,category: 'especiais', imageUrl: '/28-alhoporofrances.png'}"
);

content = content.replace(
  /{id: 'p-37',name: '37 - Estrogonofe de Carne',ingredients: 'Molho de tomate, mozzarella farta, pedaços de carne bovina tenra ao molho estrogonofe artesanal, cogumelos e batata palha.',priceP: 15.9,priceM: 17.9,priceG: 21.9,category: 'especiais'}/g,
  "{id: 'p-37',name: '37 - Estrogonofe de Carne',ingredients: 'Molho de tomate, mozzarella farta, pedaços de carne bovina tenra ao molho estrogonofe artesanal, cogumelos e batata palha.',priceP: 15.9,priceM: 17.9,priceG: 21.9,category: 'especiais', imageUrl: '/37-estrogonofedecarne.png'}"
);

content = content.replace(
  /{id: 'p-41',name: '41 - Estrogonofe de Frango Inverso',ingredients: 'Molho de tomate, estrogonofe de frango gourmet, cogumelos, batata palha bem crocante e queijo mozzarella fatiado gratinado por cima.',priceP: 18.9,priceM: 20.9,priceG: 23.9,category: 'gourmet'}/g,
  "{id: 'p-41',name: '41 - Estrogonofe de Frango Inverso',ingredients: 'Molho de tomate, estrogonofe de frango gourmet, cogumelos, batata palha bem crocante e queijo mozzarella fatiado gratinado por cima.',priceP: 18.9,priceM: 20.9,priceG: 23.9,category: 'gourmet', imageUrl: '/41-estrogonofedefrangoinverso.png'}"
);

content = content.replace(
  /{id: 'p-57',name: '57 - Sensação com Chocolate Preto',ingredients: 'Chocolate preto nobre derretido decorado artisticamente com fatias de morangos maduros selecionados.',priceP: 14.9,priceM: 16.9,priceG: 19.9,category: 'doces'}/g,
  "{id: 'p-57',name: '57 - Sensação com Chocolate Preto',ingredients: 'Chocolate preto nobre derretido decorado artisticamente com fatias de morangos maduros selecionados.',priceP: 14.9,priceM: 16.9,priceG: 19.9,category: 'doces', imageUrl: '/57-sensaçaocomchocolatepreto.png'}"
);

content = content.replace(
  /{id: 'p-60',name: '60 - Triângulo Amoroso',ingredients: 'Arte doce:  metade chocolate preto, metade chocolate branco premium finalizada com morangos frescos no centro.',priceP: 14.9,priceM: 16.9,priceG: 19.9,category: 'doces'}/g,
  "{id: 'p-60',name: '60 - Triângulo Amoroso',ingredients: 'Arte doce:  metade chocolate preto, metade chocolate branco premium finalizada com morangos frescos no centro.',priceP: 14.9,priceM: 16.9,priceG: 19.9,category: 'doces', imageUrl: '/60-triangulo-amoroso.png'}"
);

fs.writeFileSync(file, content, 'utf8');
console.log("Updated!");
