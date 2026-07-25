#!/bin/bash
cd public

declare -A drinks
drinks=(
  ["Coca Cola Lata.png"]="Coca%20Cola%20Lata.png"
  ["Fanta Laranja.png"]="Fanta%20Laranja.png"
  ["7up.png"]="7up.png"
  ["Coca Zero lata.png"]="Coca%20Zero%20lata.png"
  ["guaraná.png"]="guaran%C3%A1.png"
  ["Sumol Laranja.png"]="Sumol%20Laranja.png"
  ["Ice Pêssego.png"]="Ice%20P%C3%AAssego.png"
  ["Água.png"]="%C3%81gua.png"
  ["Coca Zero Garrafa.png"]="Coca%20Zero%20Garrafa.png"
  ["Sagres Cerveja.png"]="Sagres%20Cerveja.png"
  ["haineken.png"]="haineken.png"
)

for file in "${!drinks[@]}"; do
  url="https://41menuspizzaria.netlify.app/${drinks[$file]}"
  echo "Downloading $file from $url"
  curl -s -L "$url" -o "$file"
done

ls -lh
