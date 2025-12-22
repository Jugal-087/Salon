
import React, { useState, useMemo } from 'react';
import { Trash2, Printer, Download, UploadCloud, FileSpreadsheet, FileJson, Users, CreditCard, Scissors, Calendar, User, UserRoundSearch, TrendingUp, BarChart3 } from 'lucide-react';
import { Button, Input, Card, Modal } from './UI';
import { Entry, VIPMember } from '../types';
import { exportToExcel, formatCurrency, getTodayISO, formatDateDisplay, parseJSON, parseExcel, parseExcelDate, batchImportEntries, getMonthlyBounds } from '../services/utils';

interface ReportsTabProps {
  entries: Entry[];
  vips: VIPMember[];
  onDeleteEntry: (id: string | number) => void;
}

export const ReportsTab: React.FC<ReportsTabProps> = ({ entries, vips, onDeleteEntry }) => {
  // Date selector, default to today
  const [selectedDate, setSelectedDate] = useState(getTodayISO());
  const [isImporting, setIsImporting] = useState(false);
  
  // Get YYYY-MM for monthly calculation base
  const selectedMonthStr = useMemo(() => selectedDate.substring(0, 7), [selectedDate]);
  
  // Define the business monthly bounds (25th of prev month to 24th of current)
  const monthlyBounds = useMemo(() => getMonthlyBounds(selectedMonthStr), [selectedMonthStr]);

  // Filter entries for the specific selected date and sort chronologically (oldest to newest, so latest is bottom)
  const filteredEntries = useMemo(() => {
    return entries
      .filter(e => e.date === selectedDate)
      .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
  }, [entries, selectedDate]);

  // Daily Stats with rounding
  const dailyServiceRevenue = useMemo(() => {
    return filteredEntries.reduce((sum, e) => {
      const hasFee = e.services.some(s => s.name === 'VIP Membership Fee');
      const srvPart = Math.ceil(e.paid - (hasFee ? 200 : 0));
      return sum + srvPart;
    }, 0);
  }, [filteredEntries]);

  const dailyMembershipsCount = useMemo(() => {
    return vips.filter(v => v.date === selectedDate).length;
  }, [vips, selectedDate]);

  // Monthly Business Stats (25th to 24th)
  const monthlyPeriodEntries = useMemo(() => {
    return entries.filter(e => e.date >= monthlyBounds.start && e.date <= monthlyBounds.end);
  }, [entries, monthlyBounds]);

  const monthlyVipsCount = useMemo(() => {
    return vips.filter(v => v.date >= monthlyBounds.start && v.date <= monthlyBounds.end).length;
  }, [vips, monthlyBounds]);

  const monthlyServiceRevenue = useMemo(() => {
    return monthlyPeriodEntries.reduce((sum, e) => {
      const hasFee = e.services.some(s => s.name === 'VIP Membership Fee');
      const srvPart = Math.ceil(e.paid - (hasFee ? 200 : 0));
      return sum + srvPart;
    }, 0);
  }, [monthlyPeriodEntries]);

  const monthlyMembershipFeeTotal = useMemo(() => {
    return monthlyPeriodEntries.reduce((sum, e) => {
      const hasFee = e.services.some(s => s.name === 'VIP Membership Fee');
      return sum + (hasFee ? 200 : 0);
    }, 0);
  }, [monthlyPeriodEntries]);

  const handlePrint = () => {
    window.print();
  };

  const handleDelete = (id: string | number) => {
    if (confirm("Delete this entry? This affects revenue calculations.")) {
        onDeleteEntry(id);
    }
  };

  const downloadTemplate = () => {
    const headers = "Date,Name,Phone,Services,Total,Discount,Paid,Method,Staff,Member Status\n";
    const sampleRow = `${getTodayISO()},John Doe,9876543210,"Haircut, Shave",450,10,405,UPI,Asif,active\n`;
    const blob = new Blob([headers + sampleRow], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'import_template.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!confirm("This will upload entries to the cloud database. Continue?")) return;
      setIsImporting(true);
      try {
        let importedData: Entry[] = [];
        if (file.name.endsWith('.json')) {
            importedData = await parseJSON(file);
        } else if (file.name.match(/\.(csv|xlsx|xls)$/i)) {
            const rawData = await parseExcel(file);
            importedData = rawData.map((row: any) => {
                const get = (keys: string[]) => {
                    for (const k of keys) {
                        if (row[k] !== undefined) return row[k];
                        const found = Object.keys(row).find(rk => rk.toLowerCase() === k.toLowerCase());
                        if (found) return row[found];
                    }
                    return undefined;
                };
                const dateStr = parseExcelDate(get(['Date', 'date', 'datetime']));
                const paidAmountRaw = Number(get(['Paid', 'Amount', 'paid', 'amount']) || 0);
                const paidAmount = Math.ceil(paidAmountRaw); // Properly round UP on import
                const totalAmount = Number(get(['Total', 'total']) || paidAmount);
                const serviceStr = String(get(['Services', 'Service', 'services']) || 'Imported Service');
                const status = String(get(['Member Status', 'Status', 'member status', 'status']) || 'normal').toLowerCase();
                let validStatus: 'active' | 'expired' | 'normal' = 'normal';
                if (status.includes('active') || status.includes('vip')) validStatus = 'active';
                else if (status.includes('expired')) validStatus = 'expired';
                return {
                    id: '', 
                    date: dateStr,
                    datetime: new Date(dateStr).toISOString(),
                    phone: String(get(['Phone', 'phone', 'Mobile']) || ''),
                    name: String(get(['Name', 'Client', 'name', 'client', 'Customer']) || 'Unknown'),
                    staff: String(get(['Staff', 'staff']) || 'Admin'),
                    services: [{ name: serviceStr, amount: totalAmount, category: 'Men' }],
                    total: totalAmount,
                    discount: Number(get(['Discount', 'discount']) || 0),
                    paid: paidAmount,
                    memberStatus: validStatus,
                    paymentMethod: String(get(['Method', 'Payment Method', 'payment method', 'Mode']) || 'Cash'),
                    migrated: true
                } as Entry;
            }).filter(e => e.paid >= 0 && (e.phone || e.name !== 'Unknown'));
        }
        if (Array.isArray(importedData) && importedData.length > 0) {
            await batchImportEntries(importedData);
            alert(`Successfully queued ${importedData.length} entries for upload.`);
        } else {
            alert("No valid entries found or file format incorrect.");
        }
      } catch (err) {
        console.error(err);
        alert("Error importing data. Check console for details.");
      } finally {
        setIsImporting(false);
        e.target.value = '';
      }
    }
  };

  const ReportTable = ({ title, data, total, subtitle, rangeLabel }: { title: string, data: Entry[], total: number, subtitle?: string, rangeLabel?: string }) => (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border-slate-300 print:rounded-none">
        <div className="p-6 print:p-2 border-b border-slate-100 print:border-slate-300 flex justify-between items-center bg-slate-50/50 print:bg-white">
            <div className="flex flex-col">
                <h2 className="text-xl print:text-sm font-bold text-slate-800">{title}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                    {rangeLabel && (
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-200 print:bg-slate-100 text-slate-700 rounded text-[10px] print:text-[8px] font-bold uppercase tracking-tight">
                            <Calendar size={10} className="print:w-2 print:h-2" /> {rangeLabel}
                        </div>
                    )}
                    {subtitle && <p className="text-xs print:text-[8px] text-slate-500">{subtitle}</p>}
                </div>
            </div>
            <div className="text-right">
                <div className="text-xs print:text-[8px] text-slate-400 font-semibold uppercase tracking-widest">Service Revenue</div>
                <div className="text-2xl print:text-lg font-black text-teal-600">{formatCurrency(total)}</div>
            </div>
        </div>
        
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm print:text-[8pt]">
                <thead className="bg-slate-50 print:bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 print:border-slate-300">
                    <tr>
                        <th className="p-4 print:p-1.5">Time</th>
                        <th className="p-4 print:p-1.5">Client</th>
                        <th className="p-4 print:p-1.5">Services</th>
                        <th className="p-4 print:p-1.5">Staff</th>
                        <th className="p-4 print:p-1.5">Mode</th>
                        <th className="p-4 print:p-1.5 text-right">Disc</th>
                        <th className="p-4 print:p-1.5 text-right">Service Paid</th>
                        <th className="p-4 text-center no-print">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                    {data.map(e => {
                        const hasFee = e.services.some(s => s.name === 'VIP Membership Fee');
                        const srvPaid = Math.ceil(e.paid - (hasFee ? 200 : 0));
                        
                        return (
                            <tr key={e.id} className={`hover:bg-slate-50/50 transition-colors ${hasFee ? 'bg-sky-50/30' : ''}`}>
                                <td className="p-4 print:p-1.5 text-slate-500 print:text-slate-700">
                                    <div className="font-bold">{new Date(e.datetime).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}</div>
                                    <div className="text-xs print:text-[7pt] text-slate-400">{formatDateDisplay(e.date)}</div>
                                </td>
                                <td className="p-4 print:p-1.5 font-medium">
                                    {e.name}
                                    <div className="text-xs print:text-[7pt] text-slate-400 font-normal">{e.phone}</div>
                                </td>
                                <td className="p-4 print:p-1.5 text-slate-600">
                                    <div className="flex flex-col gap-0.5 print:flex-row print:flex-wrap print:gap-1">
                                        {e.services.map((s, idx) => (
                                            <div key={idx} className="flex items-center gap-1 print:gap-0.5">
                                                {s.name === 'VIP Membership Fee' ? (
                                                    <Users size={12} className="text-sky-500 print:w-2 print:h-2" />
                                                ) : s.category === 'Women' ? (
                                                    <UserRoundSearch size={10} className="text-rose-400 print:w-2 print:h-2" />
                                                ) : (
                                                    <User size={10} className="text-sky-400 print:w-2 print:h-2" />
                                                )}
                                                <span className="text-xs print:text-[7pt]">{s.name}{idx < e.services.length - 1 ? <span className="hidden print:inline">,</span> : ''}</span>
                                            </div>
                                        ))}
                                    </div>
                                </td>
                                <td className="p-4 print:p-1.5 text-slate-600">{e.staff}</td>
                                <td className="p-4 print:p-1.5 text-slate-600 text-xs print:text-[7pt]">
                                    <span className="px-2 py-1 bg-slate-100 rounded-md border border-slate-200 print:border-none print:bg-transparent print:p-0">
                                        {e.paymentMethod || 'Cash'}
                                    </span>
                                </td>
                                <td className="p-4 print:p-1.5 text-right text-slate-500">{e.discount > 0 ? `${e.discount}%` : '-'}</td>
                                <td className="p-4 print:p-1.5 text-right font-bold text-slate-800">{formatCurrency(srvPaid)}</td>
                                <td className="p-4 text-center no-print">
                                    <button onClick={() => handleDelete(e.id)} className="text-slate-300 hover:text-red-500 transition-colors p-2">
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                    {data.length === 0 && (
                        <tr><td colSpan={8} className="p-12 text-center text-slate-400">No transactions found for this day.</td></tr>
                    )}
                </tbody>
                <tfoot className="bg-slate-50 print:bg-white font-bold text-slate-800 border-t border-slate-200 print:border-slate-300">
                    <tr>
                        <td colSpan={6} className="p-4 print:p-1.5 text-right uppercase tracking-widest text-[10px]">Service Revenue Total</td>
                        <td className="p-4 print:p-1.5 text-right text-teal-700 text-lg print:text-sm">{formatCurrency(total)}</td>
                        <td className="no-print"></td>
                    </tr>
                </tfoot>
            </table>
        </div>
    </div>
  );

  return (
    <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 no-print">
            <Card title="Financial Performance" className="h-fit">
                <div className="space-y-6">
                    <div>
                        <Input 
                            label="Filter by Date" 
                            type="date" 
                            value={selectedDate} 
                            onChange={e => setSelectedDate(e.target.value)} 
                        />
                    </div>

                    <div className="space-y-4">
                        {/* Daily Summary */}
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                <Calendar size={12} /> Daily Stats ({formatDateDisplay(selectedDate)})
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="p-3 bg-teal-50 rounded-xl border border-teal-100">
                                    <p className="text-[9px] font-bold text-teal-600 uppercase mb-1">Service Revenue</p>
                                    <p className="text-base font-black text-teal-800">{formatCurrency(dailyServiceRevenue)}</p>
                                </div>
                                <div className="p-3 bg-sky-50 rounded-xl border border-sky-100">
                                    <p className="text-[9px] font-bold text-sky-600 uppercase mb-1">New VIPs</p>
                                    <p className="text-base font-black text-sky-800">{dailyMembershipsCount}</p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                    <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Entries</p>
                                    <p className="text-base font-black text-slate-800">{filteredEntries.length}</p>
                                </div>
                            </div>
                        </div>

                        {/* Monthly Summary */}
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                <BarChart3 size={12} /> Monthly Stats ({formatDateDisplay(monthlyBounds.start)} to {formatDateDisplay(monthlyBounds.end)})
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="p-3 bg-slate-800 rounded-xl text-white">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Monthly Service Revenue</p>
                                    <p className="text-lg font-black text-white">{formatCurrency(monthlyServiceRevenue)}</p>
                                    <p className="text-[9px] text-slate-500 mt-1 italic">Excl. {formatCurrency(monthlyMembershipFeeTotal)} Membership Fees</p>
                                </div>
                                <div className="p-3 bg-white rounded-xl border-2 border-slate-100 flex items-center justify-between">
                                    <div>
                                        <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Monthly Memberships</p>
                                        <p className="text-lg font-black text-slate-800">{monthlyVipsCount}</p>
                                    </div>
                                    <TrendingUp size={24} className="text-teal-500 opacity-20" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                        <Button onClick={handlePrint} variant="secondary" className="w-full">
                            <Printer size={18} className="mr-2" /> Print Daily Report
                        </Button>
                        <Button onClick={() => exportToExcel(filteredEntries, `Report_${selectedDate}`)} variant="ghost" className="w-full">
                            <Download size={18} className="mr-2" /> Export Excel
                        </Button>
                    </div>
                </div>
            </Card>

            <Card title="Data Management" className="h-fit">
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <p className="text-sm text-slate-500">Import/Export Templates</p>
                        <Button size="sm" variant="secondary" onClick={downloadTemplate}>
                            <FileSpreadsheet size={14} className="mr-1" /> Template CSV
                        </Button>
                    </div>
                    <label className={`flex items-center justify-center w-full px-4 py-8 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${isImporting ? 'bg-slate-100 border-slate-300' : 'border-sky-200 bg-sky-50 hover:bg-sky-100'}`}>
                        <div className="text-center">
                            <UploadCloud className={`mx-auto h-8 w-8 mb-2 ${isImporting ? 'text-slate-400 animate-bounce' : 'text-sky-500'}`} />
                            <span className="text-sm font-semibold text-slate-600">
                                {isImporting ? 'Uploading...' : 'Import Data (JSON/CSV/Excel)'}
                            </span>
                        </div>
                        <input type="file" className="hidden" accept=".json,.csv,.xlsx,.xls" onChange={handleImport} disabled={isImporting} />
                    </label>
                </div>
            </Card>
        </div>

        <div>
            <ReportTable 
                title={`Daily Transaction Report`} 
                rangeLabel={formatDateDisplay(selectedDate)}
                subtitle={`Daily Summary: ${dailyMembershipsCount} memberships, ${filteredEntries.length} entries`}
                data={filteredEntries}
                total={dailyServiceRevenue}
            />
        </div>
    </div>
  );
};
