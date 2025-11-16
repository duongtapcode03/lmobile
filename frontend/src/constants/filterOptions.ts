/**
 * Filter Options Constants
 * Tách các constants ra khỏi component để dễ maintain và reuse
 */

export interface PricePreset {
  label: string;
  min: number;
  max: number;
}

export interface FilterOption {
  label: string;
  value: string;
}

export const PRICE_PRESETS: PricePreset[] = [
  { label: 'Dưới 1 triệu', min: 0, max: 1000000 },
  { label: '1 đến 3 triệu', min: 1000000, max: 3000000 },
  { label: '3 đến 5 triệu', min: 3000000, max: 5000000 },
  { label: '5 đến 10 triệu', min: 5000000, max: 10000000 },
  { label: '10 đến 15 triệu', min: 10000000, max: 15000000 },
  { label: '15 đến 20 triệu', min: 15000000, max: 20000000 },
  { label: '20 đến 25 triệu', min: 20000000, max: 25000000 },
  { label: '25 đến 30 triệu', min: 25000000, max: 30000000 },
  { label: '30 đến 50 triệu', min: 30000000, max: 50000000 },
  { label: '50 đến 85 triệu', min: 50000000, max: 85000000 },
  { label: 'Trên 85 triệu', min: 85000000, max: 500000000 },
];

export const STORAGE_OPTIONS: FilterOption[] = [
  { label: '<1GB', value: '<1GB' },
  { label: '32GB', value: '32GB' },
  { label: '64GB', value: '64GB' },
  { label: '128GB', value: '128GB' },
  { label: '256GB', value: '256GB' },
  { label: '512GB', value: '512GB' },
  { label: '1TB', value: '1TB' },
  { label: '2TB', value: '2TB' },
];

export const NFC_OPTIONS: FilterOption[] = [
  { label: 'Có', value: 'Có' },
  { label: 'Không', value: 'Không' },
];

export const REFRESH_RATE_OPTIONS: FilterOption[] = [
  { label: 'Không có', value: 'Không có' },
  { label: '60Hz', value: '60Hz' },
  { label: '90Hz', value: '90Hz' },
  { label: '120Hz', value: '120Hz' },
  { label: '144Hz', value: '144Hz' },
  { label: '165Hz', value: '165Hz' },
];

export const BATTERY_OPTIONS: FilterOption[] = [
  { label: '1000mAh → 4000mAh', value: '1000-4000' },
  { label: '4000mAh → 5000mAh', value: '4000-5000' },
  { label: '5000mAh → 6000mAh', value: '5000-6000' },
  { label: '6000mAh → 7000mAh', value: '6000-7000' },
  { label: '>7000mAh', value: '>7000' },
];

export const SCREEN_SIZE_OPTIONS: FilterOption[] = [
  { label: 'Màn hình gập', value: 'gập' },
  { label: 'Từ 1" đến < 3"', value: '1-3' },
  { label: 'Từ 3" đến < 5"', value: '3-5' },
  { label: 'Từ 5" đến < 6"', value: '5-6' },
  { label: 'Từ 6" đến < 6.5"', value: '6-6.5' },
  { label: 'Từ 6.5" đến < 6.7"', value: '6.5-6.7' },
  { label: 'Từ 6.7" đến < 7"', value: '6.7-7' },
];

export const DEFAULT_PRICE_RANGE: [number, number] = [0, 50000000];
export const MAX_PRICE = 500000000;






