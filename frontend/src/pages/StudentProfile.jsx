import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import ProfileHeader from '../components/profile/ProfileHeader';
import CredentialCard from '../components/profile/CredentialCard';
import VerificationSidebar from '../components/profile/VerificationSidebar';
import { getStudentCredentials } from '../utils/api';
import { usePortal } from '../context/PortalContext';

const StudentProfile = () => {
  const { publicKey } = useWallet();
  const { id } = useParams();
  const { getProfile, setActiveRole } = usePortal();
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const studentProfile = getProfile('student');

  useEffect(() => {
    setActiveRole('student');
  }, [setActiveRole]);

  const walletAddress = publicKey?.toBase58() || (id && id !== 'me' ? id : null) || studentProfile.walletAddress || null;
  const profile = credentials[0]
    ? {
        name: credentials[0].studentName || studentProfile.fullName || 'Verified Student',
        summary: `This profile consolidates ${credentials.length} verified credential record${credentials.length === 1 ? '' : 's'} retrieved from CertaChain's trust layer.`,
        primaryCourse: credentials[0].course || studentProfile.courseTrack || 'Credential holder',
        walletAddress
      }
    : {
        name: studentProfile.fullName || 'Verified Student',
        summary: studentProfile.school
          ? `${studentProfile.fullName || 'This student'} is registered under ${studentProfile.school}. Connect a wallet or use the email-issued flow to load verified credentials.`
          : 'No credential metadata has been loaded yet. Students issued certificates by email can use the email viewer without connecting a wallet.',
        primaryCourse: studentProfile.courseTrack || 'Awaiting credential data',
        walletAddress
      };
  const shareUrl = walletAddress ? `${window.location.origin}/profile/${walletAddress}` : window.location.href;

  useEffect(() => {
    if (!walletAddress) return;

    setLoading(true);
    setError(null);
    getStudentCredentials(walletAddress)
      .then(res => {
        if (res.success) {
          setCredentials(res.credentials.map(c => ({
            certId: c.certId,
            title: c.course,
            issuer: c.institutionName || c.institutionWallet,
            date: new Date(c.issueDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase(),
            type: 'CERTIFICATION',
            icon: 'shield',
            ipfsGatewayUrl: c.ipfsGatewayUrl,
            fileGatewayUrl: c.fileGatewayUrl,
            studentName: c.studentName,
            course: c.course
          })));
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [walletAddress]);

  if (!walletAddress) {
    return (
      <div className="min-h-screen bg-[#f8f9ff] flex flex-col">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
          <h2 className="text-2xl font-bold text-slate-800">Open Your Credential Wallet</h2>
          <p className="text-slate-500 max-w-md">
            Connect a Solana wallet to load your on-chain records, or use the email-issued certificate flow if your institution delivered credentials without a wallet.
          </p>
          <WalletMultiButton style={{ background: '#4f46e5', borderRadius: '8px' }} />
          <a href="/dashboard/email-viewer" className="text-sm font-semibold text-indigo-600 hover:underline">
            View certificates by email instead
          </a>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9ff] flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-10">
            <ProfileHeader profile={profile} />
            <section className="space-y-6">
              <div className="flex justify-between items-baseline">
                <h2 className="text-2xl font-bold text-slate-800">Professional Credentials</h2>
                <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase">
                  {credentials.length} On-Chain Records
                </span>
              </div>
              {loading ? (
                <p className="text-slate-500 animate-pulse">Loading credentials from the blockchain...</p>
              ) : error ? (
                <div className="p-6 border border-red-200 bg-red-50 rounded-lg text-center text-red-600">
                  {error}
                </div>
              ) : credentials.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {credentials.map((cred, index) => (
                    <CredentialCard key={index} {...cred} />
                  ))}
                </div>
              ) : (
                <div className="p-6 border border-dashed border-slate-300 rounded-lg text-center text-slate-500">
                  No credentials found for this wallet yet.
                </div>
              )}
            </section>
          </div>
          <div className="lg:col-span-1">
            <VerificationSidebar shareUrl={shareUrl} />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default StudentProfile;
