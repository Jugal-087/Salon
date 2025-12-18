import React, { useState, useMemo } from 'react';
import { Search, Download, Upload, Trash2, Edit2, Cloud, CloudUpload, UserPlus, Save, RefreshCw, CheckCircle2, AlertCircle, Users2 } from 'lucide-react';
import { Button, Input, Select, Card, Modal } from './UI';
import { VIPMember } from '../types';
import { exportToExcel, parseExcel, getTodayISO, formatDateDisplay, calculateVIPStatus, parseExcelDate } from '../services/utils';

interface MembershipTabProps {
  vips: VIPMember[];
  staff: string[];
  onUpdate: (vips: VIPMember[]) => void;
  onDeleteVIP?: (phone: string) => void;
}

export const MembershipTab: React.FC<MembershipTabProps> = ({ vips, staff, onUpdate, onDeleteVIP }) => {
  // Inline Form State
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [date, setDate] = useState(getTodayISO());
  const [selectedStaff, setSelectedStaff] = useState('');

  // Modal State (for editing existing members via list action)
  const [editingVip, setEditingVip] = useState<Partial<VIPMember> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Stats
  const stats = useMemo(() => {
    const active = vips.filter(v => calculateVIPStatus(v.phone, vips) === 'active').length;
    const expired = vips.filter(v => calculateVIPStatus(v.phone, vips) === 'expired').length;
    return { total: vips.length, active, expired };
  }, [vips]);

  // Filter list based on phone input (acting as search)
  const filteredVips = useMemo(() => {
    const term = phone.toLowerCase();
    const list = vips.filter(v => v.phone.toLowerCase().includes(term) || v.name.toLowerCase().includes(term));
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [vips, phone]);

  const handleAddMember = () => {
    if (!phone || !name || !selectedStaff) {
        alert("Please enter Phone, Name, and select Staff.");
        return;
    }

    const existingIndex = vips.findIndex(v => v.phone === phone);
    if (existingIndex >= 0) {
        if (!confirm("A member with this phone number already exists. Update their details?")) return;
    }

    const newVip: VIPMember = {
        phone,
        name,
        date,
        staff: selectedStaff
    };

    const newVips = [...vips];
    if (existingIndex >= 0) {
        newVips[existingIndex] = newVip;
    } else {
        newVips.push(newVip);
    }
    
    newVips.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    onUpdate(newVips);
    
    setPhone('');
    setName('');
    setDate(getTodayISO());
    setSelectedStaff('');
  };

  const handleRenew = (vip: VIPMember) => {
    if (confirm(`Renew membership for ${vip.name}? This will update Join Date to today.`)) {
        const updatedVips = vips.map(v => 
            v.phone === vip.phone 
            ? { ...v, date: getTodayISO(), staff: selectedStaff || v.staff } 
            : v
        );
        onUpdate(updatedVips);
    }
  };

  const handleSaveEditedVip = () => {
    if (!editingVip?.phone || !editingVip?.name) return;
    
    const newVip = editingVip as VIPMember;
    const existsIndex = vips.findIndex(v => v.phone === newVip.phone);
    
    let newVips = [...vips];
    if (existsIndex >= 0) {
      newVips[existsIndex] = newVip;
    } else {
      newVips.push(newVip);
    }
    
    newVips.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    onUpdate(newVips);
    setIsModalOpen(false);
    setEditingVip(null);
  };

  const handleDelete = (phoneToDelete: string) => {
    if (confirm("Are you sure you want to remove this VIP member?")) {
      if (onDeleteVIP) {
          onDeleteVIP(phoneToDelete);
      } else {
          onUpdate(vips.filter(v => v.phone !== phoneToDelete));
      }
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (file) {
        try {
            const data = await parseExcel(file);
            const importedVips: VIPMember[] = [];
            data.forEach((row: any) => {
                const get = (keys: string[]) => {
                    for (const k of keys) {
                        if (row[k] !== undefined) return row[k];
                        const found = Object.keys(row).find(rk => rk.toLowerCase() === k.toLowerCase());
                        if (found) return row[found];
                    }
                    return undefined;
                };

                const p = String(get(['Phone', 'phone', 'Mobile']) || '');
                const n = String(get(['Name', 'name', 'Client', 'Customer']) || '');
                const rawDate = get(['Date', 'date', 'Join Date', 'Joined', 'Registration Date']);
                
                if (p && n) {
                    let parsedDate = parseExcelDate(rawDate);
                    importedVips.push({
                        phone: p, 
                        name: n, 
                        date: parsedDate,
                        staff: String(get(['Staff', 'staff', 'Admin', 'By']) || 'Imported')
                    });
                }
            });

            const merged = [...vips];
            importedVips.forEach(iv => {
                const idx = merged.findIndex(v => v.phone === iv.phone);
                if (idx >= 0) merged[idx] = iv;
                else merged.push(iv);
            });
            onUpdate(merged);
            alert(`Imported ${importedVips.length} VIPs.`);
        } catch (err) {
            console.error(err);
            alert("Error importing VIPs");
        }
     }
  };

  const openEditModal = (vip: VIPMember) => {
    setEditingVip({...vip});
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-4">
        {/* Compact Membership Dashboard Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-slate-400 p-3 flex items-center gap-3">
                <div className="p-2 bg-slate-50 rounded-lg text-slate-500">
                    <Users2 size={18} />
                </div>
                <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-none mb-1">Total Members</p>
                    <p className="text-xl font-black text-slate-800 leading-none">{stats.total}</p>
                </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-teal-500 p-3 flex items-center gap-3">
                <div className="p-2 bg-teal-50 rounded-lg text-teal-500">
                    <CheckCircle2 size={18} />
                </div>
                <div>
                    <p className="text-[10px] font-bold text-teal-600 uppercase tracking-wider leading-none mb-1">Active Members</p>
                    <p className="text-xl font-black text-slate-800 leading-none">{stats.active}</p>
                </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-rose-500 p-3 flex items-center gap-3">
                <div className="p-2 bg-rose-50 rounded-lg text-rose-500">
                    <AlertCircle size={18} />
                </div>
                <div>
                    <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider leading-none mb-1">Expired Members</p>
                    <p className="text-xl font-black text-slate-800 leading-none">{stats.expired}</p>
                </div>
            </div>
        </div>

        <Card title="Manage Membership">
            {/* Inline Add/Search Form */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="md:col-span-3">
                    <Input 
                        label="Phone (Search & Add)" 
                        value={phone} 
                        onChange={e => setPhone(e.target.value)} 
                        placeholder="Enter Phone..." 
                    />
                </div>
                <div className="md:col-span-3">
                    <Input 
                        label="Client Name" 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        placeholder="Client Name" 
                    />
                </div>
                <div className="md:col-span-2">
                    <Input 
                        label="Join Date" 
                        type="date"
                        value={date} 
                        onChange={e => setDate(e.target.value)} 
                    />
                </div>
                <div className="md:col-span-2">
                    <Select
                        label="Registered By"
                        value={selectedStaff}
                        onChange={e => setSelectedStaff(e.target.value)}
                    >
                        <option value="">Select Staff</option>
                        {staff.map(s => <option key={s} value={s}>{s}</option>)}
                    </Select>
                </div>
                <div className="md:col-span-2">
                    <Button onClick={handleAddMember} className="w-full" disabled={!phone || !name || !selectedStaff}>
                        <UserPlus size={18} className="mr-2" /> Add/Save
                    </Button>
                </div>
            </div>

            {/* Utility Bar */}
            <div className="flex justify-end gap-2 mb-4">
                 <Button variant="secondary" size="sm" onClick={() => exportToExcel(vips, `VIP_List_${formatDateDisplay(getTodayISO())}`)}>
                    <Download size={16} className="mr-2" /> Export
                 </Button>
                 <label className="inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 px-3 py-1.5 text-xs bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm cursor-pointer">
                    <Upload size={16} className="mr-2" /> Import
                    <input type="file" className="hidden" accept=".csv,.xlsx" onChange={handleImport} />
                </label>
            </div>

            {/* List */}
            <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-700 font-semibold">
                        <tr>
                            <th className="p-4">Phone</th>
                            <th className="p-4">Name</th>
                            <th className="p-4">Join Date</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">By Staff</th>
                            <th className="p-4">Sync</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {filteredVips.map((vip) => {
                            const status = calculateVIPStatus(vip.phone, vips);
                            return (
                                <tr key={vip.phone} className="hover:bg-slate-50">
                                    <td className="p-4 font-medium text-slate-600">
                                        {vip.phone}
                                    </td>
                                    <td className="p-4 font-bold text-slate-800">{vip.name}</td>
                                    <td className="p-4 text-slate-500">{formatDateDisplay(vip.date)}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-black tracking-tight ${status === 'active' ? 'bg-teal-100 text-teal-700' : 'bg-rose-100 text-rose-700'}`}>
                                            {status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="p-4 text-slate-500">{vip.staff}</td>
                                    <td className="p-4 text-slate-400">
                                        {vip.synced ? (
                                            <Cloud size={16} className="text-teal-500" />
                                        ) : (
                                            <CloudUpload size={16} className="text-orange-400 animate-pulse" />
                                        )}
                                    </td>
                                    <td className="p-4 text-right flex justify-end gap-1">
                                        {status === 'expired' && (
                                            <button 
                                                onClick={() => handleRenew(vip)}
                                                className="text-teal-600 hover:bg-teal-50 p-2 rounded-lg transition-colors flex items-center gap-1 font-bold text-xs"
                                                title="Renew Membership"
                                            >
                                                <RefreshCw size={14} /> Renew
                                            </button>
                                        )}
                                        <button onClick={() => openEditModal(vip)} className="text-sky-500 hover:bg-sky-50 p-2 rounded-lg transition-colors">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(vip.phone)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                         {filteredVips.length === 0 && (
                            <tr><td colSpan={7} className="p-8 text-center text-slate-500">
                                {phone ? 'No members found matching search. Fill details above to add.' : 'No members found.'}
                            </td></tr>
                        )}
                    </tbody>
                </table>
             </div>
        </Card>

        {/* Edit Modal */}
        <Modal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            title="Edit VIP Member"
            footer={
                <>
                    <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveEditedVip}>Save Changes</Button>
                </>
            }
        >
            <div className="grid gap-4">
                <Input 
                    label="Phone" 
                    value={editingVip?.phone || ''} 
                    disabled 
                />
                <Input 
                    label="Name" 
                    value={editingVip?.name || ''} 
                    onChange={e => setEditingVip(prev => ({...prev, name: e.target.value}))}
                />
                <Input 
                    label="Registration Date" 
                    type="date"
                    value={editingVip?.date || getTodayISO()} 
                    onChange={e => setEditingVip(prev => ({...prev, date: e.target.value}))}
                />
                <Select
                    label="Registered By"
                    value={editingVip?.staff || ''}
                    onChange={e => setEditingVip(prev => ({...prev, staff: e.target.value}))}
                >
                    <option value="">Select Staff</option>
                    {staff.map(s => <option key={s} value={s}>{s}</option>)}
                </Select>
            </div>
        </Modal>
    </div>
  );
};