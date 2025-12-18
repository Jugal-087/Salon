
import React, { useState, useMemo } from 'react';
import { Trash2, Upload, Plus, User, UserRoundSearch } from 'lucide-react';
import { Button, Input, Card } from './UI';
import { Service } from '../types';
import { formatCurrency, parseExcel } from '../services/utils';

interface ServicesTabProps {
  services: Service[];
  onUpdate: (services: Service[]) => void;
}

export const ServicesTab: React.FC<ServicesTabProps> = ({ services, onUpdate }) => {
  const [activeCategory, setActiveCategory] = useState<'Men' | 'Women'>('Men');
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');

  const filteredServices = useMemo(() => {
    return services.filter(s => (s.category || 'Men') === activeCategory);
  }, [services, activeCategory]);

  const handleAdd = () => {
    if (!newName || !newAmount) return;
    const exists = services.find(s => 
      s.name.toLowerCase() === newName.toLowerCase() && 
      (s.category || 'Men') === activeCategory
    );
    
    let updatedServices;
    if (exists) {
      updatedServices = services.map(s => 
        (s.name.toLowerCase() === newName.toLowerCase() && (s.category || 'Men') === activeCategory)
          ? { ...s, amount: parseFloat(newAmount) } 
          : s
      );
    } else {
      updatedServices = [...services, { name: newName, amount: parseFloat(newAmount), category: activeCategory }];
    }
    
    onUpdate(updatedServices);
    setNewName('');
    setNewAmount('');
  };

  const handleDelete = (name: string) => {
    if (confirm(`Delete ${activeCategory} service "${name}"?`)) {
        onUpdate(services.filter(s => !(s.name === name && (s.category || 'Men') === activeCategory)));
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const data = await parseExcel(file);
        const newServices = [...services];
        
        data.forEach((row: any) => {
            const name = row['Service'] || row['service'] || row['Name'] || row['name'];
            const amount = row['Amount'] || row['amount'] || row['Price'] || row['price'];
            // Check for category in row, otherwise use active
            const category = row['Category'] || row['category'] || activeCategory;
            const validCategory: 'Men' | 'Women' = (String(category).toLowerCase().includes('women') || String(category).toLowerCase().includes('female')) ? 'Women' : 'Men';
            
            if (name && amount) {
                const idx = newServices.findIndex(s => 
                    s.name.toLowerCase() === String(name).toLowerCase() && 
                    (s.category || 'Men') === validCategory
                );
                if (idx >= 0) {
                    newServices[idx].amount = Number(amount);
                } else {
                    newServices.push({ name: String(name), amount: Number(amount), category: validCategory });
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
      {/* Category Toggle Top */}
      <div className="flex justify-center mb-2 no-print">
        <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 flex gap-1">
          <button 
            onClick={() => setActiveCategory('Men')}
            className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all ${
              activeCategory === 'Men' 
              ? 'bg-sky-500 text-white shadow-md shadow-sky-200 translate-y-[-1px]' 
              : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <User size={18} /> Men Services
          </button>
          <button 
            onClick={() => setActiveCategory('Women')}
            className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all ${
              activeCategory === 'Women' 
              ? 'bg-rose-500 text-white shadow-md shadow-rose-200 translate-y-[-1px]' 
              : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <UserRoundSearch size={18} /> Women Services
          </button>
        </div>
      </div>

      <Card title={`Add ${activeCategory} Service`}>
        <div className="flex flex-col md:flex-row gap-4 items-end mb-6">
            <Input 
                label="Service Name" 
                value={newName} 
                onChange={e => setNewName(e.target.value)} 
                placeholder={`e.g. ${activeCategory === 'Men' ? 'Men\'s Haircut' : 'Hair Styling'}`}
            />
            <Input 
                label="Default Price" 
                type="number"
                value={newAmount} 
                onChange={e => setNewAmount(e.target.value)} 
                placeholder="300"
            />
            <div className="flex gap-2">
                <Button onClick={handleAdd} className={activeCategory === 'Men' ? 'bg-sky-500' : 'bg-rose-500'}>
                    <Plus size={18} className="mr-2" /> Add / Update
                </Button>
                <label className="inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 px-5 py-2.5 text-sm bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm cursor-pointer">
                    <Upload size={18} className="mr-2" /> Import
                    <input type="file" className="hidden" accept=".csv,.xlsx" onChange={handleImport} />
                </label>
            </div>
        </div>

        <div className={`overflow-hidden rounded-xl border ${activeCategory === 'Men' ? 'border-sky-100' : 'border-rose-100'}`}>
            <table className="w-full text-left text-sm">
                <thead className={activeCategory === 'Men' ? 'bg-sky-50 text-sky-800 font-semibold' : 'bg-rose-50 text-rose-800 font-semibold'}>
                    <tr>
                        <th className="p-4">Service Name</th>
                        <th className="p-4">Default Price</th>
                        <th className="p-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredServices.map((s, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                            <td className="p-4 font-medium text-slate-800">{s.name}</td>
                            <td className="p-4 text-slate-600 font-bold">{formatCurrency(s.amount)}</td>
                            <td className="p-4 text-right">
                                <button 
                                    onClick={() => handleDelete(s.name)} 
                                    className="text-slate-300 hover:text-red-600 transition-colors p-2"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </td>
                        </tr>
                    ))}
                    {filteredServices.length === 0 && (
                        <tr>
                            <td colSpan={3} className="p-12 text-center text-slate-400">
                               No {activeCategory.toLowerCase()} services added yet. Add some above!
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </Card>
    </div>
  );
};
