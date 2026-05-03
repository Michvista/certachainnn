import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import Sidebar from '../../features/dashboard/Sidebar';
import StatCard from '../../features/dashboard/StatCard';
import ActivityTable from '../../features/dashboard/ActivityTable';
import { getStats, getStudentCredentials } from '../../utils/api';
import { usePortal } from '../../context/PortalContext';

export default function Overview() {
  const { activeRole, getProfile } = usePortal();
  const { publicKey } = useWallet();
  const [stats, setStats] = useState({ totalCertificates: '--', totalStudents: '--', avgVerificationTime: null });
  const [studentCredentialCount, setStudentCredentialCount] = useState('--');
  const profile = getProfile(activeRole);

  useEffect(() => {
    getStats().then(res => {
      if (res.success) setStats(res);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const studentWallet = publicKey?.toBase58() || getProfile('student').walletAddress;
    if (!studentWallet) {
      return;
    }

    getStudentCredentials(studentWallet)
      .then((res) => {
        if (res.success) {
          setStudentCredentialCount(res.credentials.length);
        }
      })
      .catch(() => {});
  }, [publicKey, getProfile]);

  const pageCopy = {
    institution: {
      title: 'Institution Command Center',
      subtitle: 'Track issuance activity, student reach, and the state of your credential ledger.',
      cards: [
        { label: 'Certificates Issued', value: stats.totalCertificates, sub: 'Anchored records' },
        { label: 'Students Reached', value: stats.totalStudents, sub: 'Distinct credential holders' },
        { label: 'Issuing Identity', value: profile.institutionName || 'Set portal profile', sub: profile.contactEmail || 'Official institution profile' }
      ]
    },
    student: {
      title: 'Student Wallet Overview',
      subtitle: 'Keep one trusted place for your verified records, whether they arrived by wallet or by email claim.',
      cards: [
        { label: 'My Credentials', value: studentCredentialCount, sub: 'Loaded from your wallet' },
        { label: 'Network Records', value: stats.totalCertificates, sub: 'Total credentials on CertaChain' },
        { label: 'Profile Identity', value: profile.fullName || 'Set portal profile', sub: profile.email || 'Student portal details' }
      ]
    },
    employer: {
      title: 'Employer Verification Desk',
      subtitle: 'Search candidate wallets or certificate IDs and turn verified records into hiring insight.',
      cards: [
        { label: 'Live Credentials', value: stats.totalCertificates, sub: 'Available for verification' },
        { label: 'Student Profiles', value: stats.totalStudents, sub: 'Reachable credential owners' },
        { label: 'Hiring Workspace', value: profile.companyName || 'Set portal profile', sub: profile.hiringGoal || 'Employer portal details' }
      ]
    }
  }[activeRole];

  return (
    <div className="bg-gray-50 min-h-screen">
      <Navbar />

      <main className="w-full">
        <div className="flex items-start">
          <Sidebar />

          <div className="flex-1">
            <div className="max-w-7xl mx-auto px-6 py-16 space-y-8">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-gray-900">{pageCopy.title}</h1>
              <p className="text-sm text-slate-500 max-w-2xl">{pageCopy.subtitle}</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {pageCopy.cards.map((card) => (
                <StatCard key={card.label} label={card.label} value={card.value} sub={card.sub} />
              ))}
            </div>

            <ActivityTable />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
