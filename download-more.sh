#!/bin/bash
cd public

declare -A files
files=(
  ["strogdefrangoinverso.png"]="strogdefrangoinverso.png"
  ["frangocatu.png"]="frangocatu.png"
  ["da casa.png"]="da%20casa.png"
  ["29 - MM's.png"]="29%20-%20MM%27s.png"
)

for file in "${!files[@]}"; do
  url="https://41menuspizzaria.netlify.app/${files[$file]}"
  echo "Downloading $file from $url"
  curl -s -L "$url" -o "$file"
done

ls -lh
