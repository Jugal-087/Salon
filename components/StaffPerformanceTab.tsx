
import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, User, Scissors, TrendingUp, Clock, AlertCircle, Award } from 'lucide-react';
import { Card, Input } from './UI';
import { Entry } from '../types';
import { formatCurrency, formatDateDisplay, getMonthlyBounds, getTodayISO } from '../services/utils';

interface StaffPerformanceTabProps {
  staff: string[];
  entries: Entry[];
}

export const StaffPerformanceTab: React.FC<StaffPerformanceTabProps> = ({ staff, entries }) => {
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>(getTodayISO().substring(0, 7)); // YYYY-MM

  // Alphabetically sorted staff list for sub-tabs
  const sortedStaffList = useMemo(() => [...staff].sort((a, b) => a.localeCompare(b)), [staff]);

  // Set initial selected staff or handle changes in the staff list
  useEffect(() => {
    if (sortedStaffList.length > 0) {
      const currentExists = sortedStaffList.some(s => s.toLowerCase() === selectedStaff.toLowerCase());
      if (!selectedStaff || !currentExists) {
        setSelectedStaff(sortedStaffList[0]);
      }
    }
  }, [sortedStaffList, selectedStaff]);

  // Use business cycle bounds (25th to 24th) for the selected month
  const bounds = useMemo(() => getMonthlyBounds(selectedMonth), [selectedMonth]);

  // Filter entries with robust case-insensitive matching and chronological sorting
  const filteredEntries = useMemo(() => {
    if (!selectedStaff) return [];
    
    const searchName = selectedStaff.trim().toLowerCase();
    
    return entries
      .filter(e => {
        const entryStaff = (e.staff || '').trim().toLowerCase();
        const isInRange = e.date >= bounds.start && e.date <= bounds.end;
        return entryStaff === searchName && isInRange;
      })
      .sort((a, b) => {
        // Sort by timestamp (if exists) or datetime for latest on top
        // @ts-ignore - entries often have timestamp from firestore
        const timeA = a.timestamp || new Date(a.datetime || a.date).getTime();
        // @ts-ignore
        const timeB = b.timestamp || new Date(b.datetime || b.date).getTime();
        return timeB - timeA; // Latest on top
      });
  }, [entries, selectedStaff, bounds]);

  // Calculate stats strictly excluding membership revenue
  const stats = useMemo(() => {
    return filteredEntries.reduce((acc, e) => {
        const hasFee = e.services.some(s => s.name === 'VIP Membership Fee');
        // Exclude the fixed 200 membership fee from performance revenue
        const srvPaid = Math.max(0, Math.ceil(e.paid - (hasFee ? 200 : 0)));
        
        acc.totalRevenue += srvPaid;
        // Count actual services performed, excluding the membership fee item
        acc.serviceCount += e.services.filter(s => s.name !== 'VIP Membership Fee').length;
        
        // Count memberships sold
        if (hasFee) {
          acc.membershipsCount += 1;
        }
        
        return acc;
    }, { totalRevenue: 0, serviceCount: 0, membershipsCount: 0 });
  }, [filteredEntries]);

  if (staff.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center p-16 text-slate-400 bg-slate-50/50 border-dashed">
        <AlertCircle size={48} className="mb-4 text-slate-300" />
        <p className="text-lg font-medium">No staff members configured</p>
        <p className="text-sm">Add staff in the "Meta" tab to track performance.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Staff Selection Sub-tabs (Alphabetical) */}
      <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 no-scrollbar">
        {sortedStaffList.map(name => {
          const isActive = selectedStaff.toLowerCase() === name.toLowerCase();
          return (
            <button
              key={name}
              onClick={() => setSelectedStaff(name)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap border-2 ${
                isActive
                ? 'bg-slate-800 border-slate-800 text-white shadow-lg translate-y-[-2px]'
                : 'bg-white border-transparent text-slate-600 hover:bg-slate-50 hover:border-slate-200'
              }`}
            >
              <User size={18} className={isActive ? 'text-sky-300' : 'text-slate-400'} />
              {name}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stats Column */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="h-fit">
            <div className="space-y-6">
              <Input 
                label="Monthly Performance Period" 
                type="month" 
                value={selectedMonth} 
                onChange={e => setSelectedMonth(e.target.value)} 
              />
              
              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-1">
                  <TrendingUp size={12} /> Staff Summary ({selectedStaff})
                </p>
                
                {/* Revenue Card - Simplified Styling */}
                <div className="p-4 bg-white rounded-2xl border-2 border-slate-100 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Service Revenue</p>
                  <p className="text-2xl font-black text-slate-800">{formatCurrency(stats.totalRevenue)}</p>
                  <p className="text-[9px] text-slate-400 mt-1 italic">Excludes all Membership Fees</p>
                </div>

                {/* Services Count Card */}
                <div className="p-4 bg-white rounded-2xl border-2 border-slate-100 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total Services</p>
                    <p className="text-2xl font-black text-slate-800">{stats.serviceCount}</p>
                  </div>
                  <div className="p-3 bg-sky-50 rounded-xl text-sky-500">
                    <Scissors size={24} />
                  </div>
                </div>

                {/* Membership Count Card */}
                <div className="p-4 bg-white rounded-2xl border-2 border-slate-100 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Memberships Sold</p>
                    <p className="text-2xl font-black text-slate-800">{stats.membershipsCount}</p>
                  </div>
                  <div className="p-3 bg-teal-50 rounded-xl text-teal-500">
                    <Award size={24} />
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                 <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Cycle Bounds</p>
                 <p className="text-xs text-slate-600 font-medium">
                   {formatDateDisplay(bounds.start)} — {formatDateDisplay(bounds.end)}
                 </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Transaction List Column */}
        <Card className="lg:col-span-2 !p-0 overflow-hidden shadow-sm border border-slate-200">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
             <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Service History (Newest First)</h3>
             <span className="text-[10px] font-bold px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-500">
               {filteredEntries.length} Transactions
             </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-white text-slate-400 font-bold uppercase text-[10px] border-b border-slate-50">
                <tr>
                  <th className="p-4">Date & Time</th>
                  <th className="p-4">Client Details</th>
                  <th className="p-4">Work Performed</th>
                  <th className="p-4 text-right">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredEntries.map((entry) => {
                  const hasFee = entry.services.some(s => s.name === 'VIP Membership Fee');
                  const srvPaid = Math.max(0, Math.ceil(entry.paid - (hasFee ? 200 : 0)));
                  
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="p-4">
                        <div className="font-bold text-slate-700">{formatDateDisplay(entry.date)}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock size={10} /> {new Date(entry.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-800">{entry.name}</div>
                        <div className="text-[11px] text-slate-400 tracking-tight">{entry.phone}</div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1.5">
                          {entry.services.map((s, idx) => (
                            <span 
                              key={idx} 
                              className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase border ${
                                s.name === 'VIP Membership Fee' 
                                ? 'bg-slate-50 text-slate-400 border-slate-100 opacity-60' 
                                : 'bg-white text-sky-600 border-sky-100 shadow-sm'
                              }`}
                            >
                              {s.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className={`font-black ${srvPaid > 0 ? 'text-teal-600' : 'text-slate-300'}`}>
                          {formatCurrency(srvPaid)}
                        </div>
                        {hasFee && (
                          <div className="text-[8px] text-slate-400 italic">(-₹200 Membership)</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredEntries.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-20 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Calendar size={32} className="text-slate-200" />
                        <p className="text-slate-400 font-medium italic">No transactions found for this period.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};
