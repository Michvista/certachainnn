import { ArrowRight, CheckCircle2 } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import CredentialCard from '../profile/CredentialCard';

export default function Hero() {
  return (
    <section className="px-6 py-24 lg:py-32 max-w-7xl mx-auto">
      <div className="grid lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] gap-16 items-center">
        <div className="space-y-8">
          <Badge type="solana">
            <CheckCircle2 size={12} className="mr-1" />
            Built on Solana Devnet
          </Badge>

          <h1 className="text-5xl lg:text-7xl font-bold text-gray-900 leading-[1.05] tracking-tight">
            The trust layer for <span className="text-emerald-600">African education</span>
          </h1>

          <p className="text-lg text-gray-600 leading-relaxed max-w-lg">
            CertaChain helps institutions issue tamper-proof certificates, gives students a credible public credential wallet, and lets employers verify skills with blockchain-backed AI analysis.
          </p>

          <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Institutions</p>
              <p className="mt-2 font-semibold text-slate-900">Issue live credentials with wallet or email delivery.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Students</p>
              <p className="mt-2 font-semibold text-slate-900">Own one public record for every verified achievement.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Employers</p>
              <p className="mt-2 font-semibold text-slate-900">Verify instantly and generate skill reports from real evidence.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <Button to="/portal" variant="primary" className="flex items-center justify-center gap-2 group">
              Enter Your Portal
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button to="/verifier" variant="secondary">
              Verify a Candidate
            </Button>
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">
          <div className="w-full max-w-md mx-auto lg:mx-0">
            <CredentialCard />
          </div>
        </div>
      </div>
    </section>
  );
}
