
export interface Service {
  name: string;
  amount: number;
  category: 'Men' | 'Women';
}

export interface Staff {
  name: string;
}

export interface VIPMember {
  phone: string;
  name: string;
  date: string; // YYYY-MM-DD
  staff: string;
  synced?: boolean; // Indicates if data is synced to cloud
}

export interface ServiceItem {
  name: string;
  amount: number;
  category?: 'Men' | 'Women';
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
  paymentMethod?: string; // Cash, Card, UPI
  synced?: boolean; // Indicates if data is synced to cloud
}

export type TabType = 'entry' | 'membership' | 'services' | 'staff' | 'reports';

export const STAFF_DELETE_PASSWORD = "Sonimona";
