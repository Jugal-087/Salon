import React, { useState, useMemo } from 'react';
import { Search, Download, Upload, Trash2, Edit2 } from 'lucide-react';
import { Button, Input, Select, Card, Modal } from './UI';
import { VIPMember } from '../types';
import { exportToExcel, parseExcel, getTodayISO, formatDateDisplay, calculateVIPStatus } from '../services/utils';

interface MembershipTabProps {
  vips: VIPMember[];
  staff: string[];
  onUpdate: (vips: VIPMember[]) => void;
  onDeleteVIP?: (phone: string) => void; // Optional prop for direct deletion
}

export const MembershipTab: React.FC<MembershipTabProps> = ({ vips, staff, onUpdate, onDeleteVIP }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingVip, setEditingVip] = useState<Partial<VIPMember> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredVips = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return vips.filter(v => v.name.toLowerCase().includes(term) || v.phone.includes(term));
  }, [vips, searchTerm]);

  const handleSaveVip = () => {
    if (!editingVip?.phone || !editingVip?.name) return;
    
    const newVip = editingVip as VIPMember;
    const existsIndex = vips.findIndex(v => v.phone === newVip.phone);
    
    let newVips = [...vips];
    if (existsIndex >= 0) {
      newVips[existsIndex] = newVip;
    } else {
      newVips.push(newVip);
    }
    
    // Sort by newest
    newVips.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    onUpdate(newVips);
    setIsModalOpen(false);
    setEditingVip(null);
  };

  const handleDelete = (phone: string) => {
    if (confirm("Are you sure you want to remove this VIP member?")) {
      if (onDeleteVIP) {
          onDeleteVIP(phone);
      } else {
          onUpdate(vips.filter(v => v.phone !== phone));
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
                const phone = String(row['Phone'] || row['phone'] || '');
                const name = String(row['Name'] || row['name'] || '');
                if (phone && name) {
                    importedVips.push({
                        phone, 
                        name, 
                        date: getTodayISO(), // Default to today if missing
                        staff: String(row['Staff'] || row['staff'] || 'Imported')
                    });
                }
            });

            // Merge avoiding duplicates by phone
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

  const openAddModal = () => {
    setEditingVip({ date: getTodayISO(), staff: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (vip: VIPMember) => {
    setEditingVip({...vip});
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                <Input 
                    placeholder="Search by name or phone..." 
                    className="pl-10" 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
                 <Button onClick={openAddModal}>Add VIP</Button>
                 <Button variant="secondary" onClick={() => exportToExcel(vips, 'VIP_List')}>
                    <Download size={18} />
                 </Button>
                 <label className="inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 px-3 py-2 text-sm bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm cursor-pointer">
                    <Upload size={18} />
                    <input type="file" className="hidden" accept=".csv,.xlsx" onChange={handleImport} />
                </label>
            </div>
        </div>

        <Card className="overflow-hidden p-0 border-0 shadow-none bg-transparent">
             <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-700 font-semibold">
                        <tr>
                            <th className="p-4">Phone</th>
                            <th className="p-4">Name</th>
                            <th className="p-4">Registered Date</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Registered By</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {filteredVips.map((vip) => {
                            const status = calculateVIPStatus(vip.phone, vips);
                            return (
                                <tr key={vip.phone} className="hover:bg-slate-50">
                                    <td className="p-4 font-medium text-slate-600">{vip.phone}</td>
                                    <td className="p-4 font-bold text-slate-800">{vip.name}</td>
                                    <td className="p-4 text-slate-500">{formatDateDisplay(vip.date)}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${status === 'active' ? 'bg-teal-100 text-teal-700' : 'bg-red-100 text-red-700'}`}>
                                            {status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="p-4 text-slate-500">{vip.staff}</td>
                                    <td className="p-4 text-right flex justify-end gap-2">
                                        <button onClick={() => openEditModal(vip)} className="text-sky-500 hover:bg-sky-50 p-2 rounded-lg">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(vip.phone)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                         {filteredVips.length === 0 && (
                            <tr><td colSpan={6} className="p-8 text-center text-slate-500">No members found.</td></tr>
                        )}
                    </tbody>
                </table>
             </div>
        </Card>

        <Modal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            title={editingVip?.phone && vips.find(v => v.phone === editingVip.phone) ? "Edit VIP" : "Add VIP"}
            footer={
                <>
                    <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveVip}>Save Member</Button>
                </>
            }
        >
            <div className="grid gap-4">
                <Input 
                    label="Phone" 
                    value={editingVip?.phone || ''} 
                    onChange={e => setEditingVip(prev => ({...prev, phone: e.target.value}))}
                    disabled={!!(editingVip?.phone && vips.find(v => v.phone === editingVip.phone))} // Disable phone edit if updating
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