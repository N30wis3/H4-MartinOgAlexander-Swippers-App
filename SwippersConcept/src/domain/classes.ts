// Height / weight / age classes (FK.01). Users pick a class instead of typing
// exact numbers, so profiles stay approximate and matches stay fair.

export interface ClassBracket {
  id: string;
  label: string;
  min: number;
  max: number;
}

export const MIN_ADULT_AGE = 18;
export const MAX_AGE = 80;

export const HEIGHT_CLASSES: ClassBracket[] = [
  { id: 'h1', label: 'Under 165 cm', min: 140, max: 164 },
  { id: 'h2', label: '165–174 cm', min: 165, max: 174 },
  { id: 'h3', label: '175–184 cm', min: 175, max: 184 },
  { id: 'h4', label: '185–194 cm', min: 185, max: 194 },
  { id: 'h5', label: '195+ cm', min: 195, max: 220 },
];

export const WEIGHT_CLASSES: ClassBracket[] = [
  { id: 'w1', label: 'Under 60 kg', min: 40, max: 59 },
  { id: 'w2', label: '60–69 kg', min: 60, max: 69 },
  { id: 'w3', label: '70–79 kg', min: 70, max: 79 },
  { id: 'w4', label: '80–89 kg', min: 80, max: 89 },
  { id: 'w5', label: '90–99 kg', min: 90, max: 99 },
  { id: 'w6', label: '100+ kg', min: 100, max: 160 },
];

// Sparring is adults-only, so the youngest class starts at 18.
export const AGE_GROUPS: ClassBracket[] = [
  { id: 'a1', label: '18–24', min: 18, max: 24 },
  { id: 'a2', label: '25–29', min: 25, max: 29 },
  { id: 'a3', label: '30–34', min: 30, max: 34 },
  { id: 'a4', label: '35–44', min: 35, max: 44 },
  { id: 'a5', label: '45+', min: 45, max: MAX_AGE },
];

export interface ClassLists {
  height: ClassBracket[];
  weight: ClassBracket[];
  age: ClassBracket[];
}

// Replaces the class lists with the ones stored in the database. The arrays are
// updated in place so every module that imported them sees the new values.
export function applyClassLists(lists: ClassLists): void {
  HEIGHT_CLASSES.splice(0, HEIGHT_CLASSES.length, ...lists.height);
  WEIGHT_CLASSES.splice(0, WEIGHT_CLASSES.length, ...lists.weight);
  AGE_GROUPS.splice(0, AGE_GROUPS.length, ...lists.age);
}

// "70–79 kg", or "100+ kg" for the open-ended top class.
export function bracketLabel(min: number, max: number, unit: string, openEnded: boolean): string {
  return openEnded ? `${min}+${unit ? ` ${unit}` : ''}` : `${min}–${max}${unit ? ` ${unit}` : ''}`;
}

export function getClass(list: ClassBracket[], id: string): ClassBracket | undefined {
  return list.find((c) => c.id === id);
}

// Position in the ordered list; the distance between two indexes tells us how
// far apart two fighters are in that dimension.
export function classIndex(list: ClassBracket[], id: string): number {
  return list.findIndex((c) => c.id === id);
}

export function classLabel(list: ClassBracket[], id: string): string {
  return getClass(list, id)?.label ?? '—';
}
