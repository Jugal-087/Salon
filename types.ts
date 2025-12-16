export interface Service {
  name: string;
  amount: number;
}

export interface Staff {
  name: string;
}

export interface VIPMember {
  phone: string;
  name: string;
  date: string; // YYYY-MM-DD
  staff: string;
}

export interface ServiceItem {
  name: string;
  amount: number;
}

export interface Entry {
  id: string | number; // Updated to support Firestore string IDs
  date: string; // YYYY-MM-DD
  datetime: string; // ISO String
  phone: string;
  name: string;
  staff: string;
  services: ServiceItem[];
  total: number;
  discount: number;
  paid: number;
  memberStatus: 'active' | 'expired' | 'normal';
}

export type TabType = 'entry' | 'membership' | 'services' | 'staff' | 'reports';

export const STAFF_DELETE_PASSWORD = "Sonimona";