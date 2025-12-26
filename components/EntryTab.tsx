import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Trash2, Crown, AlertCircle, Cloud, CloudUpload, Search, Check, ChevronDown, Edit3, Users, User, UserRound, UserRoundSearch, OctagonAlert, RefreshCw, FileText, Download, Printer, Scissors, Calendar, Eye, X, Banknote, CreditCard } from 'lucide-react';
import { Button, Input, Select, Card, Modal } from './UI';
import { Entry, Service, ServiceItem, VIPMember } from '../types';
import { calculateVIPStatus, formatCurrency, getTodayISO, formatDateDisplay } from '../services/utils';

interface EntryTabProps {
  services: Service[];
  staff: string[];
  vips: VIPMember[];
  entries: Entry[];
  onSave: (entry: Entry) => void;
  onAddVIP: (vip: VIPMember) => void;
  onDeleteEntry: (id: string | number) => void;
  counterCash?: number;
  onUpdateCounterCash?: (val: number) => void;
}

const SearchableSelect = ({ 
  options, 
  value, 
  onChange, 
  placeholder = "Select..." 
}: { 
  options: Service[], 
  value: string, 
  onChange: (val: string) => void,
  placeholder?: string 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  useEffect(() => {
    if (isOpen) setSearchTerm('');
  }, [isOpen]);

  const filteredOptions = options.filter(opt => 
    opt.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div 
        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 cursor-pointer flex justify-between items-center focus-within:ring-2 focus-within:ring-sky-500/20 focus-within:border-sky-500"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={value ? "text-slate-800 font-bold" : "text-slate-400"}>
          {value || placeholder}
        </span>
        <ChevronDown size={16} className="text-slate-400" />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-60 flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="p-2 border-b border-slate-100 bg-white sticky top-0">
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                    <input 
                        autoFocus
                        type="text"
                        className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-sky-400 bg-white text-slate-900"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onClick={(e) => e.stopPropagation()} 
                    />
                </div>
            </div>
            <div className="overflow-y-auto flex-grow">
                {filteredOptions.length > 0 ? (
                    filteredOptions.map((opt) => (
                        <div 
                            key={opt.name}
                            className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-sky-50 flex justify-between items-center ${opt.name === value ? 'bg-sky-50 text-sky-700 font-medium' : 'text-slate-700'}`}
                            onClick={() => {
                                onChange(opt.name);
                                setIsOpen(false);
                            }}
                        >
                            <span>{opt.name}</span>
                            {opt.name === value && <Check size={14} />}
                        </div>
                    ))
                ) : (
                    <div className="px-4 py-3 text-sm text-slate-400 text-center">No services found</div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

export const EntryTab: React.FC<EntryTabProps> = ({ services, staff, vips, entries, onSave, onAddVIP, onDeleteEntry, counterCash = 0, onUpdateCounterCash }) => {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [selectedStaff, setSelectedStaff] = useState('');
  const [date, setDate] = useState(getTodayISO());
  const [serviceRows, setServiceRows] = useState<ServiceItem[]>([{ name: '', amount: 0, category: 'Men' }]);
  const [manualDiscount, setManualDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('UPI'); // UPI as default
  const [isEditingTotal, setIsEditingTotal] = useState(false);
  const [tempTotal, setTempTotal] = useState('');
  const [showPhoneSuggestions, setShowPhoneSuggestions] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  
  const phoneWrapperRef = useRef<HTMLDivElement>(null);

  const vipStatus = useMemo(() => calculateVIPStatus(phone, vips), [phone, vips]);
  const existingVip = useMemo(() => vips.find(v => v.phone === phone), [phone, vips]);

  const phoneSuggestions = useMemo(() => {
    if (phone.length < 2) return [];
    return vips.filter(v => v.phone.includes(phone)).slice(0, 5);
  }, [phone, vips]);

  // Fix: Replaced 'setIsOpen' with 'setShowPhoneSuggestions' to correctly handle click-outside for phone suggestions.
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowPhoneSuggestions(false);
      }
    }
    const wrapperRef = phoneWrapperRef; // Ref to capture
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (phone.length > 3) {
      const lastEntry = [...entries]
        .filter(e => e.phone === phone)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      
      if (lastEntry) setName(lastEntry.name);
      else if (existingVip) setName(existingVip.name);
    }
  }, [phone, entries, existingVip]);

  const handlePhoneChange = (val: string) => {
    setPhone(val);
    setShowPhoneSuggestions(true);
  };

  const selectPhoneSuggestion = (vip: VIPMember) => {
    setPhone(vip.phone);
    setName(vip.name);
    setShowPhoneSuggestions(false);
  };

  const handleAddRow = () => {
    setServiceRows(prev => [...prev, { name: '', amount: 0, category: 'Men' }]);
  };

  const handleRemoveRow = (index: number) => {
    if (serviceRows.length === 1) {
        setServiceRows([{ name: '', amount: 0, category: 'Men' }]);
        return;
    }
    const newRows = [...serviceRows];
    newRows.splice(index, 1);
    setServiceRows(newRows);
  };

  const handleCategoryToggle = (index: number) => {
    const newRows = [...serviceRows];
    const newCategory = newRows[index].category === 'Men' ? 'Women' : 'Men';
    newRows[index] = { ...newRows[index], category: newCategory, name: '', amount: 0 };
    setServiceRows(newRows);
  };

  const handleServiceChange = (index: number, serviceName: string) => {
    const newRows = [...serviceRows];
    const service = services.find(s => s.name === serviceName && s.category === newRows[index].category);
    newRows[index] = { 
      ...newRows[index],
      name: serviceName, 
      amount: service ? service.amount : 0 
    };
    
    if (serviceName && index === serviceRows.length - 1) {
        setServiceRows([...newRows, { name: '', amount: 0, category: 'Men' }]);
    } else {
        setServiceRows(newRows);
    }
  };

  const handleAmountChange = (index: number, amount: number) => {
    const newRows = [...serviceRows];
    newRows[index].amount = amount;
    setServiceRows(newRows);
  };

  const calculation = useMemo(() => {
    let subtotal = 0;
    let vipSavings = 0;
    const isBecomingVIP = serviceRows.some(s => s.name === 'VIP Membership Fee');
    const effectivelyVIP = vipStatus === 'active' || isBecomingVIP;

    serviceRows.forEach(item => {
        const amt = item.amount || 0;
        subtotal += amt;
        
        if (effectivelyVIP && amt > 100 && item.name !== 'VIP Membership Fee') {
            vipSavings += amt * 0.20;
        }
    });

    let finalDiscountAmount = 0;
    if (effectivelyVIP) {
        finalDiscountAmount = vipSavings;
    } else {
        finalDiscountAmount = subtotal * (manualDiscount / 100);
    }

    const totalPaidRaw = Math.max(0, subtotal - finalDiscountAmount);
    const totalPaid = Math.ceil(totalPaidRaw);
    
    return { subtotal, finalDiscountAmount, totalPaid, isBecomingVIP };
  }, [serviceRows, vipStatus, manualDiscount]);

  const handleTotalBlur = () => {
    setIsEditingTotal(false);
    let targetVal = parseFloat(tempTotal);
    if (isNaN(targetVal) || targetVal < 0) return;
    targetVal = Math.ceil(targetVal); 
    
    const currentCalculation = calculation;
    const effectivelyVIP = vipStatus === 'active' || currentCalculation.isBecomingVIP;

    if (Math.abs(currentCalculation.totalPaid - targetVal) < 0.1) return;

    const validRows = serviceRows.filter(s => s.name);
    if (validRows.length === 0) return;

    const getRate = (item: ServiceItem) => {
        if (item.name === 'VIP Membership Fee') return 1.0; 
        if (effectivelyVIP) return item.amount > 100 ? 0.8 : 1.0;
        const r = 1 - (manualDiscount / 100);
        return Math.max(0.0001, r);
    };

    const count = validRows.length;
    const paidDiffTotal = currentCalculation.totalPaid - targetVal;
    const paidDiffPerItem = paidDiffTotal / count;

    let newRows = serviceRows.map(s => {
        if (!s.name) return s;
        const currentRate = getRate(s);
        const currentPaid = s.amount * currentRate;
        const targetPaidItem = currentPaid - paidDiffPerItem;
        let newAmount = targetPaidItem / currentRate;
        
        if (effectivelyVIP && s.name !== 'VIP Membership Fee') {
            if (s.amount > 100 && newAmount <= 100) newAmount = targetPaidItem; 
            else if (s.amount <= 100 && newAmount > 100) newAmount = targetPaidItem / 0.8;
        }
        return { ...s, amount: Math.ceil(Math.max(0, newAmount)) };
    });

    const calculateCurrentTotalPaid = (rows: ServiceItem[]) => {
      let sub = 0;
      let savings = 0;
      rows.forEach(item => {
          if (!item.name) return;
          const amt = item.amount || 0;
          sub += amt;
          if (effectivelyVIP && amt > 100 && item.name !== 'VIP Membership Fee') {
              savings += amt * 0.20;
          }
      });
      let disc = 0;
      if (effectivelyVIP) disc = savings;
      else disc = sub * (manualDiscount / 100);
      return Math.ceil(Math.max(0, sub - disc));
    };

    let attempts = 0;
    const firstIdx = newRows.findIndex(r => r.name);
    if (firstIdx !== -1) {
        while (attempts < 500) {
            const currentTotal = calculateCurrentTotalPaid(newRows);
            if (currentTotal === targetVal) break;
            
            if (currentTotal > targetVal) {
                newRows[firstIdx].amount = Math.max(0, newRows[firstIdx].amount - 1);
            } else {
                newRows[firstIdx].amount = newRows[firstIdx].amount + 1;
            }
            attempts++;
        }
    }

    setServiceRows(newRows);
  };

  const handleSave = () => {
    if (!phone || !name || !selectedStaff) {
      alert("Please fill in Phone, Name and Staff.");
      return;
    }
    const validServices = serviceRows.filter(s => s.name && s.amount > 0);
    if (validServices.length === 0) {
      alert("Please add at least one valid service.");
      return;
    }

    if (calculation.isBecomingVIP) {
      const newVip: VIPMember = {
        phone,
        name,
        date: getTodayISO(),
        staff: selectedStaff || 'Unknown'
      };
      onAddVIP(newVip);
    }

    const newEntry: Entry = {
      id: '', 
      date,
      datetime: new Date().toISOString(),
      phone,
      name,
      staff: selectedStaff,
      services: validServices,
      total: calculation.subtotal,
      discount: calculation.subtotal > 0 ? Number(((calculation.finalDiscountAmount / calculation.subtotal) * 100).toFixed(2)) : 0,
      paid: calculation.totalPaid,
      memberStatus: vipStatus === 'active' || calculation.isBecomingVIP ? 'active' : (vipStatus === 'expired' ? 'expired' : 'normal'),
      paymentMethod: paymentMethod 
    };

    onSave(newEntry);
    setPhone('');
    setName('');
    setSelectedStaff('');
    setDate(getTodayISO());
    setServiceRows([{ name: '', amount: 0, category: 'Men' }]);
    setManualDiscount(0);
    setPaymentMethod('UPI');
    setShowPhoneSuggestions(false);
  };

  const handleQuickAddVIP = () => {
    if (!phone || !name) return alert("Enter name and phone first");
    setServiceRows(prev => {
        const filtered = prev.filter(s => s.name);
        const membershipRow = { name: 'VIP Membership Fee', amount: 200, category: 'Men' as const };
        if (filtered.some(s => s.name === 'VIP Membership Fee')) return prev;
        return [membershipRow, ...filtered, { name: '', amount: 0, category: 'Men' as const }];
    });
  };

  const handleDeleteEntry = (id: string | number) => {
    if (confirm("Are you sure you want to delete this transaction? This action cannot be undone.")) {
      onDeleteEntry(id);
    }
  };

  const todaysEntries = useMemo(() => 
    entries
      .filter(e => e.date === getTodayISO())
      // @ts-ignore
      .sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0)),
    [entries]
  );

  const todaysStats = useMemo(() => {
    return todaysEntries.reduce((acc, e) => {
        const hasFee = e.services.some(s => s.name === 'VIP Membership Fee');
        const srvPaid = Math.ceil(e.paid - (hasFee ? 200 : 0));
        acc.serviceTotal += srvPaid;
        acc.grandTotal += e.paid;
        acc.membershipTotal += (hasFee ? 200 : 0);
        if (e.paymentMethod === 'Cash') {
          acc.cashTotal += e.paid;
          acc.cashSrvTotal += srvPaid;
        } else if (e.paymentMethod === 'UPI' || e.paymentMethod === 'Card') {
          acc.upiCardServiceTotal += srvPaid;
        }
        return acc;
    }, { serviceTotal: 0, grandTotal: 0, cashTotal: 0, membershipTotal: 0, upiCardServiceTotal: 0, cashSrvTotal: 0 });
  }, [todaysEntries]);

  const handleViewDailyReport = () => {
    if (todaysEntries.length === 0) return alert("No entries yet today.");
    setIsPreviewModalOpen(true);
  };

  const effectivelyVIPNow = vipStatus === 'active' || calculation.isBecomingVIP;

  return (
    <div className="space-y-6">
      <Modal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        title="Daily Report Preview"
        size="7xl"
        footer={
            <div className="flex justify-between w-full">
                <Button variant="ghost" onClick={() => setIsPreviewModalOpen(false)}>Close Preview</Button>
                <Button onClick={() => window.print()}>
                    <Printer size={18} className="mr-2" /> Print / Save PDF
                </Button>
            </div>
        }
      >
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3 sticky top-0 z-10 bg-white pb-2">
                <div className="bg-white p-3 rounded-xl border-t-4 border-t-slate-400 border border-slate-200 shadow-sm flex flex-col justify-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Report Date</p>
                    <p className="text-sm font-black text-slate-800">{formatDateDisplay(getTodayISO())}</p>
                </div>
                <div className="bg-white p-3 rounded-xl border-t-4 border-t-teal-500 border border-slate-200 shadow-sm flex flex-col justify-center">
                    <div className="flex items-center gap-1.5 mb-1">
                        <Scissors size={14} className="text-teal-500" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-teal-600">Service Revenue</p>
                    </div>
                    <p className="text-xl font-black text-slate-800">{formatCurrency(todaysStats.serviceTotal)}</p>
                </div>
                <div className="bg-white p-3 rounded-xl border-t-4 border-t-sky-500 border border-slate-200 shadow-sm flex flex-col justify-center">
                    <div className="flex items-center gap-1.5 mb-1">
                        <Users size={14} className="text-sky-500" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-sky-600">Membership Fees</p>
                    </div>
                    <p className="text-xl font-black text-slate-800">{formatCurrency(todaysStats.membershipTotal)}</p>
                </div>
                <div className="bg-white p-3 rounded-xl border-t-4 border-t-amber-500 border border-slate-200 shadow-sm flex flex-col justify-center">
                    <div className="flex items-center gap-1.5 mb-1">
                        <Banknote size={14} className="text-amber-500" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Entries Cash</p>
                    </div>
                    <p className="text-xl font-black text-slate-800">{formatCurrency(todaysStats.cashSrvTotal)}</p>
                </div>
                <div className="bg-white p-3 rounded-xl border-t-4 border-t-indigo-500 border border-slate-200 shadow-sm flex flex-col justify-center">
                    <div className="flex items-center gap-1.5 mb-1">
                        <CreditCard size={14} className="text-indigo-500" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">UPI + Card Srv</p>
                    </div>
                    <p className="text-xl font-black text-slate-800">{formatCurrency(todaysStats.upiCardServiceTotal)}</p>
                </div>
                <div className="bg-white p-3 rounded-xl border-t-4 border-t-orange-500 border border-slate-200 shadow-sm flex flex-col justify-center">
                    <div className="flex items-center gap-1.5 mb-1">
                        <Banknote size={14} className="text-orange-500" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-orange-600">Counter Cash</p>
                    </div>
                    <p className="text-xl font-black text-slate-800">{formatCurrency(counterCash)}</p>
                </div>
            </div>

            <div className="overflow-hidden border border-slate-200 rounded-xl bg-white shadow-sm">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3 w-32 whitespace-nowrap">Client Name</th>
                    <th className="p-3 w-28 whitespace-nowrap">Phone Number</th>
                    <th className="p-3 whitespace-nowrap">Services</th>
                    <th className="p-3 w-24 text-center whitespace-nowrap">Staff</th>
                    <th className="p-3 w-24 whitespace-nowrap">Method</th>
                    <th className="p-3 text-right w-32 whitespace-nowrap">Amount Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {todaysEntries.map((e, idx) => {
                      const hasFee = e.services.some(s => s.name === 'VIP Membership Fee');
                      const srvPaid = Math.ceil(e.paid - (hasFee ? 200 : 0));
                      return (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                              <td className="p-3 font-bold text-black align-top">
                                  {e.name}
                              </td>
                              <td className="p-3 text-slate-500 align-top font-medium">
                                  {e.phone}
                              </td>
                              <td className="p-3 align-top">
                                  <div className="flex flex-wrap gap-1.5 items-center">
                                      {e.services.map((s, i) => (
                                          <span key={i} className={`whitespace-nowrap px-2 py-0.5 rounded-lg text-xs font-bold border ${s.name === 'VIP Membership Fee' ? 'bg-sky-50 text-sky-700 border-sky-100' : 'bg-slate-50 text-slate-600 border-slate-100'}`}>
                                              {s.name}
                                          </span>
                                      ))}
                                  </div>
                              </td>
                              <td className="p-3 align-top text-center text-slate-600 font-bold">
                                  {e.staff}
                              </td>
                              <td className="p-3 align-top">
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-tight ${e.paymentMethod === 'Cash' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-sky-50 text-sky-700 border-sky-100'}`}>
                                      {e.paymentMethod}
                                  </span>
                              </td>
                              <td className="p-3 text-right align-top font-black text-slate-800">
                                  {formatCurrency(srvPaid)}
                              </td>
                          </tr>
                      );
                  })}
                </tbody>
              </table>
            </div>
        </div>
      </Modal>

      <Card title="New Entry" className="no-print">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="relative" ref={phoneWrapperRef}>
            <Input 
              label="Phone Number" 
              value={phone} 
              onChange={e => handlePhoneChange(e.target.value)} 
              onFocus={() => setShowPhoneSuggestions(true)}
              placeholder="98765..." 
            />
            {effectivelyVIPNow && (
              <span className="absolute top-0 right-0 mt-1 mr-1 text-xs font-bold text-teal-600 flex items-center gap-1">
                <Crown size={12} /> {calculation.isBecomingVIP && !existingVip ? 'New VIP' : 'VIP Member'}
              </span>
            )}
            {vipStatus === 'expired' && !calculation.isBecomingVIP && (
              <span className="absolute top-0 right-0 mt-1 mr-1 text-xs font-bold text-rose-600 flex items-center gap-1 animate-pulse">
                <OctagonAlert size={12} /> VIP Expired
              </span>
            )}

            {showPhoneSuggestions && phoneSuggestions.length > 0 && (
                <div className="absolute z-[60] w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {phoneSuggestions.map((vip) => {
                        const s = calculateVIPStatus(vip.phone, vips);
                        return (
                            <div 
                                key={vip.phone}
                                className="px-4 py-3 hover:bg-sky-50 cursor-pointer flex items-center justify-between border-b border-slate-50 last:border-0"
                                onClick={() => selectPhoneSuggestion(vip)}
                            >
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-slate-800">{vip.phone}</span>
                                        {s === 'expired' && <span className="text-[9px] font-black text-rose-600 uppercase tracking-tighter">[EXPIRED]</span>}
                                    </div>
                                    <span className="text-xs text-slate-500">{vip.name}</span>
                                </div>
                                <div className={`flex items-center gap-1 px-1.5 py-0.5 border rounded text-[10px] font-black uppercase ${s === 'active' ? 'bg-teal-50 text-teal-600 border-teal-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                    <Crown size={10} /> {s === 'active' ? 'VIP' : 'EXPIRED'}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
          </div>
          <Input 
            label="Client Name" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            placeholder="Client Name" 
          />
          <Select 
            label="Staff" 
            value={selectedStaff} 
            onChange={e => setSelectedStaff(e.target.value)}
          >
            <option value="">Select Staff</option>
            {staff.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Input 
            label="Date" 
            type="date" 
            value={date} 
            onChange={e => setDate(e.target.value)} 
          />
        </div>

        <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-semibold text-slate-600">Services</label>
                <Button size="sm" variant="ghost" onClick={handleAddRow}><Plus size={16} /> Add Service</Button>
            </div>
            <div className="space-y-3">
                {serviceRows.map((row, index) => (
                    <div key={index} className={`flex gap-3 items-center p-2 rounded-lg transition-colors ${row.name === 'VIP Membership Fee' ? 'bg-sky-50 border border-sky-100 shadow-sm' : 'bg-slate-50/50'}`}>
                        <div className="flex shrink-0">
                           <button
                             onClick={() => handleCategoryToggle(index)}
                             disabled={row.name === 'VIP Membership Fee'}
                             className={`flex items-center gap-2 px-3 py-2.5 rounded-xl font-bold text-xs transition-all border ${
                               row.category === 'Men' 
                               ? 'bg-sky-100 text-sky-700 border-sky-200' 
                               : 'bg-rose-100 text-rose-700 border-rose-200'
                             } ${row.name === 'VIP Membership Fee' ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
                           >
                              {row.category === 'Men' ? <User size={14} /> : <UserRoundSearch size={14} />}
                              {row.category}
                           </button>
                        </div>

                        <div className="flex-grow">
                             {row.name === 'VIP Membership Fee' ? (
                                <div className="px-4 py-2.5 font-bold text-sky-700 flex items-center gap-2">
                                    <Users size={16}/> VIP Membership Fee
                                </div>
                             ) : (
                                <SearchableSelect 
                                    value={row.name} 
                                    options={services.filter(s => s.category === row.category)}
                                    onChange={val => handleServiceChange(index, val)}
                                    placeholder={`Select ${row.category} Service`}
                                />
                             )}
                        </div>
                        <div className="w-32">
                             <Input 
                                type="number" 
                                value={row.amount || ''} 
                                readOnly={row.name === 'VIP Membership Fee'}
                                onChange={e => handleAmountChange(index, parseFloat(e.target.value))}
                                placeholder="0.00"
                                className={row.name === 'VIP Membership Fee' ? 'bg-slate-50 font-bold text-sky-700' : ''}
                            />
                        </div>
                        <button 
                            onClick={() => handleRemoveRow(index)}
                            className="text-slate-400 hover:text-red-500 p-2"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                ))}
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end border-t border-slate-100 pt-6">
           <div className="flex gap-4">
             {phone.length >= 10 && name.trim().length > 0 && !effectivelyVIPNow && (
                 <Button 
                    variant="secondary" 
                    onClick={handleQuickAddVIP} 
                    className="bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 shadow-sm"
                 >
                    {vipStatus === 'expired' ? (
                        <><RefreshCw size={16} className="mr-2" /> Renew VIP (+ ₹200)</>
                    ) : (
                        <><Crown size={16} className="mr-2" /> Make VIP (+ ₹200)</>
                    )}
                 </Button>
             )}
           </div>
           <div className="space-y-3">
             <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-600">Subtotal</label>
                <span className="font-semibold">{formatCurrency(calculation.subtotal)}</span>
             </div>
             
             {!effectivelyVIPNow ? (
                <div className="flex items-center justify-between gap-4">
                    <label className="text-sm font-medium text-slate-600">Manual Discount (%)</label>
                    <Input 
                        type="number" 
                        className="w-24 text-right" 
                        value={manualDiscount} 
                        onChange={e => setManualDiscount(parseFloat(e.target.value) || 0)} 
                    />
                </div>
             ) : (
                <div className="flex items-center justify-between text-teal-600 bg-teal-50 px-3 py-2 rounded-lg text-sm">
                    <span className="flex items-center gap-2">
                        <Crown size={14}/> 
                        {calculation.isBecomingVIP ? 'New VIP Savings (20% on services)' : 'VIP Savings (20% off)'}
                    </span>
                    <span className="font-bold">-{formatCurrency(calculation.finalDiscountAmount)}</span>
                </div>
             )}

             <div 
                className="flex items-center justify-between text-lg font-bold text-teal-700 bg-teal-50 p-3 rounded-xl border border-teal-100 cursor-pointer hover:bg-teal-100/50 transition-colors"
                onClick={() => {
                    setTempTotal(calculation.totalPaid.toString());
                    setIsEditingTotal(true);
                }}
                title="Click to manually edit Total"
             >
                <span className="flex items-center gap-2">
                    Total to Pay
                    {!isEditingTotal && <Edit3 size={14} className="text-teal-400 opacity-50" />}
                </span>
                {isEditingTotal ? (
                    <input 
                        type="number" 
                        value={tempTotal}
                        onChange={(e) => setTempTotal(e.target.value)}
                        onBlur={handleTotalBlur}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleTotalBlur(); }}
                        className="w-32 text-right px-2 py-1 rounded-lg border border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold text-teal-800 bg-white"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <span>{formatCurrency(calculation.totalPaid)}</span>
                )}
             </div>

             <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600 whitespace-nowrap block">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                    {['UPI', 'Cash', 'Card'].map(method => (
                        <button
                            key={method}
                            type="button"
                            onClick={() => setPaymentMethod(method)}
                            className={`py-3 px-4 rounded-xl border-2 font-bold text-sm transition-all duration-200 ${
                                paymentMethod === method 
                                ? 'bg-sky-50 border-sky-500 text-sky-700 shadow-sm translate-y-[-1px]' 
                                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                            }`}
                        >
                            {method}
                        </button>
                    ))}
                </div>
             </div>

             <Button onClick={handleSave} className="w-full" disabled={!phone || !name || !selectedStaff}>
                Save Entry
             </Button>
           </div>
        </div>
      </Card>

      <Card className="no-print !p-0 overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Today's Transactions</h3>
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-3 bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm transition-all hover:border-amber-300">
                    <Banknote size={18} className="text-amber-500" />
                    <label className="text-xs font-bold text-slate-500 uppercase whitespace-nowrap">Counter Cash:</label>
                    <input 
                        type="number"
                        value={counterCash || ''}
                        onChange={(e) => onUpdateCounterCash?.(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-24 text-right font-black text-slate-800 focus:outline-none text-sm bg-transparent"
                    />
                </div>
                <Button size="sm" variant="secondary" onClick={handleViewDailyReport} className="h-10 border-sky-400 text-sky-600 hover:bg-sky-50 px-4">
                    <Eye size={16} className="mr-2 text-black" /> View Report
                </Button>
            </div>
        </div>
        
        {todaysEntries.length === 0 ? (
            <p className="p-8 text-slate-400 text-sm italic text-center">No entries yet today.</p>
        ) : (
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-black tracking-wider">
                        <tr>
                            <th className="p-3 w-20 whitespace-nowrap">Time</th>
                            <th className="p-3 w-32 whitespace-nowrap">Client Name</th>
                            <th className="p-3 w-24 whitespace-nowrap">Phone</th>
                            <th className="p-3 whitespace-nowrap">Services Performed</th>
                            <th className="p-3 w-24 whitespace-nowrap text-center">Staff</th>
                            <th className="p-3 w-16 whitespace-nowrap text-center">Method</th>
                            <th className="p-3 text-right w-24 whitespace-nowrap">Amount</th>
                            <th className="p-3 text-center w-12 whitespace-nowrap">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {todaysEntries.map(entry => {
                            const hasMembership = entry.services.some(s => s.name === 'VIP Membership Fee');
                            const serviceOnlyPaid = Math.ceil(hasMembership ? entry.paid - 200 : entry.paid);
                            
                            return (
                                <tr key={entry.id} className="last:border-0 hover:bg-slate-50 transition-colors">
                                    <td className="p-3 text-slate-500 whitespace-nowrap text-[11px] font-medium">
                                        {new Date(entry.datetime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </td>
                                    <td className="p-3 font-bold text-slate-800 truncate">
                                        {entry.name}
                                    </td>
                                    <td className="p-3 text-slate-900 font-black whitespace-nowrap tracking-tight text-xs">
                                        {entry.phone}
                                    </td>
                                    <td className="p-3 text-slate-600">
                                        <div className="flex flex-wrap gap-1">
                                            {entry.services.map((s, idx) => (
                                                <span key={idx} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${s.category === 'Men' ? 'bg-sky-50 text-sky-600 border border-sky-100' : s.category === 'Women' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-slate-100 text-slate-600'}`}>
                                                    {s.name}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="p-3 text-slate-600 font-bold text-center text-xs whitespace-nowrap">{entry.staff}</td>
                                    <td className="p-3 text-slate-600 text-center">
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] border font-black uppercase ${entry.paymentMethod === 'Cash' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-sky-50 text-sky-700 border-sky-100'}`}>
                                            {entry.paymentMethod || 'Cash'}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right font-black text-slate-800 whitespace-nowrap text-xs">{formatCurrency(serviceOnlyPaid)}</td>
                                    <td className="p-3 text-center">
                                      <button 
                                          onClick={() => handleDeleteEntry(entry.id)} 
                                          className="text-slate-300 hover:text-red-500 transition-colors p-1"
                                          title="Delete Entry"
                                      >
                                          <Trash2 size={16} />
                                      </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        )}
      </Card>
    </div>
  );
};