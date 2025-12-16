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
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB'); // DD/MM/YYYY
};

export const getTodayISO = () => new Date().toISOString().split('T')[0];

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

// --- Migration / Import Helper ---
export const batchImportEntries = async (entries: Entry[]) => {
  const batch = writeBatch(db);
  const entriesRef = collection(db, COLLECTIONS.ENTRIES);
  
  // Process in chunks of 500 (Firestore limit)
  for (let i = 0; i < entries.length; i += 400) {
    const chunk = entries.slice(i, i + 400);
    const chunkBatch = writeBatch(db);
    chunk.forEach(entry => {
      const docRef = doc(entriesRef); // Auto ID
      const { id, ...data } = entry; // Remove legacy numeric ID, use Firestore ID
      chunkBatch.set(docRef, { 
        ...data, 
        timestamp: new Date(entry.datetime).getTime(),
        migrated: true 
      });
    });
    await chunkBatch.commit();
  }
};