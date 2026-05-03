import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { GraduationCap, BriefcaseBusiness, Building2, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { usePortal } from '../context/PortalContext';

const portalConfig = {
  institution: {
    icon: Building2,
    label: 'Institution Portal',
    headline: 'Issue tamper-proof certificates from a trusted institutional dashboard.',
    accent: 'from-[#0f766e] to-[#1d4ed8]',
    fields: [
      { key: 'institutionName', label: 'Institution Name', placeholder: 'University of Lagos', required: true },
      { key: 'institutionType', label: 'Institution Type', placeholder: 'University, bootcamp, academy' },
      { key: 'country', label: 'Country', placeholder: 'Nigeria' },
      { key: 'contactEmail', label: 'Official Email', placeholder: 'registry@institution.edu', type: 'email', required: true },
      { key: 'issuingOfficer', label: 'Issuing Officer', placeholder: 'Head of Registry' },
      { key: 'walletAddress', label: 'Solana Address', placeholder: 'Institution wallet address', required: true }
    ],
    nextPath: '/dashboard/overview'
  },
  student: {
    icon: GraduationCap,
    label: 'Student Portal',
    headline: 'Build a shareable credential wallet, with or without a self-managed wallet.',
    accent: 'from-[#7c3aed] to-[#0f766e]',
    fields: [
      { key: 'fullName', label: 'Full Name', placeholder: 'Adewale Okonkwo', required: true },
      { key: 'email', label: 'Email Address', placeholder: 'student@example.com', type: 'email', required: true },
      { key: 'school', label: 'Institution', placeholder: 'University of Lagos' },
      { key: 'courseTrack', label: 'Course or Track', placeholder: 'BSc Computer Science' },
      { key: 'graduationYear', label: 'Graduation Year', placeholder: '2026' },
      { key: 'walletAddress', label: 'Solana Address', placeholder: 'Optional if certificates were issued by email' }
    ],
    nextPath: '/profile/me'
  },
  employer: {
    icon: BriefcaseBusiness,
    label: 'Employer Portal',
    headline: 'Verify candidates instantly and generate AI-backed hiring intelligence.',
    accent: 'from-[#b45309] to-[#7c2d12]',
    fields: [
      { key: 'companyName', label: 'Company Name', placeholder: 'Interswitch', required: true },
      { key: 'contactName', label: 'Hiring Contact', placeholder: 'Michelle Olumide', required: true },
      { key: 'workEmail', label: 'Work Email', placeholder: 'talent@company.com', type: 'email', required: true },
      { key: 'industry', label: 'Industry', placeholder: 'Fintech' },
      { key: 'hiringGoal', label: 'Hiring Goal', placeholder: 'Backend engineers, analysts, graduates' },
      { key: 'walletAddress', label: 'Solana Address', placeholder: 'Optional employer wallet' }
    ],
    nextPath: '/verifier'
  }
};

export default function PortalOnboarding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedRole = searchParams.get('role');
  const { publicKey } = useWallet();
  const { activeRole, getProfile, updateProfile, setActiveRole, isComplete } = usePortal();
  const [selectedRole, setSelectedRole] = useState(portalConfig[requestedRole] ? requestedRole : activeRole);
  const [formState, setFormState] = useState(getProfile(portalConfig[requestedRole] ? requestedRole : activeRole));

  useEffect(() => {
    const nextRole = portalConfig[requestedRole] ? requestedRole : activeRole;
    setSelectedRole(nextRole);
    setFormState(getProfile(nextRole));
  }, [requestedRole, activeRole, getProfile]);

  useEffect(() => {
    if (!publicKey) {
      return;
    }

    const walletAddress = publicKey.toBase58();
    setFormState((current) => ({
      ...current,
      walletAddress: current.walletAddress || walletAddress
    }));
  }, [publicKey]);

  const config = portalConfig[selectedRole];
  const Icon = config.icon;

  const completionNote = useMemo(() => {
    if (selectedRole === 'student') {
      return 'Students can continue without a wallet if their certificate was issued by email.';
    }
    return 'Wallet connection is recommended so role details and live Solana identity stay aligned.';
  }, [selectedRole]);

  const handleSubmit = (event) => {
    event.preventDefault();
    updateProfile(selectedRole, formState);
    setActiveRole(selectedRole);
    navigate(config.nextPath);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[radial-gradient(circle_at_top,_rgba(20,184,166,0.14),_transparent_35%),linear-gradient(180deg,#f6f8ff_0%,#fffdf8_100%)]">
      <Navbar />
      <main className="flex-1 px-6 py-10 lg:py-14">
        <div className="max-w-7xl mx-auto grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-8">
            <div className="space-y-5 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                <ShieldCheck size={14} className="text-emerald-600" />
                Three live portals, one trusted credential network
              </div>
              <h1 className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                Route every institution, student, and employer into the right CertaChain workflow.
              </h1>
              <p className="max-w-xl text-base leading-7 text-slate-600">
                Select a portal, add the operational details that make verification useful, and continue into the part of the platform designed for that role.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {Object.entries(portalConfig).map(([role, item]) => {
                const RoleIcon = item.icon;
                const complete = isComplete(role);
                const active = role === selectedRole;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => {
                      setSelectedRole(role);
                      setActiveRole(role);
                      setFormState(getProfile(role));
                    }}
                    className={`rounded-3xl border p-5 text-left transition-all ${
                      active
                        ? 'border-slate-900 bg-slate-900 text-white shadow-2xl'
                        : 'border-slate-200 bg-white/90 text-slate-800 hover:-translate-y-1 hover:shadow-xl'
                    }`}
                  >
                    <RoleIcon size={24} className={active ? 'text-white' : 'text-slate-900'} />
                    <h2 className="mt-4 text-lg font-bold">{item.label}</h2>
                    <p className={`mt-2 text-sm leading-6 ${active ? 'text-slate-200' : 'text-slate-500'}`}>
                      {item.headline}
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em]">
                      {complete ? <CheckCircle2 size={14} className="text-emerald-500" /> : <span className={`h-2 w-2 rounded-full ${active ? 'bg-amber-300' : 'bg-slate-300'}`} />}
                      {complete ? 'Profile saved' : 'Setup needed'}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className={`rounded-2xl bg-gradient-to-br p-4 text-white shadow-lg ${config.accent}`}>
                  <Icon size={28} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-slate-950">{config.label}</h3>
                  <p className="max-w-xl text-sm leading-6 text-slate-600">{config.headline}</p>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{completionNote}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-2xl shadow-slate-200/60 lg:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">Portal setup</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-950">{config.label}</h2>
              </div>
              <WalletMultiButton style={{ background: '#0f172a', borderRadius: '999px', fontSize: '12px', height: '40px' }} />
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              {config.fields.map((field) => (
                <label key={field.key} className="block space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
                    {field.label}
                  </span>
                  <input
                    type={field.type || 'text'}
                    required={field.required}
                    value={formState[field.key] || ''}
                    onChange={(event) => setFormState((current) => ({ ...current, [field.key]: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white"
                    placeholder={field.placeholder}
                  />
                </label>
              ))}

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                {selectedRole === 'student'
                  ? 'Students without wallets can still use email-issued credentials and load them from the student portal.'
                  : 'Your saved role details will prefill the next portal screens so issuance and verification feel consistent.'}
              </div>

              <button
                type="submit"
                className={`flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r px-5 py-4 text-sm font-bold text-white shadow-xl transition hover:brightness-110 ${config.accent}`}
              >
                Continue to {config.label}
                <ArrowRight size={16} />
              </button>
            </form>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
