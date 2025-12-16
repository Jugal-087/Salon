import React, { useState } from 'react';
import { Trash2, UserPlus, ShieldAlert } from 'lucide-react';
import { Button, Input, Card, Modal } from './UI';
import { Entry, VIPMember, STAFF_DELETE_PASSWORD } from '../types';
import { formatCurrency } from '../services/utils';

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

  // Helper to calculate monthly stats
  const getStats = (staffName: string) => {
    const now = new Date();
    // Logic from original: 25th prev month to 24th curr month
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const startDate = new Date(currentYear, currentMonth - 1, 25);
    const endDate = new Date(currentYear, currentMonth, 24, 23, 59, 59);

    const periodRevenue = entries
      .filter(e => e.staff === staffName && new Date(e.date) >= startDate && new Date(e.date) <= endDate)
      .reduce((sum, e) => sum + (e.paid || 0), 0);

    const periodMemberships = vips
        .filter(v => v.staff === staffName && new Date(v.date) >= startDate && new Date(v.date) <= endDate)
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

        <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-700 font-semibold">
                    <tr>
                        <th className="p-4">Name</th>
                        <th className="p-4">New Memberships (This Month)</th>
                        <th className="p-4">Revenue (This Month)</th>
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
