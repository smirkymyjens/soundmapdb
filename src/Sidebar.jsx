import React from 'react';
import { FaPlus, FaDatabase } from 'react-icons/fa';

const navItems = [
  { id: 'add-songs', icon: <FaPlus />, label: 'Add Songs' },
  { id: 'database', icon: <FaDatabase />, label: 'Database' },
];

export default function Sidebar({ activeTab, setActiveTab }) {
  return (
    <aside className="w-64 bg-[#181c1b] text-white flex flex-col py-6 px-2 min-h-screen">
      <div className="flex items-center gap-3 px-4 mb-8">
        <div className="bg-accent rounded-lg p-2">
          <FaPlus className="text-black text-2xl" />
        </div>
        <span className="text-2xl font-bold">SoundmapDB</span>
      </div>
      <nav className="flex-1">
        {navItems.map((item) => (
          <div 
            key={item.label} 
            className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer mb-1 hover:bg-accent/20 ${
              activeTab === item.id ? 'bg-accent/20' : ''
            }`}
            onClick={() => setActiveTab(item.id)}
          >
            <span className="text-accent text-lg">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </div>
        ))}
      </nav>
    </aside>
  );
}