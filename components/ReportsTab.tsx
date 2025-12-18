
import React, { useState, useMemo } from 'react';
import { Trash2, Printer, Download, UploadCloud, FileSpreadsheet, FileJson, Users, CreditCard, Scissors, Calendar, User, UserRoundSearch } from 'lucide-react';
import { Button, Input, Card, Modal } from './UI';
import { Entry, VIPMember } from '../types';
import { exportToExcel, formatCurrency, getTodayISO, formatDateDisplay, parseJSON, parseExcel, parseExcelDate, batchImportEntries, getCycleBounds } from '../services/utils';

interface ReportsTabProps {
  entries: Entry[];
  vips: VIPMember[];
  onDeleteEntry: (id: string | number) => void;
}

export const ReportsTab: React.FC<ReportsTabProps> = ({ entries, vips, onDeleteEntry }) => {
  const [selectedMonth, setSelectedMonth] = useState(getTodayISO().substring(0, 7));
  const [isImporting, setIsImporting] = useState(false);
  const [isDailyModalOpen, setIsDailyModalOpen] = useState(false);
  const [selectedDailyDate, setSelectedDailyDate] = useState(getTodayISO());
  const [printMode, setPrintMode] = useState<'monthly' | 'daily'>('monthly');

  // Cycle Range: 25th of last month to 24th of this month
  const cycleRange = useMemo(() => {
    const { start, end } = getCycleBounds(selectedMonth);
    return {
      start,
      end,
      startLabel: formatDateDisplay(start),
      endLabel: formatDateDisplay(end)
    };
  }, [selectedMonth]);

  // Filter entries within [start, end] inclusive
  const filteredEntries = useMemo(() => {
    return entries.filter(e => e.date >= cycleRange.start && e.date <= cycleRange.end);
  }, [entries, cycleRange]);

  const filteredDailyEntries = useMemo(() => {
    return entries.filter(e => e.date === selectedDailyDate);
  }, [entries, selectedDailyDate]);

  const newMemberships = useMemo(() => {
    return vips.filter(v => v.date >= cycleRange.start && v.date <= cycleRange.end);
  }, [vips, cycleRange]);

  const totalRevenue = useMemo(() => filteredEntries.reduce((sum, e) => sum + e.paid, 0), [filteredEntries]);
  const membershipRevenue = useMemo(() => newMemberships.length * 200, [newMemberships]);
  const serviceRevenue = useMemo(() => totalRevenue - membershipRevenue, [totalRevenue, membershipRevenue]);
  const dailyRevenue = useMemo(() => filteredDailyEntries.reduce((sum, e) => sum + e.paid, 0), [filteredDailyEntries]);

  const handlePrintMonthly = () => {
    setPrintMode('monthly');
    setTimeout(() => { window.print(); }, 100);
  };

  const handlePrintDailyAction = () => {
    setPrintMode('daily');
    setIsDailyModalOpen(false);
    setTimeout(() => { window.print(); }, 100);
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
                const paidAmount = Number(get(['Paid', 'Amount', 'paid', 'amount']) || 0);
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
                    services: [{ name: serviceStr, amount: totalAmount, category: 'Men' }], // Import defaults to Men
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

  const monthLabel = useMemo(() => {
    const [year, month] = selectedMonth.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  }, [selectedMonth]);

  const ReportTable = ({ title, data, total, subtitle, rangeLabel }: { title: string, data: Entry[], total: number, subtitle?: string, rangeLabel?: string }) => (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border-0">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div className="flex flex-col">
                <h2 className="text-xl font-bold text-slate-800">{title}</h2>
                {rangeLabel && (
                    <div className="inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px] font-bold uppercase tracking-tight">
                        <Calendar size={10} /> Cycle: {rangeLabel}
                    </div>
                )}
                {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
            </div>
            <div className="text-right">
                <div className="text-xs text-slate-400 font-semibold uppercase tracking-widest">Grand Total</div>
                <div className="text-2xl font-black text-teal-600">{formatCurrency(total)}</div>
            </div>
        </div>
        
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                        <th className="p-4">Date & Time</th>
                        <th className="p-4">Client</th>
                        <th className="p-4">Services</th>
                        <th className="p-4">Staff</th>
                        <th className="p-4">Method</th>
                        <th className="p-4 text-right">Discount</th>
                        <th className="p-4 text-right">Paid</th>
                        <th className="p-4 text-center no-print">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {data.map(e => (
                        <tr key={e.id} className={`hover:bg-slate-50/50 transition-colors ${e.services.some(s => s.name === 'VIP Membership Fee') ? 'bg-sky-50/30' : ''}`}>
                            <td className="p-4 text-slate-500">
                                <div className="font-medium text-slate-700">{formatDateDisplay(e.date)}</div>
                                <div className="text-xs">{new Date(e.datetime).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}</div>
                            </td>
                            <td className="p-4 font-medium">
                                {e.name} <br/>
                                <span className="text-xs text-slate-400">{e.phone}</span>
                                {e.memberStatus === 'active' && <span className="ml-2 text-[10px] text-teal-600 font-bold border border-teal-200 px-1 rounded">VIP</span>}
                            </td>
                            <td className="p-4 text-slate-600">
                                <div className="flex flex-col gap-1">
                                    {e.services.map((s, idx) => (
                                        <div key={idx} className="flex items-center gap-1.5">
                                            {s.name === 'VIP Membership Fee' ? (
                                                <Users size={12} className="text-sky-500" />
                                            ) : s.category === 'Women' ? (
                                                <UserRoundSearch size={10} className="text-rose-400" />
                                            ) : (
                                                <User size={10} className="text-sky-400" />
                                            )}
                                            <span className="text-xs">{s.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </td>
                            <td className="p-4 text-slate-600">{e.staff}</td>
                            <td className="p-4 text-slate-600 text-xs">
                                <span className="px-2 py-1 bg-slate-100 rounded-md border border-slate-200">
                                    {e.paymentMethod || 'Cash'}
                                </span>
                            </td>
                            <td className="p-4 text-right text-slate-500">{e.discount > 0 ? `${e.discount}%` : '-'}</td>
                            <td className="p-4 text-right font-bold text-slate-800">{formatCurrency(e.paid)}</td>
                            <td className="p-4 text-center no-print">
                                <button onClick={() => handleDelete(e.id)} className="text-slate-300 hover:text-red-500 transition-colors p-2">
                                    <Trash2 size={16} />
                                </button>
                            </td>
                        </tr>
                    ))}
                    {data.length === 0 && (
                        <tr><td colSpan={8} className="p-12 text-center text-slate-400">No transactions found for this period.</td></tr>
                    )}
                </tbody>
                <tfoot className="bg-slate-50 font-bold text-slate-800 border-t border-slate-200">
                    <tr>
                        <td colSpan={6} className="p-4 text-right">Cycle Total</td>
                        <td className="p-4 text-right text-teal-700 text-lg">{formatCurrency(total)}</td>
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
            <Card title="Report Controls" className="h-fit">
                <div className="space-y-4">
                    <div>
                        <Input 
                            label="Target Month Cycle" 
                            type="month" 
                            value={selectedMonth} 
                            onChange={e => setSelectedMonth(e.target.value)} 
                        />
                        <p className="text-[10px] text-slate-400 mt-1 font-medium italic">
                            Report covers: {cycleRange.startLabel} to {cycleRange.endLabel} (Inclusive)
                        </p>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-4 bg-teal-50 rounded-xl border border-teal-100">
                            <div className="flex items-center gap-2 mb-1">
                                <CreditCard size={14} className="text-teal-600" />
                                <p className="text-[10px] font-bold text-teal-700 uppercase tracking-wider">Total Cycle Revenue</p>
                            </div>
                            <p className="text-lg font-bold text-teal-800">{formatCurrency(totalRevenue)}</p>
                        </div>
                        <div className="p-4 bg-sky-50 rounded-xl border border-sky-100">
                            <div className="flex items-center gap-2 mb-1">
                                <Users size={14} className="text-sky-600" />
                                <p className="text-[10px] font-bold text-sky-700 uppercase tracking-wider">Memberships ({newMemberships.length})</p>
                            </div>
                            <p className="text-lg font-bold text-sky-800">{formatCurrency(membershipRevenue)}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-2 mb-1">
                                <Scissors size={14} className="text-slate-600" />
                                <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Service Only</p>
                            </div>
                            <p className="text-lg font-bold text-slate-800">{formatCurrency(serviceRevenue)}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Button onClick={handlePrintMonthly} variant="secondary">
                            <Printer size={18} className="mr-2" /> Print Cycle Report
                        </Button>
                        <Button onClick={() => setIsDailyModalOpen(true)} variant="ghost" className="border-sky-500 text-sky-600">
                            <Calendar size={18} className="mr-2" /> Print Daily Report
                        </Button>
                        <Button onClick={() => exportToExcel(filteredEntries, `Cycle_Report_${selectedMonth}`)} variant="ghost" className="sm:col-span-2">
                            <Download size={18} className="mr-2" /> Export Excel (Cycle)
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

        <div className={printMode === 'daily' ? 'print:hidden' : ''}>
            <ReportTable 
                title={`Salon Cycle Report: ${monthLabel}`} 
                rangeLabel={`${cycleRange.startLabel} to ${cycleRange.endLabel}`}
                subtitle={`Summary: ${newMemberships.length} new memberships, ${filteredEntries.length} total entries`}
                data={filteredEntries}
                total={totalRevenue}
            />
        </div>

        <div className={`hidden print:block ${printMode === 'monthly' ? 'print:hidden' : ''}`}>
            <ReportTable 
                title={`Daily Transaction Report`} 
                rangeLabel={formatDateDisplay(selectedDailyDate)}
                subtitle={`Generated on ${new Date().toLocaleString()}`}
                data={filteredDailyEntries}
                total={dailyRevenue}
            />
        </div>

        <Modal
            isOpen={isDailyModalOpen}
            onClose={() => setIsDailyModalOpen(false)}
            title="Select Date for Daily Report"
            footer={
                <>
                    <Button variant="ghost" onClick={() => setIsDailyModalOpen(false)}>Cancel</Button>
                    <Button onClick={handlePrintDailyAction}>
                        <Printer size={18} className="mr-2" /> Print to PDF
                    </Button>
                </>
            }
        >
            <div className="space-y-4">
                <p className="text-sm text-slate-500">Choose a specific date to generate and print a one-day transaction report.</p>
                <Input 
                    label="Target Date" 
                    type="date" 
                    value={selectedDailyDate} 
                    onChange={e => setSelectedDailyDate(e.target.value)}
                    autoFocus
                />
                <div className="p-4 bg-sky-50 rounded-xl border border-sky-100 flex justify-between items-center">
                    <span className="text-sm font-medium text-sky-700">Estimated Transactions:</span>
                    <span className="font-bold text-sky-800">{filteredDailyEntries.length}</span>
                </div>
            </div>
        </Modal>
    </div>
  );
};
