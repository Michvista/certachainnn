import React, { useState } from 'react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import Sidebar from '../features/dashboard/Sidebar';
import ProfileHeader from '../components/profile/ProfileHeader';
import CredentialCard from '../components/profile/CredentialCard';
import VerificationSidebar from '../components/profile/VerificationSidebar';
import { getEmailIssuedCredentials } from '../utils/api';
import { AlertCircle, Loader2, Mail, Search } from 'lucide-react';
import { usePortal } from '../context/PortalContext';

const EmailCredentialViewer = () => {
  const { setActiveRole, updateProfile } = usePortal();
  const [email, setEmail] = useState('');
  const [certId, setCertId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  React.useEffect(() => {
    setActiveRole('student');
  }, [setActiveRole]);

  const handleLookup = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await getEmailIssuedCredentials(email, certId);
      const firstCredential = response.credentials?.[0];
      updateProfile('student', {
        fullName: firstCredential?.studentName || '',
        email,
        school: firstCredential?.institutionName || firstCredential?.institutionWallet || '',
        courseTrack: firstCredential?.course || '',
        walletAddress: response.walletAddress || ''
      });
      setResult(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const credentials = result?.credentials?.map((credential) => ({
    certId: credential.certId,
    title: credential.course,
    issuer: credential.institutionName || credential.institutionWallet,
    date: new Date(credential.issueDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase(),
    type: 'CERTIFICATION',
    icon: 'shield',
    ipfsGatewayUrl: credential.ipfsGatewayUrl,
    fileGatewayUrl: credential.fileGatewayUrl,
    studentName: credential.studentName,
    course: credential.course
  })) || [];

  const profile = result
    ? {
        name: credentials[0]?.studentName || 'Email-issued student',
        summary: `These credentials were recovered using the student email flow. ${credentials.length} certificate record${credentials.length === 1 ? '' : 's'} matched this claim.`,
        primaryCourse: credentials[0]?.course || 'Credential holder',
        walletAddress: result.walletAddress
      }
    : {
        name: 'Email-issued student',
        summary: 'Paste the email address and certificate ID from the issued email to load the student certificate view.',
        primaryCourse: 'Awaiting lookup',
        walletAddress: null
      };

  const shareUrl = result?.walletAddress ? `${window.location.origin}/profile/${result.walletAddress}` : window.location.href;

  return (
    <div className="flex min-h-screen bg-[#f8f9ff] flex-col">
      <Navbar />
      <main className="flex-1 w-full">
        <div className="flex items-start">
          <Sidebar />
          <section className="flex-1 p-6 lg:p-12">
            <div className="max-w-6xl mx-auto space-y-8">
              <header className="space-y-2">
                <h1 className="text-3xl font-bold text-slate-900">View Email-Issued Certificates</h1>
                <p className="text-slate-500 text-sm max-w-2xl">
                  For students who were issued a certificate through email instead of a connected wallet. Paste the same email and certificate ID from the issued message to load the credential view.
                </p>
              </header>

              <form onSubmit={handleLookup} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Student Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3.5 text-slate-400" size={18} />
                      <input
                        required
                        type="email"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                        placeholder="student@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Certificate ID</label>
                    <input
                      required
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                      placeholder="Paste certificate ID"
                      value={certId}
                      onChange={(e) => setCertId(e.target.value)}
                    />
                  </div>
                </div>

                {error ? (
                  <div className="flex items-center gap-2 text-red-500 text-xs font-bold bg-red-50 p-3 rounded-lg border border-red-100">
                    <AlertCircle size={14} /> {error}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 bg-black text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg hover:bg-slate-800 transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={16} />}
                  Load Certificates
                </button>
              </form>

              {result ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-10">
                    <ProfileHeader profile={profile} />
                    <section className="space-y-6">
                      <div className="flex justify-between items-baseline">
                        <h2 className="text-2xl font-bold text-slate-800">Recovered Credentials</h2>
                        <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase">
                          {credentials.length} Records
                        </span>
                      </div>
                      {credentials.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {credentials.map((credential) => (
                            <CredentialCard key={credential.certId} {...credential} />
                          ))}
                        </div>
                      ) : (
                        <div className="p-6 border border-dashed border-slate-300 rounded-lg text-center text-slate-500">
                          No certificates were found for this email-issued wallet.
                        </div>
                      )}
                    </section>
                  </div>
                  <div className="lg:col-span-1">
                    <VerificationSidebar shareUrl={shareUrl} />
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default EmailCredentialViewer;
