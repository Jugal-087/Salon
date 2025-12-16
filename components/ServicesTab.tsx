import React, { useState } from 'react';
import { Trash2, Upload, Plus } from 'lucide-react';
import { Button, Input, Card } from './UI';
import { Service } from '../types';
import { formatCurrency, parseExcel } from '../services/utils';

interface ServicesTabProps {
  services: Service[];
  onUpdate: (services: Service[]) => void;
}

export const ServicesTab: React.FC<ServicesTabProps> = ({ services, onUpdate }) => {
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');

  const handleAdd = () => {
    if (!newName || !newAmount) return;
    const exists = services.find(s => s.name.toLowerCase() === newName.toLowerCase());
    
    let updatedServices;
    if (exists) {
      updatedServices = services.map(s => 
        s.name.toLowerCase() === newName.toLowerCase() 
          ? { ...s, amount: parseFloat(newAmount) } 
          : s
      );
    } else {
      updatedServices = [...services, { name: newName, amount: parseFloat(newAmount) }];
    }
    
    onUpdate(updatedServices);
    setNewName('');
    setNewAmount('');
  };

  const handleDelete = (name: string) => {
    if (confirm(`Delete service "${name}"?`)) {
        onUpdate(services.filter(s => s.name !== name));
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const data = await parseExcel(file);
        const newServices = [...services];
        
        data.forEach((row: any) => {
            // Flexible matching for column names
            const name = row['Service'] || row['service'] || row['Name'] || row['name'];
            const amount = row['Amount'] || row['amount'] || row['Price'] || row['price'];
            
            if (name && amount) {
                const idx = newServices.findIndex(s => s.name.toLowerCase() === String(name).toLowerCase());
                if (idx >= 0) {
                    newServices[idx].amount = Number(amount);
                } else {
                    newServices.push({ name: String(name), amount: Number(amount) });
                }
            }
        });
        onUpdate(newServices);
        alert(`Imported successfully. Total services: ${newServices.length}`);
      } catch (err) {
        alert("Error parsing CSV/Excel file.");
        console.error(err);
      }
    }
  };

  return (
    <div className="space-y-6">
      <Card title="Manage Services">
        <div className="flex flex-col md:flex-row gap-4 items-end mb-6">
            <Input 
                label="Service Name" 
                value={newName} 
                onChange={e => setNewName(e.target.value)} 
                placeholder="e.g. Haircut"
            />
            <Input 
                label="Default Price" 
                type="number"
                value={newAmount} 
                onChange={e => setNewAmount(e.target.value)} 
                placeholder="300"
            />
            <div className="flex gap-2">
                <Button onClick={handleAdd}>
                    <Plus size={18} className="mr-2" /> Add / Update
                </Button>
                <label className="inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 px-5 py-2.5 text-sm bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm cursor-pointer">
                    <Upload size={18} className="mr-2" /> Import
                    <input type="file" className="hidden" accept=".csv,.xlsx" onChange={handleImport} />
                </label>
            </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-700 font-semibold">
                    <tr>
                        <th className="p-4">Service Name</th>
                        <th className="p-4">Default Price</th>
                        <th className="p-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                    {services.map((s, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                            <td className="p-4 font-medium text-slate-800">{s.name}</td>
                            <td className="p-4 text-slate-600">{formatCurrency(s.amount)}</td>
                            <td className="p-4 text-right">
                                <button 
                                    onClick={() => handleDelete(s.name)} 
                                    className="text-slate-400 hover:text-red-600 transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </td>
                        </tr>
                    ))}
                    {services.length === 0 && (
                        <tr>
                            <td colSpan={3} className="p-6 text-center text-slate-500">No services added yet.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </Card>
    </div>
  );
};
