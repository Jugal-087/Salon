import React, { useState, useMemo } from 'react';
import { Trash2, Printer, Download, UploadCloud } from 'lucide-react';
import { Button, Input, Card } from './UI';
import { Entry } from '../types';
import { exportToExcel, formatCurrency, getTodayISO, formatDateDisplay, parseJSON, batchImportEntries } from '../services/utils';

interface ReportsTabProps {
  entries: Entry[];
  onDeleteEntry: (id: string | number) => void;
}

export const ReportsTab: React.FC<ReportsTabProps> = ({ entries, onDeleteEntry }) => {
  const [selectedDate, setSelectedDate] = useState(getTodayISO());
  const [isImporting, setIsImporting] = useState(false);

  const filteredEntries = useMemo(() => {
    return entries.filter(e => e.date === selectedDate);
  }, [entries, selectedDate]);

  const totalRevenue = useMemo(() => filteredEntries.reduce((sum, e) => sum + e.paid, 0), [filteredEntries]);

  const handlePrint = () => {
    window.print();
  };

  const handleDelete = (id: string | number) => {
    if (confirm("Delete this entry? This affects revenue calculations.")) {
        onDeleteEntry(id);
    }
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
        } else {
            alert("Please select a valid JSON backup file.");
            return;
        }

        if (Array.isArray(importedData)) {
            await batchImportEntries(importedData);
            alert(`Successfully queued ${importedData.length} entries for upload.`);
        } else {
            alert("Invalid file format. Expected an array of entries.");
        }
      } catch (err) {
        console.error(err);
        alert("Error importing data.");
      } finally {
        setIsImporting(false);
      }
    }
  };

  return (
    <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 no-print">
            <Card title="Report Controls" className="h-fit">
                <div className="space-y-4">
                    <Input 
                        label="Select Date" 
                        type="date" 
                        value={selectedDate} 
                        onChange={e => setSelectedDate(e.target.value)} 
                    />
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-sm text-slate-500 mb-1">Total Revenue ({formatDateDisplay(selectedDate)})</p>
                        <p className="text-2xl font-bold text-teal-600">{formatCurrency(totalRevenue)}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                        <Button onClick={handlePrint} variant="secondary">
                            <Printer size={18} className="mr-2" /> Print Report
                        </Button>
                        <Button onClick={() => exportToExcel(filteredEntries, `Report_${selectedDate}`)} variant="ghost">
                            <Download size={18} className="mr-2" /> Export Excel
                        </Button>
                    </div>
                </div>
            </Card>

            <Card title="Data Management" className="h-fit">
                <div className="space-y-4">
                    <p className="text-sm text-slate-500">
                        Import historical data from a JSON backup. Duplicate IDs will be ignored or assigned new cloud IDs.
                    </p>
                    <label className={`flex items-center justify-center w-full px-4 py-8 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${isImporting ? 'bg-slate-100 border-slate-300' : 'border-sky-200 bg-sky-50 hover:bg-sky-100'}`}>
                        <div className="text-center">
                            <UploadCloud className={`mx-auto h-8 w-8 mb-2 ${isImporting ? 'text-slate-400 animate-bounce' : 'text-sky-500'}`} />
                            <span className="text-sm font-semibold text-slate-600">
                                {isImporting ? 'Uploading...' : 'Import JSON Backup'}
                            </span>
                        </div>
                        <input type="file" className="hidden" accept=".json" onChange={handleImport} disabled={isImporting} />
                    </label>
                </div>
            </Card>
        </div>

        {/* Printable Area */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border-0">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-xl font-bold text-slate-800">Daily Report: {formatDateDisplay(selectedDate)}</h2>
                <span className="print:hidden text-sm text-slate-500">Found {filteredEntries.length} entries</span>
            </div>
            
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                        <th className="p-4">Time</th>
                        <th className="p-4">Client</th>
                        <th className="p-4">Services</th>
                        <th className="p-4">Staff</th>
                        <th className="p-4 text-right">Discount</th>
                        <th className="p-4 text-right">Total</th>
                        <th className="p-4 text-center no-print">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredEntries.map(e => (
                        <tr key={e.id}>
                            <td className="p-4 text-slate-500">
                                {new Date(e.datetime).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}
                            </td>
                            <td className="p-4 font-medium">
                                {e.name} <br/>
                                <span className="text-xs text-slate-400">{e.phone}</span>
                                {e.memberStatus === 'active' && <span className="ml-2 text-xs text-teal-600 font-bold">VIP</span>}
                            </td>
                            <td className="p-4 text-slate-600">
                                {e.services.map(s => `${s.name} (${formatCurrency(s.amount)})`).join(', ')}
                            </td>
                            <td className="p-4 text-slate-600">{e.staff}</td>
                            <td className="p-4 text-right text-slate-500">{e.discount > 0 ? `${e.discount}%` : '-'}</td>
                            <td className="p-4 text-right font-bold text-slate-800">{formatCurrency(e.paid)}</td>
                            <td className="p-4 text-center no-print">
                                <button onClick={() => handleDelete(e.id)} className="text-red-400 hover:text-red-600">
                                    <Trash2 size={16} />
                                </button>
                            </td>
                        </tr>
                    ))}
                    {filteredEntries.length === 0 && (
                        <tr><td colSpan={7} className="p-8 text-center text-slate-500">No entries for this date.</td></tr>
                    )}
                </tbody>
                <tfoot className="bg-slate-50 font-bold text-slate-800 border-t border-slate-200">
                    <tr>
                        <td colSpan={5} className="p-4 text-right">Total Day Revenue</td>
                        <td className="p-4 text-right text-teal-700 text-lg">{formatCurrency(totalRevenue)}</td>
                        <td className="no-print"></td>
                    </tr>
                </tfoot>
            </table>
        </div>
    </div>
  );
};