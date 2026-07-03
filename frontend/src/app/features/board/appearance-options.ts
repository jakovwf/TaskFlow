export interface AppearanceOption {
  label: string;
  value: string | null;
  preview: string;
}

export const CARD_COVER_COLORS: readonly AppearanceOption[] = [
  { label: 'Bez boje', value: null, preview: '#e2e8f0' },
  { label: 'Plava', value: '#2563eb', preview: '#2563eb' },
  { label: 'Ljubicasta', value: '#7c3aed', preview: '#7c3aed' },
  { label: 'Zelena', value: '#16a34a', preview: '#16a34a' },
  { label: 'Zuta', value: '#eab308', preview: '#eab308' },
  { label: 'Narandzasta', value: '#f97316', preview: '#f97316' },
  { label: 'Crvena', value: '#dc2626', preview: '#dc2626' },
  { label: 'Slate', value: '#475569', preview: '#475569' },
];

export const LIST_ACCENT_COLORS = CARD_COVER_COLORS;

export const BOARD_BACKGROUNDS: readonly AppearanceOption[] = [
  { label: 'Podrazumevana', value: null, preview: '#f8fafc' },
  { label: 'Plava', value: 'blue', preview: 'linear-gradient(135deg, #dbeafe, #bfdbfe)' },
  { label: 'Ljubicasta', value: 'purple', preview: 'linear-gradient(135deg, #ede9fe, #ddd6fe)' },
  { label: 'Zelena', value: 'green', preview: 'linear-gradient(135deg, #dcfce7, #bbf7d0)' },
  { label: 'Narandzasta', value: 'orange', preview: 'linear-gradient(135deg, #ffedd5, #fed7aa)' },
  { label: 'Slate', value: 'slate', preview: 'linear-gradient(135deg, #334155, #475569)' },
];
