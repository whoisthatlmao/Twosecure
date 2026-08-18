export type EntryCategory = 'Password' | 'Totp' | 'Card' | 'Note';

export interface VaultGroup {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface VaultEntry {
  id: string;
  title: string;
  username: string;
  password: string;
  url: string;
  totp_secret?: string;
  notes?: string;
  category: EntryCategory;
  favorite: boolean;
  created_at: number;
  updated_at: number;
  // Dedicated Card fields (optional for backwards compatibility)
  card_holder?: string;
  card_number?: string;
  card_expiry?: string;
  card_cvv?: string;
  group_id?: string;
}

export interface TotpResponse {
  code: string;
  seconds_remaining: number;
}
