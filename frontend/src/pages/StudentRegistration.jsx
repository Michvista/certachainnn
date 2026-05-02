import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { Loader2, UserPlus, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const StudentRegistration = () => {
  const { publicKey } = useWallet();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [name, setName] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!publicKey) return;
    
    setLoading(true);
    // In a real app, we would save this to a 'Student' table.
    // For this hackathon version, we'll simulate it by saving to localStorage or just showing success.
    setTimeout(() => {
      localStorage.setItem(`student_name_${publicKey.toBase58()}`, name);
      setSuccess(true);
      setLoading(false);
      setTimeout(() => navigate('/profile/me'), 1500);
    }, 1000);
  };

  return (
    <div className="flex min-h-screen bg-[#f8f9ff] flex-col">
      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-center p-6 py-20">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="inline-flex p-4 bg-indigo-50 rounded-2xl text-indigo-600 mb-4">
            <UserPlus size={40} />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Student Portal</h1>
            <p className="text-slate-500 mt-3">Link your Solana wallet to your academic identity.</p>
          </div>

          {!publicKey ? (
            <div className="bg-white p-10 rounded-2xl border border-slate-100 shadow-xl space-y-6">
              <p className="text-slate-600">Connect your wallet to get started.</p>
              <div className="flex justify-center">
                <WalletMultiButton style={{ background: '#000', borderRadius: '12px' }} />
              </div>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="bg-white p-8 rounded-2xl border border-slate-100 shadow-xl space-y-5 text-left">
              {success ? (
                <div className="flex flex-col items-center py-6 text-center space-y-4">
                  <CheckCircle size={48} className="text-emerald-500" />
                  <p className="font-bold text-slate-900">Profile Linked Successfully!</p>
                  <p className="text-sm text-slate-500">Redirecting to your profile...</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Name</label>
                    <input
                      required
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                      placeholder="Alex Chen"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Wallet Address</p>
                    <p className="text-[10px] font-mono bg-slate-50 p-2 rounded border border-slate-100 truncate">{publicKey.toBase58()}</p>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-black text-white py-4 rounded-xl font-bold text-sm shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : 'Complete Registration'}
                  </button>
                </>
              )}
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default StudentRegistration;
