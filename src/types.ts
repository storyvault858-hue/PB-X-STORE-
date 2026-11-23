export type ColorMode = 'dark' | 'light';

export type ThemeId =
  | 'sapphire'
  | 'mint'
  | 'sakura'
  | 'orchid'
  | 'gold'
  | 'coral'
  | 'arctic'
  | 'matcha'
  | 'ruby'
  | 'mocha'
  | 'lavender'
  | 'titanium';

export type ActiveView = 'dashboard' | 'builds' | 'add' | 'manage';

export type PlatformType = 'Android' | 'iOS';

export type ExpiryMode = 'lifetime' | 'date';

export interface StoreApp {
  id: string;
  name: string;
  slug: string;
  appUrl?: string;
  bundleId?: string;
  platform?: PlatformType | string;
  iconUrl?: string;
  shortDescription?: string;
  fullDescription?: string;
  version: string;
  fileSize?: string;
  category?: string;
  androidMinVersion?: string;
  apkUrl: string;
  password?: string | null;
  aliases?: string[];
  published: boolean;
  isLifetime?: boolean;
  expiryDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
  downloads?: number;
  linkOpens?: number;
  uniqueDevices?: number;
  successRate?: string;
}

export interface AppFormValues {
  name: string;
  slug: string;
  platform: PlatformType;
  bundleId: string;
  expiryMode: ExpiryMode;
  expiryDate: string;
  iconUrl: string;
  shortDescription: string;
  category: string;
  fullDescription: string;
  version: string;
  fileSize: string;
  androidMinVersion: string;
  apkUrl: string;
  password: string;
  aliases: string;
  published: boolean;
}

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface ConfirmDialogState {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
}
