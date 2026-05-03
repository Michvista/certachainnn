import { Link, NavLink } from 'react-router-dom';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { usePortal } from '../../context/PortalContext';

export default function Navbar() {
  const { activeRole, profiles } = usePortal();
  const roleLabel = {
    institution: profiles.institution.institutionName || 'Institution',
    student: profiles.student.fullName || 'Student',
    employer: profiles.employer.companyName || 'Employer'
  }[activeRole];

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 px-6 py-4 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-2xl font-black tracking-tight text-slate-950">CertaChain</Link>
          <div className="hidden rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700 md:block">
            {activeRole} portal
          </div>
        </div>

        <div className="hidden items-center gap-8 md:flex">
          <NavLink
            to="/portal"
            className={({ isActive }) =>
              `font-medium ${isActive ? 'text-emerald-700' : 'text-slate-700 hover:text-slate-950'}`
            }
          >
            Portals
          </NavLink>
          {/* <NavLink
            to="/profile/me"
            className={({ isActive }) =>
              `font-medium ${isActive ? 'text-emerald-700' : 'text-slate-700 hover:text-slate-950'}`
            }
          >
            Student Wallet
          </NavLink>
          <NavLink
            to="/verifier"
            className={({ isActive }) =>
              `font-medium ${isActive ? 'text-emerald-700' : 'text-slate-700 hover:text-slate-950'}`
            }
          >
            Employer Verifier
          </NavLink> */}
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden text-right lg:block">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Active profile</p>
            <p className="max-w-[180px] truncate text-sm font-semibold text-slate-800">{roleLabel}</p>
          </div>
          <WalletMultiButton style={{ background: '#0f172a', borderRadius: '999px', height: '40px', fontSize: '14px' }} />
        </div>
      </div>
    </nav>
  );
}
