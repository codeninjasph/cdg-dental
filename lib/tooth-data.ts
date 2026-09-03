export interface ToothInfo {
  number: number;
  fdiNumber: number;
  name: string;
  type: 'molar' | 'premolar' | 'canine' | 'incisor';
  arch: 'upper' | 'lower';
  side: 'right' | 'left';
}

export const TOOTH_METADATA: Record<number, ToothInfo> = {
  // Upper Arch (Maxillary) 1-16
  1: { number: 1, fdiNumber: 18, name: "Upper Right 3rd Molar (Wisdom)", type: 'molar', arch: 'upper', side: 'right' },
  2: { number: 2, fdiNumber: 17, name: "Upper Right 2nd Molar", type: 'molar', arch: 'upper', side: 'right' },
  3: { number: 3, fdiNumber: 16, name: "Upper Right 1st Molar", type: 'molar', arch: 'upper', side: 'right' },
  4: { number: 4, fdiNumber: 15, name: "Upper Right 2nd Premolar", type: 'premolar', arch: 'upper', side: 'right' },
  5: { number: 5, fdiNumber: 14, name: "Upper Right 1st Premolar", type: 'premolar', arch: 'upper', side: 'right' },
  6: { number: 6, fdiNumber: 13, name: "Upper Right Canine", type: 'canine', arch: 'upper', side: 'right' },
  7: { number: 7, fdiNumber: 12, name: "Upper Right Lateral Incisor", type: 'incisor', arch: 'upper', side: 'right' },
  8: { number: 8, fdiNumber: 11, name: "Upper Right Central Incisor", type: 'incisor', arch: 'upper', side: 'right' },
  9: { number: 9, fdiNumber: 21, name: "Upper Left Central Incisor", type: 'incisor', arch: 'upper', side: 'left' },
  10: { number: 10, fdiNumber: 22, name: "Upper Left Lateral Incisor", type: 'incisor', arch: 'upper', side: 'left' },
  11: { number: 11, fdiNumber: 23, name: "Upper Left Canine", type: 'canine', arch: 'upper', side: 'left' },
  12: { number: 12, fdiNumber: 24, name: "Upper Left 1st Premolar", type: 'premolar', arch: 'upper', side: 'left' },
  13: { number: 13, fdiNumber: 25, name: "Upper Left 2nd Premolar", type: 'premolar', arch: 'upper', side: 'left' },
  14: { number: 14, fdiNumber: 26, name: "Upper Left 1st Molar", type: 'molar', arch: 'upper', side: 'left' },
  15: { number: 15, fdiNumber: 27, name: "Upper Left 2nd Molar", type: 'molar', arch: 'upper', side: 'left' },
  16: { number: 16, fdiNumber: 28, name: "Upper Left 3rd Molar (Wisdom)", type: 'molar', arch: 'upper', side: 'left' },

  // Lower Arch (Mandibular) 17-32
  17: { number: 17, fdiNumber: 38, name: "Lower Left 3rd Molar (Wisdom)", type: 'molar', arch: 'lower', side: 'left' },
  18: { number: 18, fdiNumber: 37, name: "Lower Left 2nd Molar", type: 'molar', arch: 'lower', side: 'left' },
  19: { number: 19, fdiNumber: 36, name: "Lower Left 1st Molar", type: 'molar', arch: 'lower', side: 'left' },
  20: { number: 20, fdiNumber: 35, name: "Lower Left 2nd Premolar", type: 'premolar', arch: 'lower', side: 'left' },
  21: { number: 21, fdiNumber: 34, name: "Lower Left 1st Premolar", type: 'premolar', arch: 'lower', side: 'left' },
  22: { number: 22, fdiNumber: 33, name: "Lower Left Canine", type: 'canine', arch: 'lower', side: 'left' },
  23: { number: 23, fdiNumber: 32, name: "Lower Left Lateral Incisor", type: 'incisor', arch: 'lower', side: 'left' },
  24: { number: 24, fdiNumber: 31, name: "Lower Left Central Incisor", type: 'incisor', arch: 'lower', side: 'left' },
  25: { number: 25, fdiNumber: 41, name: "Lower Right Central Incisor", type: 'incisor', arch: 'lower', side: 'right' },
  26: { number: 26, fdiNumber: 42, name: "Lower Right Lateral Incisor", type: 'incisor', arch: 'lower', side: 'right' },
  27: { number: 27, fdiNumber: 43, name: "Lower Right Canine", type: 'canine', arch: 'lower', side: 'right' },
  28: { number: 28, fdiNumber: 44, name: "Lower Right 1st Premolar", type: 'premolar', arch: 'lower', side: 'right' },
  29: { number: 29, fdiNumber: 45, name: "Lower Right 2nd Premolar", type: 'premolar', arch: 'lower', side: 'right' },
  30: { number: 30, fdiNumber: 46, name: "Lower Right 1st Molar", type: 'molar', arch: 'lower', side: 'right' },
  31: { number: 31, fdiNumber: 47, name: "Lower Right 2nd Molar", type: 'molar', arch: 'lower', side: 'right' },
  32: { number: 32, fdiNumber: 48, name: "Lower Right 3rd Molar (Wisdom)", type: 'molar', arch: 'lower', side: 'right' },
};

export const TOOTH_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; badge: string; description: string }> = {
  healthy: {
    label: "Healthy",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-300 dark:border-emerald-700",
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border-emerald-300",
    description: "Intact tooth structure with no pathology"
  },
  decayed: {
    label: "Decayed / Caries",
    bg: "bg-rose-100 dark:bg-rose-950/60",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-400 dark:border-rose-600",
    badge: "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200 border-rose-300",
    description: "Active caries lesion requiring restorative treatment"
  },
  filled: {
    label: "Filled / Restored",
    bg: "bg-amber-100 dark:bg-amber-950/60",
    text: "text-amber-800 dark:text-amber-300",
    border: "border-amber-400 dark:border-amber-600",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 border-amber-300",
    description: "Restored with composite or amalgam filling"
  },
  crowned: {
    label: "Crowned",
    bg: "bg-indigo-100 dark:bg-indigo-950/60",
    text: "text-indigo-800 dark:text-indigo-300",
    border: "border-indigo-400 dark:border-indigo-600",
    badge: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200 border-indigo-300",
    description: "Full coverage crown (porcelain / zirconia / PFM)"
  },
  root_canal: {
    label: "Root Canal Treated",
    bg: "bg-purple-100 dark:bg-purple-950/60",
    text: "text-purple-800 dark:text-purple-300",
    border: "border-purple-400 dark:border-purple-600",
    badge: "bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200 border-purple-300",
    description: "Endodontically treated and obturated"
  },
  implant: {
    label: "Dental Implant",
    bg: "bg-cyan-100 dark:bg-cyan-950/60",
    text: "text-cyan-800 dark:text-cyan-300",
    border: "border-cyan-400 dark:border-cyan-600",
    badge: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/60 dark:text-cyan-200 border-cyan-300",
    description: "Osseointegrated titanium/ceramic implant fixture"
  },
  extracted: {
    label: "Extracted",
    bg: "bg-slate-200 dark:bg-slate-800",
    text: "text-slate-600 dark:text-slate-400",
    border: "border-slate-400 dark:border-slate-600",
    badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300",
    description: "Extracted tooth space"
  },
  missing: {
    label: "Missing / Unerupted",
    bg: "bg-slate-100 dark:bg-slate-900",
    text: "text-slate-500 dark:text-slate-500",
    border: "border-dashed border-slate-400 dark:border-slate-700",
    badge: "bg-slate-100 text-slate-600 dark:bg-slate-800/80 dark:text-slate-400 border-slate-300",
    description: "Congenitally absent or impacted"
  },
  bridge: {
    label: "Bridge Abutment / Pontic",
    bg: "bg-blue-100 dark:bg-blue-950/60",
    text: "text-blue-800 dark:text-blue-300",
    border: "border-blue-400 dark:border-blue-600",
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 border-blue-300",
    description: "Part of a fixed partial denture bridge"
  }
};
