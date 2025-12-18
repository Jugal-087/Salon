import React, { useState } from 'react';
import { Trash2, UserPlus, ShieldAlert, Calendar } from 'lucide-react';
import { Button, Input, Card, Modal } from './UI';
import { Entry, VIPMember, STAFF_DELETE_PASSWORD } from '../types';
import { formatCurrency, getTodayISO, getCycleBounds, formatDateDisplay } from '../services/utils';

interface StaffTabProps {
  staff: string[];
  entries: Entry[];
  vips: VIPMember[];
  onUpdate: (staff: string[]) => void;
}

export const StaffTab: React.FC<StaffTabProps> = ({ staff, entries, vips, onUpdate }) => {
  const [newStaff, setNewStaff] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<string | null>(null);
  const [password, setPassword] = useState('');

  // Use current cycle for staff stats
  const currentCycle = getCycleBounds(getTodayISO().substring(0, 7));

  const handleAdd = () => {
    if (newStaff && !staff.includes(newStaff)) {
      onUpdate([...staff, newStaff]);
      setNewStaff('');
    }
  };

  const initiateDelete = (name: string) => {
    setStaffToDelete(name);
    setDeleteModalOpen(true);
    setPassword('');
  };

  const confirmDelete = () => {
    if (password === STAFF_DELETE_PASSWORD && staffToDelete) {
      onUpdate(staff.filter(s => s !== staffToDelete));
      setDeleteModalOpen(false);
      setStaffToDelete(null);
    } else {
      alert("Incorrect Password!");
    }
  };

  const getStats = (staffName: string) => {
    const periodRevenue = entries
      .filter(e => e.staff === staffName && e.date >= currentCycle.start && e.date <= currentCycle.end)
      .reduce((sum, e) => sum + (e.paid || 0), 0);

    const periodMemberships = vips
        .filter(v => v.staff === staffName && v.date >= currentCycle.start && v.date <= currentCycle.end)
        .length;

    return { revenue: periodRevenue, memberships: periodMemberships };
  };

  return (
    <div className="space-y-6">
      <Card title="Manage Staff">
        <div className="flex gap-4 items-end mb-6 max-w-lg">
            <Input 
                label="Staff Name" 
                value={newStaff} 
                onChange={e => setNewStaff(e.target.value)} 
                placeholder="e.g. John Doe"
            />
            <Button onClick={handleAdd}>
                <UserPlus size={18} className="mr-2" /> Add Staff
            </Button>
        </div>

        <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-600 text-sm font-medium">
                <Calendar size={16} />
                <span>Current Billing Cycle Stats:</span>
                <span className="font-bold text-slate-800">{formatDateDisplay(currentCycle.start)} to {formatDateDisplay(currentCycle.end)}</span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">(25th - 24th inclusive)</p>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-700 font-semibold">
                    <tr>
                        <th className="p-4">Name</th>
                        <th className="p-4">Cycle Memberships</th>
                        <th className="p-4">Cycle Revenue</th>
                        <th className="p-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                    {staff.map((s, i) => {
                        const stats = getStats(s);
                        return (
                            <tr key={i} className="hover:bg-slate-50">
                                <td className="p-4 font-medium text-slate-800">{s}</td>
                                <td className="p-4 text-slate-600">{stats.memberships}</td>
                                <td className="p-4 text-slate-600 font-semibold text-teal-600">{formatCurrency(stats.revenue)}</td>
                                <td className="p-4 text-right">
                                    <button 
                                        onClick={() => initiateDelete(s)} 
                                        className="text-slate-400 hover:text-red-600 transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
      </Card>

      <Modal 
        isOpen={deleteModalOpen} 
        onClose={() => setDeleteModalOpen(false)} 
        title="Delete Staff Member"
        footer={
            <>
                <Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>Cancel</Button>
                <Button variant="danger" onClick={confirmDelete}>Delete</Button>
            </>
        }
      >
        <div className="text-center">
            <div className="bg-red-50 text-red-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldAlert size={24} />
            </div>
            <p className="mb-4 text-slate-600">Enter administrator password to delete <b>{staffToDelete}</b>.</p>
            <Input 
                type="password" 
                placeholder="Password" 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                autoFocus
            />
        </div>
      </Modal>
    </div>
  );
};