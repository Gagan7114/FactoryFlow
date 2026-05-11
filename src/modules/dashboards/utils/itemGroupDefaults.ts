export const ALL_MATERIAL_TYPES_VALUE = '';
export const DEFAULT_MATERIAL_TYPE_NAME = 'Packing Material';

export function isPackingMaterialGroup(name: string): boolean {
  const normalized = name.trim().toLowerCase();
  return (
    normalized.includes('material') &&
    (normalized.includes('packing') || normalized.includes('packaging'))
  );
}

export function findDefaultMaterialGroup<T>(
  itemGroups: T[],
  getName: (itemGroup: T) => string,
): T | undefined {
  return itemGroups.find((group) => isPackingMaterialGroup(getName(group))) ?? itemGroups[0];
}
