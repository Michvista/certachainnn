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
  X,
  GraduationCap,
  Building2,
  BriefcaseBusiness,
  RotateCcw
} from 'lucide-react';
import { usePortal } from '../../context/PortalContext';

const Sidebar = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const { activeRole, profiles } = usePortal();

  const roleConfig = {
    institution: {
      title: 'Institution Portal',
      subtitle: profiles.institution.institutionName || 'Credential issuance',
      icon: <Building2 size={18} />,
      cta: { label: 'Issue Certificate', path: '/dashboard/issue' },
      menuItems: [
        { name: 'Overview', icon: <LayoutDashboard size={18} />, path: '/dashboard/overview' },
        { name: 'Institution View', icon: <Award size={18} />, path: '/dashboard/institution' },
        { name: 'Issue Credentials', icon: <Plus size={18} />, path: '/dashboard/issue' }
      ]
    },
    student: {
      title: 'Student Portal',
      subtitle: profiles.student.fullName || 'Credential wallet',
      icon: <GraduationCap size={18} />,
      cta: { label: 'Open Wallet', path: '/profile/me' },
      menuItems: [
        { name: 'Credential Wallet', icon: <GraduationCap size={18} />, path: '/profile/me' },
        { name: 'View By Email', icon: <SearchCheck size={18} />, path: '/dashboard/email-viewer' },
        { name: 'Claim Credentials', icon: <Mail size={18} />, path: '/claim' },
        { name: 'Verification Link', icon: <BrainCircuit size={18} />, path: '/verifier' }
      ]
    },
    employer: {
      title: 'Employer Portal',
      subtitle: profiles.employer.companyName || 'Verification workspace',
      icon: <BriefcaseBusiness size={18} />,
      cta: { label: 'Verify Talent', path: '/verifier' },
      menuItems: [
        { name: 'Verification Desk', icon: <BrainCircuit size={18} />, path: '/verifier' }
      ]
    }
  };
  const config = roleConfig[activeRole] || roleConfig.institution;

  return (
    <>
      <div className="lg:hidden fixed bottom-6 right-6 z-50">
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          className="p-4 bg-indigo-600 text-white rounded-full shadow-2xl hover:bg-indigo-700 transition-all active:scale-95"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0 lg:flex
        flex-col w-72 lg:w-64 h-[100dvh] lg:h-screen bg-white border-r border-slate-100 lg:sticky top-0 p-6 shadow-2xl lg:shadow-none
      `}>
        <div className="mb-10 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 text-slate-900">
              {config.icon}
              <h2 className="font-bold text-lg">{config.title}</h2>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              {config.subtitle}
            </p>
          </div>
          <button onClick={() => setIsOpen(false)} className="lg:hidden p-2 text-slate-400 hover:bg-slate-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto">
          {config.menuItems.map((item) => (
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

        <div className="mt-auto space-y-3 pt-6 border-t border-slate-100">
          <Link
            to="/portal"
            onClick={() => setIsOpen(false)}
            className="w-full flex items-center justify-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 py-3 rounded-lg font-bold text-sm transition-all"
          >
            <RotateCcw size={18} />
            Switch Portal
          </Link>
          <Link
            to={config.cta.path}
            onClick={() => setIsOpen(false)}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-3 rounded-lg font-bold text-sm shadow-md transition-all"
          >
            <Plus size={18} />
            {config.cta.label}
          </Link>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
