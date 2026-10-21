/** Plain 1/2/4 belong to emotes; Alt selects the overlapping equipment slots. */
export const EQUIPMENT_SHORTCUT_LABELS = ['Alt+1', 'Alt+2', '5', '6', '7', '8', 'Alt+4'] as const;
export function equipmentShortcut(event: Pick<KeyboardEvent, 'code' | 'key' | 'ctrlKey' | 'altKey' | 'metaKey' | 'shiftKey'>): number | null {
  if (event.ctrlKey || event.metaKey || event.shiftKey) return null;
  const digit = event.code.match(/^(?:Digit|Numpad)([1245678])$/)?.[1] ?? event.key;
  const slot = ['1', '2', '5', '6', '7', '8', '4'].indexOf(digit);
  if (slot < 0 || event.altKey !== ['1', '2', '4'].includes(digit)) return null;
  return slot;
}
