/**
 * Utility functions for formatting item variants and quantity types
 * (e.g., "1 plate", "4 pcs", "1 kg", "250 gms", "500 ml", "1 Pc", etc.)
 */

export const getItemVariantLabel = (it: any): string => {
  if (!it) return '1 Pc';

  // 1. Direct string passed as variant or variantLabel
  if (typeof it === 'string' && it.trim() !== '') return it.trim();

  // 2. Explicit variantLabel property on item
  if (it.variantLabel && typeof it.variantLabel === 'string' && it.variantLabel.trim() !== '') {
    return it.variantLabel.trim();
  }

  // 3. Selected variant OR first variant in item.variants array if available
  const v = it.selectedVariant || it.variant || (Array.isArray(it.variants) && it.variants.length > 0 ? it.variants[0] : null);
  if (v) {
    if (typeof v === 'string' && v.trim() !== '') return v.trim();
    if (typeof v === 'object') {
      const label = v.label || v.name || v.variantName || v.portionName || v.title;
      const qty = v.quantity || v.qty || v.weight || v.packSize;
      const unit = v.unit || v.type || '';
      const qtyUnit = (qty || unit) ? `${qty || ''} ${unit}`.trim() : '';

      if (label && qtyUnit && label.toLowerCase() !== qtyUnit.toLowerCase()) {
        if (label.toLowerCase().includes(qtyUnit.toLowerCase())) return label;
        return `${label} (${qtyUnit})`;
      }
      if (label) return label;
      if (qtyUnit) return qtyUnit;
    }
  }

  // 4. Direct portion / weight / size properties on item
  if (it.portion) return String(it.portion);
  if (it.portionSize) return String(it.portionSize);
  if (it.packSize) return String(it.packSize);
  if (it.weight) return String(it.weight);
  if (it.size) return String(it.size);

  // 5. Quantity and Unit properties on item
  const qty = it.quantity || it.qty;
  const unit = (it.unit || it.unitType || '').toString().trim();
  if (qty && unit) return `${qty} ${unit}`;
  if (unit) return `1 ${unit}`;

  // 6. Check if item name or description contains piece/quantity/portion indicators
  // e.g. "Mirchi Bajji (4 pcs)" or "Idli (4 Pieces)" or "Sprite 500ml" or "Apples 1kg"
  const itemName = String(it.name || it.itemName || it.foodName || it.title || '');
  const itemDesc = String(it.description || '');
  const qtyMatch = (itemName + ' ' + itemDesc).match(/\b(\d+\s*(?:pcs|pc|pieces|piece|gms|gm|g|kg|ml|l|litre|litres|plate|plates|items|pack|packs|box|boxes))\b/i);
  if (qtyMatch && qtyMatch[1]) {
    return qtyMatch[1].trim();
  }

  // 7. Fallback type descriptor
  return '1 Pc';
};
