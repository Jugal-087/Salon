import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Trash2, Crown, AlertCircle, Cloud, CloudUpload, Search, Check, ChevronDown, Edit3, Users, User, UserRound, UserRoundSearch, OctagonAlert } from 'lucide-react';
import { Button, Input, Select, Card } from './UI';
import { Entry, Service, ServiceItem, VIPMember } from '../types';
import { calculateVIPStatus, formatCurrency, getTodayISO } from '../services/utils';

interface EntryTabProps {
  services: Service[];
  staff: string[];
  vips: VIPMember[];
  entries: Entry[];
  onSave: (entry: Entry) => void;
  onAddVIP: (vip: VIPMember) => void;
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
        <span className={value ? "text-slate-800" : "text-slate-400"}>
          {value || placeholder}
        </span>
        <ChevronDown size={16} className="text-slate-400" />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-60 flex flex-col">
            <div className="p-2 border-b border-slate-100 bg-slate-50 sticky top-0">
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                    <input 
                        autoFocus
                        type="text"
                        className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-sky-400"
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

export const EntryTab: React.FC<EntryTabProps> = ({ services, staff, vips, entries, onSave, onAddVIP }) => {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [selectedStaff, setSelectedStaff] = useState('');
  const [date, setDate] = useState(getTodayISO());
  const [serviceRows, setServiceRows] = useState<ServiceItem[]>([{ name: '', amount: 0, category: 'Men' }]);
  const [manualDiscount, setManualDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [isEditingTotal, setIsEditingTotal] = useState(false);
  const [tempTotal, setTempTotal] = useState('');
  const [showPhoneSuggestions, setShowPhoneSuggestions] = useState(false);
  
  const phoneWrapperRef = useRef<HTMLDivElement>(null);

  const vipStatus = useMemo(() => calculateVIPStatus(phone, vips), [phone, vips]);
  const existingVip = useMemo(() => vips.find(v => v.phone === phone), [phone, vips]);

  const phoneSuggestions = useMemo(() => {
    if (phone.length < 2) return [];
    return vips.filter(v => v.phone.includes(phone)).slice(0, 5);
  }, [phone, vips]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (phoneWrapperRef.current && !phoneWrapperRef.current.contains(event.target as Node)) {
        setShowPhoneSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [phoneWrapperRef]);

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
    setServiceRows([...serviceRows, { name: '', amount: 0, category: 'Men' }]);
  };

  const handleRemoveRow = (index: number) => {
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
    setServiceRows(newRows);
  };

  const handleAmountChange = (index: number, amount: number) => {
    const newRows = [...serviceRows];
    newRows[index].amount = amount;
    setServiceRows(newRows);
  };

  const calculation = useMemo(() => {
    let subtotal = 0;
    let vipSavings = 0;

    serviceRows.forEach(item => {
        const amt = item.amount || 0;
        subtotal += amt;
        
        // VIP Rule: 20% off ONLY if service amount > 100 AND NOT the membership fee itself
        if (vipStatus === 'active' && amt > 100 && item.name !== 'VIP Membership Fee') {
            vipSavings += amt * 0.20;
        }
    });

    let finalDiscountAmount = 0;
    if (vipStatus === 'active') {
        finalDiscountAmount = vipSavings;
    } else {
        finalDiscountAmount = subtotal * (manualDiscount / 100);
    }

    const totalPaid = Math.max(0, subtotal - finalDiscountAmount);
    return { subtotal, finalDiscountAmount, totalPaid };
  }, [serviceRows, vipStatus, manualDiscount]);

  const handleTotalBlur = () => {
    setIsEditingTotal(false);
    let targetVal = parseFloat(tempTotal);
    if (isNaN(targetVal) || targetVal < 0) return;
    targetVal = Number(targetVal.toFixed(2));
    const { totalPaid } = calculation;
    if (Math.abs(totalPaid - targetVal) < 0.05) return;
    const count = serviceRows.length;
    if (count === 0) return;

    const totalPaidDiff = totalPaid - targetVal;
    const paidDiffPerItem = totalPaidDiff / count;

    const getRate = (item: ServiceItem) => {
        if (item.name === 'VIP Membership Fee') return 1.0; 
        if (vipStatus === 'active') return item.amount > 100 ? 0.8 : 1.0;
        const r = 1 - (manualDiscount / 100);
        return Math.max(0.0001, r);
    };

    let newRows = serviceRows.map(s => {
        const currentRate = getRate(s);
        const currentPaid = s.amount * currentRate;
        const targetPaid = currentPaid - paidDiffPerItem;
        let newRaw = targetPaid / currentRate;
        
        if (vipStatus === 'active' && s.name !== 'VIP Membership Fee') {
            if (s.amount > 100 && newRaw <= 100) newRaw = targetPaid; 
            else if (s.amount <= 100 && newRaw > 100) newRaw = targetPaid / 0.8;
        }
        return { ...s, amount: Math.max(0, newRaw) };
    });

    const currentSumPaid = newRows.reduce((sum, row) => sum + (row.amount * getRate(row)), 0);
    const error = currentSumPaid - targetVal;

    if (Math.abs(error) > 0.001 && newRows.length > 0) {
        const first = newRows[0];
        const firstRate = getRate(first); 
        const firstPaid = first.amount * firstRate;
        const correctFirstPaid = firstPaid - error;
        let correctFirstRaw = correctFirstPaid / firstRate;
        if (vipStatus === 'active' && first.name !== 'VIP Membership Fee') {
             if (first.amount > 100 && correctFirstRaw <= 100) correctFirstRaw = correctFirstPaid;
             else if (first.amount <= 100 && correctFirstRaw > 100) correctFirstRaw = correctFirstPaid / 0.8;
        }
        newRows[0] = { ...first, amount: Math.max(0, correctFirstRaw) };
    }
    newRows = newRows.map(r => ({ ...r, amount: Number(r.amount.toFixed(2)) }));
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
      memberStatus: vipStatus,
      paymentMethod: paymentMethod 
    };

    onSave(newEntry);
    setPhone('');
    setName('');
    setSelectedStaff('');
    setDate(getTodayISO());
    setServiceRows([{ name: '', amount: 0, category: 'Men' }]);
    setManualDiscount(0);
    setPaymentMethod('Cash');
    setShowPhoneSuggestions(false);
  };

  const handleQuickAddVIP = () => {
    if (!phone || !name) return alert("Enter name and phone first");
    const newVip: VIPMember = {
      phone,
      name,
      date: getTodayISO(),
      staff: selectedStaff || 'Unknown'
    };
    onAddVIP(newVip);
    
    if (!serviceRows.some(s => s.name === 'VIP Membership Fee')) {
        setServiceRows(prev => {
            const hasInitialEmpty = prev.length === 1 && !prev[0].name;
            const membershipRow = { name: 'VIP Membership Fee', amount: 200, category: 'Men' as const };
            if (hasInitialEmpty) return [membershipRow];
            return [...prev, membershipRow];
        });
    }
  };

  const todaysEntries = useMemo(() => 
    entries
      .filter(e => e.date === getTodayISO())
      // @ts-ignore
      .sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0)),
    [entries]
  );

  return (
    <div className="space-y-6">
      <Card title="New Entry">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="relative" ref={phoneWrapperRef}>
            <Input 
              label="Phone Number" 
              value={phone} 
              onChange={e => handlePhoneChange(e.target.value)} 
              onFocus={() => setShowPhoneSuggestions(true)}
              placeholder="98765..." 
            />
            {vipStatus === 'active' && (
              <span className="absolute top-0 right-0 mt-1 mr-1 text-xs font-bold text-teal-600 flex items-center gap-1">
                <Crown size={12} /> VIP Member
              </span>
            )}
            {vipStatus === 'expired' && (
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
                        {/* Category Selector Toggle */}
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
                                className={row.name === 'VIP Membership Fee' ? 'bg-slate-50 font-bold' : ''}
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
             {(!existingVip && phone && name) && (
                 <Button variant="secondary" onClick={handleQuickAddVIP} className="bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100">
                    <Crown size={16} className="mr-2" /> Make VIP (+ ₹200)
                 </Button>
             )}
           </div>
           <div className="space-y-3">
             <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-600">Subtotal</label>
                <span className="font-semibold">{formatCurrency(calculation.subtotal)}</span>
             </div>
             
             {vipStatus !== 'active' ? (
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
                    <span className="flex items-center gap-2"><Crown size={14}/> VIP Savings (20% off)</span>
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

             <div className="flex items-center justify-between gap-4">
                <label className="text-sm font-medium text-slate-600 whitespace-nowrap">Payment Method</label>
                <Select 
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                </Select>
             </div>

             <Button onClick={handleSave} className="w-full" disabled={!phone || !name || !selectedStaff}>
                Save Entry
             </Button>
           </div>
        </div>
      </Card>

      <Card title="Today's Entries">
        {todaysEntries.length === 0 ? (
            <p className="text-slate-500 text-sm">No entries yet today.</p>
        ) : (
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600">
                        <tr>
                            <th className="p-3 rounded-tl-lg">Time</th>
                            <th className="p-3">Client</th>
                            <th className="p-3">Services</th>
                            <th className="p-3">Staff</th>
                            <th className="p-3">Method</th>
                            <th className="p-3 text-right">Amount</th>
                            <th className="p-3 rounded-tr-lg w-10">Sync</th>
                        </tr>
                    </thead>
                    <tbody>
                        {todaysEntries.map(entry => (
                            <tr key={entry.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                <td className="p-3 text-slate-500">
                                    {new Date(entry.datetime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </td>
                                <td className="p-3 font-medium">
                                    {entry.name} <br/>
                                    <span className="text-xs text-slate-400">{entry.phone}</span>
                                </td>
                                <td className="p-3 text-slate-600">
                                    <div className="flex flex-wrap gap-1">
                                        {entry.services.map((s, idx) => (
                                            <span key={idx} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${s.category === 'Men' ? 'bg-sky-50 text-sky-600 border border-sky-100' : s.category === 'Women' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-slate-100 text-slate-600'}`}>
                                                {s.name}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                                <td className="p-3 text-slate-600">{entry.staff}</td>
                                <td className="p-3 text-slate-600 text-xs">
                                    <span className="px-2 py-1 bg-slate-100 rounded-md border border-slate-200">
                                        {entry.paymentMethod || 'Cash'}
                                    </span>
                                </td>
                                <td className="p-3 text-right font-bold text-slate-700">{formatCurrency(entry.paid)}</td>
                                <td className="p-3 flex justify-center text-slate-400">
                                    {entry.synced ? (
                                        <span title="Synced to Cloud">
                                            <Cloud size={16} className="text-teal-500" />
                                        </span>
                                    ) : (
                                        <span title="Pending Sync">
                                            <CloudUpload size={16} className="text-orange-400 animate-pulse" />
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
      </Card>
    </div>
  );
};