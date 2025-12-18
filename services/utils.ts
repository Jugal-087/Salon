import { utils, writeFile, read } from 'xlsx';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, onSnapshot, 
  addDoc, deleteDoc, updateDoc, doc, 
  query, orderBy, setDoc, enableIndexedDbPersistence,
  writeBatch
} from 'firebase/firestore';
import { Entry, Service, VIPMember } from '../types';

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyB-BWVL5HIIb5TWagbIYZ4L8q4Fs-JQV8c",
  authDomain: "salon-476c0.firebaseapp.com",
  projectId: "salon-476c0",
  storageBucket: "salon-476c0.firebasestorage.app",
  messagingSenderId: "160974497142",
  appId: "1:160974497142:web:65b32834d4202124948657",
  measurementId: "G-J176VLZ7V5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Enable Offline Persistence
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code == 'failed-precondition') {
    console.warn('Multiple tabs open, persistence can only be enabled in one tab at a a time.');
  } else if (err.code == 'unimplemented') {
    console.warn('The current browser does not support all of the features required to enable persistence');
  }
});

// --- Constants ---
export const COLLECTIONS = {
  ENTRIES: 'entries',
  VIP: 'vip',
  METADATA: 'metadata' // Stores services and staff lists
};

// --- Formatters ---

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatDateDisplay = (dateStr: string) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}-${m}-${y}`; // Format: dd-mm-yyyy strictly from components to avoid timezone shifts
};

export const getTodayISO = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Helper for Cycle Range: 25th of last month to 24th of this month
export const getCycleBounds = (isoMonth: string) => {
    const [year, month] = isoMonth.split('-').map(Number);
    
    // JS Date month is 0-indexed.
    // Start: 25th of previous month
    const startObj = new Date(year, month - 2, 25);
    // End: 24th of current month
    const endObj = new Date(year, month - 1, 24);

    const format = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    return {
        start: format(startObj),
        end: format(endObj)
    };
};

// --- Calculations ---

export const calculateVIPStatus = (phone: string, vips: VIPMember[]): 'active' | 'expired' | 'normal' => {
  const vip = vips.find((v) => v.phone === phone);
  if (!vip) return 'normal';

  const joinDate = new Date(vip.date);
  const expiryDate = new Date(joinDate);
  expiryDate.setFullYear(joinDate.getFullYear() + 1);

  if (new Date() > expiryDate) return 'expired';
  return 'active';
};

// --- Excel / File Helpers ---

export const exportToExcel = (data: any[], fileName: string) => {
  const ws = utils.json_to_sheet(data);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, 'Sheet1');
  writeFile(wb, `${fileName}.xlsx`);
};

export const parseExcel = async (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = utils.sheet_to_json(sheet);
        resolve(json);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

export const parseJSON = async (file: File): Promise<any> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        resolve(json);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

export const parseExcelDate = (val: any): string => {
    if (!val) return getTodayISO();

    if (typeof val === 'number') {
        const utc_days  = Math.floor(val - 25569);
        const utc_value = utc_days * 86400;
        const date_info = new Date(utc_value * 1000);
        return date_info.toISOString().split('T')[0];
    }

    if (typeof val === 'string') {
        const parts = val.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
        if (parts) {
            const d = parts[1].padStart(2, '0');
            const m = parts[2].padStart(2, '0');
            const y = parts[3];
            return `${y}-${m}-${d}`;
        }
        
        const d = new Date(val);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }

    return getTodayISO();
};

// --- Migration / Import Helper ---
export const batchImportEntries = async (entries: Entry[]) => {
  const batch = writeBatch(db);
  const entriesRef = collection(db, COLLECTIONS.ENTRIES);
  
  for (let i = 0; i < entries.length; i += 400) {
    const chunk = entries.slice(i, i + 400);
    const chunkBatch = writeBatch(db);
    chunk.forEach(entry => {
      const docRef = doc(entriesRef);
      const { id, ...data } = entry;
      chunkBatch.set(docRef, { 
        ...data, 
        timestamp: new Date(entry.datetime).getTime(),
        migrated: true 
      });
    });
    await chunkBatch.commit();
  }
};