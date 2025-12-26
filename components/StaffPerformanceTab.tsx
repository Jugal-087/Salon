import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, User, Scissors, TrendingUp, Clock, AlertCircle, Award, Target } from 'lucide-react';
import { Card, Input } from './UI';
import { Entry, VIPMember } from '../types';
import { formatCurrency, formatDateDisplay, getMonthlyBounds, getTodayISO } from '../services/utils';

interface StaffPerformanceTabProps {
  staff: string[];
  entries: Entry[];
  vips: VIPMember[];
}

export const StaffPerformanceTab: React.FC<StaffPerformanceTabProps> = ({ staff, entries, vips }) => {
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayISO());

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

  // Use business cycle bounds (25th to 24th) based on the month of the selected date
  const bounds = useMemo(() => {
    const monthStr = selectedDate.substring(0, 7); // YYYY-MM
    return getMonthlyBounds(monthStr);
  }, [selectedDate]);

  // Filter entries for the SPECIFIC selected date for the transaction table
  const tableEntries = useMemo(() => {
    if (!selectedStaff) return [];
    
    const searchName = selectedStaff.trim().toLowerCase();
    
    return entries
      .filter(e => {
        const entryStaff = (e.staff || '').trim().toLowerCase();
        return entryStaff === searchName && e.date === selectedDate;
      })
      .sort((a, b) => {
        // Robust numeric comparison for times (Newest First)
        const getTimestamp = (e: any) => {
          if (e.timestamp) return e.timestamp;
          if (e.datetime) return new Date(e.datetime).getTime();
          return new Date(e.date).getTime();
        };
        return getTimestamp(b) - getTimestamp(a);
      });
  }, [entries, selectedStaff, selectedDate]);

  // Daily stats for the selected staff on the selected date
  const dailyStats = useMemo(() => {
    if (!selectedStaff) return { revenue: 0, count: 0 };
    return tableEntries.reduce((acc, e) => {
      const hasFee = e.services.some(s => s.name === 'VIP Membership Fee');
      const srvPaid = Math.max(0, Math.ceil(e.paid - (hasFee ? 200 : 0)));
      acc.revenue += srvPaid;
      acc.count += e.services.filter(s => s.name !== 'VIP Membership Fee').length;
      return acc;
    }, { revenue: 0, count: 0 });
  }, [tableEntries, selectedStaff]);

  // Calculate monthly stats based on the cycle bounds
  const monthlyStats = useMemo(() => {
    if (!selectedStaff) return { totalRevenue: 0, serviceCount: 0, membershipsCount: 0 };
    
    const searchName = selectedStaff.trim().toLowerCase();
    
    // Performance entries for the entire monthly period
    const periodEntries = entries.filter(e => {
      const entryStaff = (e.staff || '').trim().toLowerCase();
      const isInRange = e.date >= bounds.start && e.date <= bounds.end;
      return entryStaff === searchName && isInRange;
    });

    // Count memberships from the VIP table for the period
    const membershipsFromTable = vips.filter(v => {
      const vStaff = (v.staff || '').trim().toLowerCase();
      return vStaff === searchName && v.date >= bounds.start && v.date <= bounds.end;
    }).length;

    return periodEntries.reduce((acc, e) => {
        const hasFee = e.services.some(s => s.name === 'VIP Membership Fee');
        // Exclude the fixed 200 membership fee from performance revenue
        const srvPaid = Math.max(0, Math.ceil(e.paid - (hasFee ? 200 : 0)));
        
        acc.totalRevenue += srvPaid;
        // Count actual services performed, excluding the membership fee item
        acc.serviceCount += e.services.filter(s => s.name !== 'VIP Membership Fee').length;
        
        return acc;
    }, { totalRevenue: 0, serviceCount: 0, membershipsCount: membershipsFromTable });
  }, [entries, vips, selectedStaff, bounds]);

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
                ? 'bg-white border-slate-800 text-slate-800 shadow-md translate-y-[-2px]'
                : 'bg-white border-transparent text-slate-600 hover:bg-slate-50 hover:border-slate-200'
              }`}
            >
              <User size={18} className={isActive ? 'text-sky-500' : 'text-slate-400'} />
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
                label="Selected Work Date" 
                type="date" 
                value={selectedDate} 
                onChange={e => setSelectedDate(e.target.value)} 
              />

              {/* Daily Summary Block */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-1">
                  <Target size={12} className="text-amber-500" /> Daily Summary ({formatDateDisplay(selectedDate)})
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100 text-center">
                    <p className="text-[9px] font-bold text-amber-600 uppercase mb-0.5">Revenue</p>
                    <p className="text-base font-black text-slate-800">{formatCurrency(dailyStats.revenue)}</p>
                  </div>
                  <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100 text-center">
                    <p className="text-[9px] font-bold text-amber-600 uppercase mb-0.5">Services</p>
                    <p className="text-base font-black text-slate-800">{dailyStats.count}</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-1">
                  <TrendingUp size={12} className="text-sky-500" /> Monthly Summary ({selectedStaff})
                </p>
                
                {/* Revenue Card - Simplified Styling */}
                <div className="p-4 bg-white rounded-2xl border-2 border-slate-100 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Monthly Service Revenue</p>
                  <p className="text-2xl font-black text-slate-800">{formatCurrency(monthlyStats.totalRevenue)}</p>
                  <p className="text-[9px] text-slate-400 mt-1 italic">Excludes all Membership Fees</p>
                </div>

                {/* Services Count Card */}
                <div className="p-4 bg-white rounded-2xl border-2 border-slate-100 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Monthly Total Services</p>
                    <p className="text-2xl font-black text-slate-800">{monthlyStats.serviceCount}</p>
                  </div>
                  <div className="p-3 bg-sky-50 rounded-xl text-sky-500">
                    <Scissors size={24} />
                  </div>
                </div>

                {/* Membership Count Card */}
                <div className="p-4 bg-white rounded-2xl border-2 border-slate-100 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Monthly Memberships Sold</p>
                    <p className="text-2xl font-black text-slate-800">{monthlyStats.membershipsCount}</p>
                  </div>
                  <div className="p-3 bg-teal-50 rounded-xl text-teal-500">
                    <Award size={24} />
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                 <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Monthly Period Bounds</p>
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
             <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Daily History for {formatDateDisplay(selectedDate)}</h3>
             <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Entries Found:</span>
                <span className="text-xs font-black px-3 py-1 bg-sky-500 text-white rounded-full shadow-sm ring-4 ring-sky-500/10">
                  {tableEntries.length} Records
                </span>
             </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-white text-slate-400 font-bold uppercase text-[10px] border-b border-slate-50">
                <tr>
                  <th className="p-4">Time</th>
                  <th className="p-4">Client Details</th>
                  <th className="p-4">Work Performed</th>
                  <th className="p-4 text-right">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {tableEntries.map((entry) => {
                  const hasFee = entry.services.some(s => s.name === 'VIP Membership Fee');
                  const srvPaid = Math.max(0, Math.ceil(entry.paid - (hasFee ? 200 : 0)));
                  
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="p-4">
                        <div className="text-[11px] text-slate-700 font-bold flex items-center gap-1">
                          <Clock size={12} className="text-black" /> {new Date(entry.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-[9px] text-slate-400">{formatDateDisplay(entry.date)}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-black">{entry.name}</div>
                        <div className="text-[11px] text-slate-400 tracking-tight">{entry.phone}</div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1.5">
                          {entry.services.map((s, idx) => (
                            <span 
                              key={idx} 
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                s.name === 'VIP Membership Fee' 
                                ? 'bg-slate-50 text-slate-400 border border-slate-100 opacity-60' 
                                : s.category === 'Men' ? 'bg-sky-50 text-sky-600 border border-sky-100' : 'bg-rose-50 text-rose-600 border-rose-100'
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
                {tableEntries.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-20 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Calendar size={32} className="text-black" />
                        <p className="text-slate-400 font-medium italic">No staff entries found for this specific date.</p>
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