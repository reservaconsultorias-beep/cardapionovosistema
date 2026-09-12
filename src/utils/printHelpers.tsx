import React from 'react';
import { ALL_MENU_ITEMS } from '../data/menu';

/**
 * Retorna o nome formatado em texto puro substituindo números por Pizza ou Esfirra.
 */
export function getItemNameTextForPrint(item: any): string {
  if (!item) return '';
  const rawName = (typeof item === 'string' ? item : (item.name || '')).trim();
  if (!rawName) return '';

  // 1. Se já começa com Pizza ou Esfirra/Esfiha seguido de número:
  // Ex: "Pizza 26 - Margherita" -> "Pizza Margherita"
  if (/^pizza\s+\d+\s*[-–—]\s*/i.test(rawName)) {
    return rawName.replace(/^pizza\s+\d+\s*[-–—]\s*/i, 'Pizza ');
  }
  if (/^esfi(?:ha|rra)\s+\d+\s*[-–—]\s*/i.test(rawName)) {
    return rawName.replace(/^esfi(?:ha|rra)\s+\d+\s*[-–—]\s*/i, 'Esfirra ');
  }

  // 2. Pizza meio a meio (contém 1/2)
  if (rawName.includes('1/2')) {
    let formatted = rawName.replace(/1\/2\s+(?:p-?\d+\s*[-–—]\s*)?(\d+)\s*[-–—]\s*/gi, '1/2 Pizza ');
    if (!formatted.toLowerCase().includes('pizza')) {
      formatted = 'Pizza ' + formatted;
    }
    return formatted;
  }

  // 3. Identificar se é Pizza ou Esfirra pelas propriedades do item
  const cat = (item.category || item.menuItem?.category || '').toLowerCase();
  const id = (item.id || item.menuItem?.id || '').toLowerCase();

  let itemType: 'pizza' | 'esfirra' | null = null;

  if (id.startsWith('e-') || cat.includes('esfiha') || cat.includes('esfirra')) {
    itemType = 'esfirra';
  } else if (
    id.startsWith('p-') ||
    cat.includes('pizza') ||
    ['tradicionais', 'especiais', 'gourmet', 'vegetarianas'].includes(cat)
  ) {
    itemType = 'pizza';
  } else if (item.size || /\((?:Pq|Md|Gr|P|M|G|Pequena|Média|Grande)\)/i.test(rawName)) {
    itemType = 'pizza';
  }

  // 4. Verifica se o nome inicia com número, ex: "30 - Carbonara" ou "5 - Carne"
  const match = rawName.match(/^(?:item\s*)?(?:[pe]-)?(\d+)\s*(?:[-–—]\s*(.+))?$/i);
  if (match) {
    const num = parseInt(match[1], 10);
    const rest = (match[2] || '').trim();

    const pizzaMatch = ALL_MENU_ITEMS.find((m: any) => m.id === `p-${num}`);
    const esfihaMatch = ALL_MENU_ITEMS.find((m: any) => m.id === `e-${num}`);

    if (!itemType) {
      const restClean = rest
        .replace(/\s*\([^)]*\)/g, '')
        .replace(/\s*\[[^\]]*\]/g, '')
        .toLowerCase()
        .trim();

      const pizzaFlavor = pizzaMatch ? pizzaMatch.name.replace(/^\d+\s*[-–—]\s*/, '').toLowerCase().trim() : '';
      const esfihaFlavor = esfihaMatch ? esfihaMatch.name.replace(/^\d+\s*[-–—]\s*/, '').toLowerCase().trim() : '';

      if (restClean) {
        if (pizzaFlavor && (restClean.includes(pizzaFlavor) || pizzaFlavor.includes(restClean))) {
          itemType = 'pizza';
        } else if (esfihaFlavor && (restClean.includes(esfihaFlavor) || esfihaFlavor.includes(restClean))) {
          itemType = 'esfirra';
        } else if (pizzaMatch && !esfihaMatch) {
          itemType = 'pizza';
        } else if (esfihaMatch && !pizzaMatch) {
          itemType = 'esfirra';
        } else if (cat === 'doces') {
          itemType = 'pizza';
        } else if (num > 40) {
          itemType = 'pizza';
        } else {
          itemType = 'pizza';
        }
      } else {
        if (num > 40 || (pizzaMatch && !esfihaMatch)) {
          itemType = 'pizza';
        } else {
          itemType = 'pizza';
        }
      }
    }

    if (itemType === 'pizza') {
      if (rest) {
        return `Pizza ${rest}`;
      } else if (pizzaMatch) {
        const cleanFlavor = pizzaMatch.name.replace(/^\d+\s*[-–—]\s*/, '').trim();
        return `Pizza ${cleanFlavor}`;
      }
      return `Pizza ${num}`;
    } else if (itemType === 'esfirra') {
      if (rest) {
        return `Esfirra ${rest}`;
      } else if (esfihaMatch) {
        const cleanFlavor = esfihaMatch.name.replace(/^\d+\s*[-–—]\s*/, '').trim();
        return `Esfirra ${cleanFlavor}`;
      }
      return `Esfirra ${num}`;
    }
  }

  return rawName;
}

/**
 * Formata o nome do item para exibição e impressão no talão/comanda.
 * Destaca as palavras "Pizza" e "Esfirra" em negrito (bold / font-weight: 900),
 * mantendo o restante do nome com o peso normal.
 */
export function formatItemNameForPrint(item: any): React.ReactNode {
  const text = getItemNameTextForPrint(item);
  if (!text) return '';

  const parts = text.split(/(Pizza|Esfirra|Esfiha)/gi);
  if (parts.length === 1) return text;

  return (
    <>
      {parts.map((part, i) => {
        if (/^(pizza|esfirra|esfiha)$/i.test(part)) {
          return (
            <b key={i} style={{ fontWeight: 900 }}>
              {part}
            </b>
          );
        }
        return part;
      })}
    </>
  );
}
