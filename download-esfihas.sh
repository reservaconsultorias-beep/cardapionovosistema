#!/bin/bash
cd public

declare -A files
files=(
  ["7 - Fiambre com Queijo.png"]="7%20-%20Fiambre%20com%20Queijo.png"
  ["12 - Milho com Bacon.png"]="12%20-%20Milho%20com%20Bacon.png"
  ["13 - Tradicional.png"]="13%20-%20Tradicional.png"
  ["16-brocolis-com-bacon.png"]="16-brocolis-com-bacon.png"
  ["20 - Strogonoff de Carne.png"]="20%20-%20Strogonoff%20de%20Carne.png"
  ["22-queijo.png"]="22-queijo.png"
  ["24 - Portuguesa.png"]="24%20-%20Portuguesa.png"
  ["25 - Banana com Canela.png"]="25%20-%20Banana%20com%20Canela.png"
  ["26 - Margherita.png"]="26%20-%20Margherita.png"
  ["27 - Chocolate Preto.png"]="27%20-%20Chocolate%20Preto.png"
  ["33 - Prestígio.png"]="33%20-%20Prest%C3%ADgio.png"
  ["40 - Iscas de Carne.png"]="40%20-%20Iscas%20de%20Carne.png"
  ["42 - Estrogonofe de Carne Inverso.png"]="42%20-%20Estrogonofe%20de%20Carne%20Inverso.png"
  ["5 - Carne.png"]="5%20-%20Carne.png"
  ["2 - Calabresa.png"]="2%20-%20Calabresa.png"
  ["43 - 2970.png"]="43%20-%202970.png"
  ["51 - Leite Ninho - Nido.png"]="51%20-%20Leite%20Ninho%20-%20Nido.png"
)

for file in "${!files[@]}"; do
  url="https://41menuspizzaria.netlify.app/${files[$file]}"
  echo "Downloading $file from $url"
  curl -s -L "$url" -o "$file"
done

ls -lh
