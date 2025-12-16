import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, Scissors, Contact, FileBarChart } from 'lucide-react';
import { collection, onSnapshot, query, orderBy, doc, setDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { EntryTab } from './components/EntryTab';
import { ServicesTab } from './components/ServicesTab';
import { StaffTab } from './components/StaffTab';
import { MembershipTab } from './components/MembershipTab';
import { ReportsTab } from './components/ReportsTab';
import { Button } from './components/UI';
import { db, COLLECTIONS } from './services/utils';
import { Service, Staff, VIPMember, Entry, TabType } from './types';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('entry');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Application State
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<string[]>([]);
  const [vips, setVips] = useState<VIPMember[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);

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
            // Initialize defaults if not exists
            setDoc(doc.ref, { list: [{ name: 'Haircut', amount: 300 }, { name: 'Shave', amount: 150 }] });
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
    const unsubVIP = onSnapshot(vipQuery, (snapshot) => {
        const vipList: VIPMember[] = [];
        snapshot.forEach((doc) => {
            vipList.push(doc.data() as VIPMember);
        });
        setVips(vipList);
    }, (error) => {
      console.error("VIP sync error:", error);
    });

    // 4. Subscribe to Entries
    const entriesQuery = query(collection(db, COLLECTIONS.ENTRIES), orderBy('timestamp', 'desc'));
    const unsubEntries = onSnapshot(entriesQuery, (snapshot) => {
        const entriesList: Entry[] = [];
        snapshot.forEach((doc) => {
            entriesList.push({ id: doc.id, ...doc.data() } as Entry);
        });
        setEntries(entriesList);
    }, (error) => {
      console.error("Entries sync error:", error);
    });

    return () => {
        unsubServices();
        unsubStaff();
        unsubVIP();
        unsubEntries();
    };
  }, []);

  // Actions
  const updateServices = async (newServices: Service[]) => {
    await setDoc(doc(db, COLLECTIONS.METADATA, 'services'), { list: newServices });
  };

  const updateStaff = async (newStaff: string[]) => {
    await setDoc(doc(db, COLLECTIONS.METADATA, 'staff'), { list: newStaff });
  };

  const updateVips = async (newVips: VIPMember[]) => {
    for (const vip of newVips) {
        await setDoc(doc(db, COLLECTIONS.VIP, vip.phone), vip);
    }
  };

  const addEntry = async (entry: Entry) => {
    const { id, ...data } = entry; // Drop local ID
    await addDoc(collection(db, COLLECTIONS.ENTRIES), {
        ...data,
        timestamp: Date.now()
    });
  };

  const deleteEntry = async (id: string | number) => {
    await deleteDoc(doc(db, COLLECTIONS.ENTRIES, String(id)));
  };

  const handleAddVIP = async (vip: VIPMember) => {
    await setDoc(doc(db, COLLECTIONS.VIP, vip.phone), vip);
  };
  
  const handleDeleteVIP = async (phone: string) => {
    await deleteDoc(doc(db, COLLECTIONS.VIP, phone));
  };

  const handleVIPListUpdate = (latestVips: VIPMember[]) => {
      latestVips.forEach(v => {
          setDoc(doc(db, COLLECTIONS.VIP, v.phone), v);
      });
  };

  const navItems = [
    { id: 'entry', label: 'Data Entry', icon: LayoutDashboard },
    { id: 'membership', label: 'Membership', icon: Users },
    { id: 'services', label: 'Services', icon: Scissors },
    { id: 'staff', label: 'Staff', icon: Contact },
    { id: 'reports', label: 'Reports', icon: FileBarChart },
  ];

  return (
    <div className="min-h-screen pb-20">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm no-print">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-sky-500 to-teal-400 rounded-lg flex items-center justify-center text-white font-bold text-lg">S</div>
              <div>
                  <div className="flex items-center gap-2">
                      <h1 className="text-xl font-bold text-slate-800 leading-none">Salon Offline Manager</h1>
                      <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-orange-500'} animate-pulse`} title={isOnline ? "Online & Synced" : "Offline Mode"}></div>
                  </div>
                  <span className="text-[10px] font-bold tracking-wider text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100 uppercase">
                      {isOnline ? 'Cloud Synced' : 'Offline Mode'}
                  </span>
              </div>
            </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
            {/* Navigation Tabs */}
            <div className="flex flex-wrap gap-2 mb-8 no-print">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id as TabType)}
                            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold transition-all duration-200 ${
                                isActive 
                                ? 'bg-slate-800 text-white shadow-lg shadow-slate-200 translate-y-[-2px]' 
                                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 hover:border-slate-300'
                            }`}
                        >
                            <Icon size={18} className={isActive ? 'text-sky-300' : 'text-slate-400'} />
                            {item.label}
                        </button>
                    )
                })}
            </div>

            {/* Content Area */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                {activeTab === 'entry' && (
                    <EntryTab 
                        services={services} 
                        staff={staff} 
                        vips={vips} 
                        entries={entries}
                        onSave={addEntry}
                        onAddVIP={handleAddVIP}
                    />
                )}
                {activeTab === 'services' && (
                    <ServicesTab services={services} onUpdate={updateServices} />
                )}
                {activeTab === 'staff' && (
                    <StaffTab 
                        staff={staff} 
                        entries={entries} 
                        vips={vips}
                        onUpdate={updateStaff} 
                    />
                )}
                {activeTab === 'membership' && (
                    /* Injecting custom props to handle the Firestore mismatch with original design */
                    <MembershipTab 
                        vips={vips} 
                        staff={staff} 
                        onUpdate={(updatedList) => {
                            // Detect deletion by length comparison logic is flawed here.
                            // We will use a hacked prop in MembershipTab to call delete directly.
                            handleVIPListUpdate(updatedList);
                        }}
                        /* @ts-ignore: Passing extra props for cleaner Firestore integration */
                        onDeleteVIP={handleDeleteVIP}
                    />
                )}
                {activeTab === 'reports' && (
                    <ReportsTab entries={entries} onDeleteEntry={deleteEntry} />
                )}
            </div>
        </main>
    </div>
  );
}

export default App;