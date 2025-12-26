import React, { useState } from 'react';
import { Trash2, UserPlus, ShieldAlert, Calendar, Users, Scissors } from 'lucide-react';
import { Button, Input, Card, Modal } from './UI';
import { Entry, VIPMember, STAFF_DELETE_PASSWORD, Service } from '../types';
import { getTodayISO, getMonthlyBounds, formatDateDisplay } from '../services/utils';
import { ServicesTab } from './ServicesTab';

interface StaffTabProps {
  staff: string[];
  entries: Entry[];
  vips: VIPMember[];
  onUpdate: (staff: string[]) => void;
  services: Service[];
  onUpdateServices: (services: Service[]) => void;
}

export const StaffTab: React.FC<StaffTabProps> = ({ staff, entries, vips, onUpdate, services, onUpdateServices }) => {
  const [activeSubTab, setActiveSubTab] = useState<'staff' | 'services'>('staff');
  const [newStaff, setNewStaff] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<string | null>(null);
  const [password, setPassword] = useState('');

  // Use current monthly period for staff stats
  const currentMonthRange = getMonthlyBounds(getTodayISO().substring(0, 7));

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
    const periodMemberships = vips
        .filter(v => {
            const vStaff = (v.staff || '').trim().toLowerCase();
            const sName = staffName.trim().toLowerCase();
            return vStaff === sName && v.date >= currentMonthRange.start && v.date <= currentMonthRange.end;
        })
        .length;

    return { memberships: periodMemberships };
  };

  return (
    <div className="space-y-6">
      {/* Sub-tabs for Meta Management */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveSubTab('staff')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${
            activeSubTab === 'staff'
              ? 'bg-slate-800 text-white shadow-md'
              : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Users size={18} /> Staff Management
        </button>
        <button
          onClick={() => setActiveSubTab('services')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${
            activeSubTab === 'services'
              ? 'bg-slate-800 text-white shadow-md'
              : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Scissors size={18} /> Services Management
        </button>
      </div>

      {activeSubTab === 'staff' ? (
        <Card title="Manage Staff (Meta)">
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
                  <span>Current Monthly Performance Stats:</span>
                  <span className="font-bold text-slate-800">{formatDateDisplay(currentMonthRange.start)} to {formatDateDisplay(currentMonthRange.end)}</span>
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">(Monthly Period: 25th - 24th)</p>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-700 font-semibold">
                      <tr>
                          <th className="p-4">Name</th>
                          <th className="p-4">Monthly Memberships</th>
                          <th className="p-4 text-right">Actions</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                      {staff.map((s, i) => {
                          const stats = getStats(s);
                          return (
                              <tr key={i} className="hover:bg-slate-50">
                                  <td className="p-4 font-medium text-slate-800">{s}</td>
                                  <td className="p-4 text-slate-600 font-bold">{stats.memberships}</td>
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
                      {staff.length === 0 && (
                        <tr>
                          <td colSpan={3} className="p-12 text-center text-slate-400 italic">No staff members configured.</td>
                        </tr>
                      )}
                  </tbody>
              </table>
          </div>
        </Card>
      ) : (
        <ServicesTab services={services} onUpdate={onUpdateServices} />
      )}

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