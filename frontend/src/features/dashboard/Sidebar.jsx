import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Award,
  BrainCircuit,
  Plus,
  Mail,
  SearchCheck,
  Menu,
  X
} from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={18} />, path: '/dashboard/overview' },
    { name: 'Issue Credentials', icon: <Award size={18} />, path: '/dashboard/issue' },
    { name: 'AI Skill Verifier', icon: <BrainCircuit size={18} />, path: '/verifier' },
    { name: 'Claim Wallet', icon: <Mail size={18} />, path: '/claim' },
    { name: 'View By Email', icon: <SearchCheck size={18} />, path: '/dashboard/email-viewer' },
  ];

  return (
    <>
      {/* Mobile Floating Action Button (FAB) */}
      <div className="lg:hidden fixed bottom-6 right-6 z-50">
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          className="p-4 bg-indigo-600 text-white rounded-full shadow-2xl hover:bg-indigo-700 transition-all active:scale-95"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Content */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0 lg:flex
        flex-col w-72 lg:w-64 h-[100dvh] lg:h-screen bg-white border-r border-slate-100 lg:sticky top-0 p-6 shadow-2xl lg:shadow-none
      `}>
        <div className="mb-10 flex justify-between items-start">
          <div>
            <h2 className="font-bold text-slate-900 text-lg">Institution Portal</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              Solana Devnet
            </p>
          </div>
          <button onClick={() => setIsOpen(false)} className="lg:hidden p-2 text-slate-400 hover:bg-slate-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <Link
              to={item.path}
              key={item.name}
              onClick={() => setIsOpen(false)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                location.pathname === item.path
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              {item.icon}
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-100">
          <Link
            to="/dashboard/issue"
            onClick={() => setIsOpen(false)}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-3 rounded-lg font-bold text-sm shadow-md transition-all"
          >
            <Plus size={18} />
            Issue Certificate
          </Link>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
