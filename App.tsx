import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, Scissors, Contact, FileBarChart, Settings2 } from 'lucide-react';
import { collection, onSnapshot, query, orderBy, doc, setDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { EntryTab } from './components/EntryTab';
import { ServicesTab } from './components/ServicesTab';
import { StaffTab } from './components/StaffTab';
import { StaffPerformanceTab } from './components/StaffPerformanceTab';
import { MembershipTab } from './components/MembershipTab';
import { ReportsTab } from './components/ReportsTab';
import { Button } from './components/UI';
import { db, COLLECTIONS, getTodayISO } from './services/utils';
import { Service, Staff, VIPMember, Entry, TabType } from './types';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('entry');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Application State
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<string[]>([]);
  const [vips, setVips] = useState<VIPMember[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [counterCash, setCounterCash] = useState<number>(0);

  // Network Status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Firebase Subscriptions
  useEffect(() => {
    // 1. Subscribe to Services (Metadata)
    const unsubServices = onSnapshot(doc(db, COLLECTIONS.METADATA, 'services'), (doc) => {
        if (doc.exists()) {
            setServices(doc.data().list || []);
        } else {
            // Initialize defaults with categories
            setDoc(doc.ref, { 
              list: [
                { name: 'Men\'s Haircut', amount: 300, category: 'Men' }, 
                { name: 'Men\'s Shave', amount: 150, category: 'Men' },
                { name: 'Woman\'s Styling', amount: 800, category: 'Women' }
              ] 
            });
        }
    }, (error) => {
      console.error("Services sync error:", error);
    });

    // 2. Subscribe to Staff (Metadata)
    const unsubStaff = onSnapshot(doc(db, COLLECTIONS.METADATA, 'staff'), (doc) => {
        if (doc.exists()) {
            setStaff(doc.data().list || []);
        } else {
            setDoc(doc.ref, { list: ['Asif', 'Rihan'] });
        }
    }, (error) => {
      console.error("Staff sync error:", error);
    });

    // 3. Subscribe to VIPs
    const vipQuery = query(collection(db, COLLECTIONS.VIP));
    const unsubVIP = onSnapshot(vipQuery, { includeMetadataChanges: true }, (snapshot) => {
        const vipList: VIPMember[] = [];
        snapshot.forEach((doc) => {
            const data = doc.data() as VIPMember;
            const synced = !doc.metadata.hasPendingWrites;
            vipList.push({ ...data, synced });
        });
        setVips(vipList);
    }, (error) => {
      console.error("VIP sync error:", error);
    });

    // 4. Subscribe to Entries
    const entriesQuery = query(collection(db, COLLECTIONS.ENTRIES), orderBy('timestamp', 'desc'));
    const unsubEntries = onSnapshot(entriesQuery, { includeMetadataChanges: true }, (snapshot) => {
        const entriesList: Entry[] = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            const synced = !doc.metadata.hasPendingWrites;
            entriesList.push({ id: doc.id, ...data, synced } as Entry);
        });
        setEntries(entriesList);
    }, (error) => {
      console.error("Entries sync error:", error);
    });

    // 5. Subscribe to Daily Stats (Counter Cash)
    const today = getTodayISO();
    const unsubDailyStats = onSnapshot(doc(db, 'dailyStats', today), (doc) => {
        if (doc.exists()) {
            setCounterCash(doc.data().counterCash || 0);
        } else {
            setCounterCash(0);
        }
    });

    return () => {
        unsubServices();
        unsubStaff();
        unsubVIP();
        unsubEntries();
        unsubDailyStats();
    };
  }, []);

  // Actions
  const updateServices = async (newServices: Service[]) => {
    await setDoc(doc(db, COLLECTIONS.METADATA, 'services'), { list: newServices });
  };

  const updateStaff = async (newStaff: string[]) => {
    await setDoc(doc(db, COLLECTIONS.METADATA, 'staff'), { list: newStaff });
  };

  const addEntry = async (entry: Entry) => {
    const { id, synced, ...data } = entry; 
    // Ensuring paid amount is rounded to next number if it has decimals
    const roundedPaid = Math.ceil(data.paid);
    await addDoc(collection(db, COLLECTIONS.ENTRIES), {
        ...data,
        paid: roundedPaid,
        timestamp: Date.now()
    });
  };

  const deleteEntry = async (id: string | number) => {
    await deleteDoc(doc(db, COLLECTIONS.ENTRIES, String(id)));
  };

  const handleAddVIP = async (vip: VIPMember) => {
    const { phone, name, date, staff } = vip;
    await setDoc(doc(db, COLLECTIONS.VIP, phone), { phone, name, date, staff });
  };
  
  const handleDeleteVIP = async (phone: string) => {
    await deleteDoc(doc(db, COLLECTIONS.VIP, phone));
  };

  const handleVIPListUpdate = (latestVips: VIPMember[]) => {
      latestVips.forEach(v => {
          const { phone, name, date, staff } = v;
          setDoc(doc(db, COLLECTIONS.VIP, phone), { phone, name, date, staff });
      });
  };

  const updateCounterCash = async (val: number) => {
    const today = getTodayISO();
    await setDoc(doc(db, 'dailyStats', today), { counterCash: val }, { merge: true });
  };

  const navItems = [
    { id: 'entry', label: 'Data Entry', icon: LayoutDashboard },
    { id: 'membership', label: 'Membership', icon: Users },
    { id: 'reports', label: 'Reports', icon: FileBarChart },
    { id: 'staff', label: 'Staff', icon: Contact },
    { id: 'meta', label: 'Meta', icon: Settings2 },
  ];

  return (
    <div className="min-h-screen pb-20">
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-5 flex items-center justify-between shadow-sm no-print">
            <div className="flex items-center gap-4">
              <div className="w-9 h-9 bg-gradient-to-br from-sky-50 to-teal-400 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-sm">S</div>
              <div className="flex flex-col">
                  <div className="flex items-center gap-3">
                      <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">Salon Manager</h1>
                      <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-orange-500'} animate-pulse`} title={isOnline ? "Online & Synced" : "Offline Mode"}></div>
                  </div>
                  <span className="text-[10px] font-black tracking-widest text-teal-600 mt-1 uppercase">
                      {isOnline ? 'Cloud Synced' : 'Offline Mode'}
                  </span>
              </div>
            </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
            <div className="flex flex-wrap gap-3 mb-10 no-print">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id as TabType)}
                            className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl font-bold transition-all duration-200 border-2 ${
                                isActive 
                                ? 'bg-white border-slate-800 text-slate-800 shadow-lg translate-y-[-2px]' 
                                : 'bg-white text-slate-500 border-transparent hover:bg-slate-50 hover:border-slate-200'
                            }`}
                        >
                            <Icon size={19} className={isActive ? 'text-sky-500' : 'text-slate-400'} />
                            {item.label}
                        </button>
                    )
                })}
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                {activeTab === 'entry' && (
                    <EntryTab 
                        services={services} 
                        staff={staff} 
                        vips={vips} 
                        entries={entries}
                        onSave={addEntry}
                        onAddVIP={handleAddVIP}
                        onDeleteEntry={deleteEntry}
                        counterCash={counterCash}
                        onUpdateCounterCash={updateCounterCash}
                    />
                )}
                {activeTab === 'reports' && (
                    <ReportsTab entries={entries} vips={vips} onDeleteEntry={deleteEntry} counterCash={counterCash} />
                )}
                {activeTab === 'staff' && (
                    <StaffPerformanceTab 
                        staff={staff} 
                        entries={entries} 
                        vips={vips}
                    />
                )}
                {activeTab === 'meta' && (
                    <StaffTab 
                        staff={staff} 
                        entries={entries} 
                        vips={vips}
                        onUpdate={updateStaff}
                        services={services}
                        onUpdateServices={updateServices}
                    />
                )}
                {activeTab === 'membership' && (
                    <MembershipTab 
                        vips={vips} 
                        staff={staff} 
                        onUpdate={(updatedList) => {
                            handleVIPListUpdate(updatedList);
                        }}
                        /* @ts-ignore */
                        onDeleteVIP={handleDeleteVIP}
                    />
                )}
            </div>
        </main>
    </div>
  );
}

export default App;