import { ALL_MENU_ITEMS } from '../data/menu';

export function slugify(text: string) {
  return text.toString().toLowerCase()
    .replace(/[àáâãäå]/g, 'a')
    .replace(/æ/g, 'ae')
    .replace(/ç/g, 'c')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/ñ/g, 'n')
    .replace(/[òóôõö]/g, 'o')
    .replace(/œ/g, 'oe')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ýÿ]/g, 'y')
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

export function findImageForProduct(item: { name: string; category?: string; id?: string }): string | null {
  // Always try to get it from our hardcoded ALL_MENU_ITEMS first
  if (item.id) {
    const hardcodedItem = ALL_MENU_ITEMS.find(i => i.id === item.id);
    if (hardcodedItem && hardcodedItem.imageUrl && hardcodedItem.imageUrl !== 'none') {
      const fileName = hardcodedItem.imageUrl.replace(/^\//, '');
      if (fileName.startsWith('http')) return fileName;
      return `/${fileName}`;
    }
  }
  return null;
}
