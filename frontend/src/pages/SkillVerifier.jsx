import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { Link2, CheckCircle2, BrainCircuit, Download, Share2, Loader2, Check, FileSearch } from 'lucide-react';
import Sidebar from '../features/dashboard/Sidebar';
import { getStudentCredentials, generateSkillReport, copyToClipboard, verifyCertificate } from '../utils/api';
import { QRCodeSVG } from 'qrcode.react';
import { usePortal } from '../context/PortalContext';

const SkillVerifier = () => {
  const [searchParams] = useSearchParams();
  const { setActiveRole, getProfile } = usePortal();
  const [searchQuery, setSearchQuery] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [studentData, setStudentData] = useState(null);
  const [aiReport, setAiReport] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const prefetchedQueryRef = useRef('');

  const verificationUrl = studentData 
    ? `${window.location.origin}/verifier?wallet=${studentData.wallet}`
    : window.location.href;

  useEffect(() => {
    setActiveRole('employer');
  }, [setActiveRole]);

  const normalizeCredentials = (credentials, walletAddressOverride) => ({
    name: credentials[0]?.studentName || 'Verified Candidate',
    wallet: walletAddressOverride || credentials[0]?.studentWallet || 'Email-issued credential owner',
    count: credentials.length,
    recentCertId: credentials[0]?.certId
  });

  const handleVerify = async () => {
    if (!searchQuery) return;
    setLoading(true);
    setAiReport(null);
    setStudentData(null);
    setError('');

    try {
      let credentials = [];
      let walletAddress = '';
      const trimmedQuery = searchQuery.trim();
      const profileMatch = trimmedQuery.match(/\/profile\/([^/?#]+)/);

      if (profileMatch?.[1]) {
        walletAddress = decodeURIComponent(profileMatch[1]);
      } else {
        try {
          const certRes = await verifyCertificate(trimmedQuery);
          if (certRes.success) {
            if (certRes.metadata?.studentWallet) {
              walletAddress = certRes.metadata.studentWallet;
            } else {
              credentials = [{
                certId: certRes.certId,
                studentName: certRes.metadata?.studentName,
                studentWallet: certRes.metadata?.studentWallet,
                course: certRes.metadata?.course,
                institutionName: certRes.institutionName,
                issueDate: certRes.issueDate,
                fileUrl: certRes.fileUrl,
                fileGatewayUrl: certRes.fileGatewayUrl
              }];
            }
          }
        } catch {
          walletAddress = trimmedQuery;
        }
      }

      if (walletAddress) {
        const credRes = await getStudentCredentials(walletAddress);
        if (credRes.success && credRes.credentials.length > 0) {
          credentials = credRes.credentials;
        }
      }

      if (!credentials.length) {
        throw new Error('No verified credentials were found for that wallet, certificate ID, or profile link.');
      }
      setStudentData(normalizeCredentials(credentials, walletAddress));

      const aiRes = await generateSkillReport(credentials, jobDescription);
      if (aiRes.success && aiRes.skillReport) {
        setAiReport(aiRes.skillReport);
      }
    } catch (error) {
      console.error("Verification failed:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const wallet = searchParams.get('wallet');
    const certificate = searchParams.get('certificate');
    const prefilled = wallet || certificate || '';
    if (prefilled && prefetchedQueryRef.current !== prefilled) {
      prefetchedQueryRef.current = prefilled;
      setSearchQuery(prefilled);
    }
  }, [searchParams]);

  const handleShare = async () => {
    const success = await copyToClipboard(verificationUrl);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      alert("Failed to copy link. Please manually copy the URL from your browser.");
    }
  };

  const handleDownload = () => {
    window.print();
  };

  return (
    <div>
      <Navbar />

      <div className="flex min-h-screen bg-[#f8f9ff]">
        <Sidebar />

        <main className="flex-1 p-4 md:p-8 lg:p-12 py-10 space-y-8">
          <header className="space-y-2">
            <h1 className="text-3xl font-bold text-slate-900">Employer Verification Portal</h1>
            <p className="text-slate-500 text-sm max-w-xl">
              Paste a wallet address, profile link, or certificate ID to get instant on-chain verification plus a Gemini skill report with verified skills, gaps, score, and hiring recommendation.
            </p>
          </header>

          <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[1.25fr_0.95fr_auto]">
            <div className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50 px-4">
              <div className="text-slate-400"><Link2 size={18} /></div>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                className="flex-1 bg-transparent py-4 text-sm focus:outline-none"
                placeholder="Paste wallet address, profile link, or certificate ID"
              />
            </div>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="min-h-[56px] rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm focus:outline-none"
              placeholder="Optional job description for skill-gap analysis"
            />
            <button 
              onClick={handleVerify}
              disabled={loading}
              className="bg-black text-white px-8 py-3 rounded-xl text-sm font-bold hover:bg-slate-800 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : 'Verify'}
            </button>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {studentData && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex items-center gap-6">
                <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(studentData.name)}&background=random`} className="w-20 h-20 rounded-lg" alt="User" />
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold">{studentData.name}</h2>
                    <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1">
                      <CheckCircle2 size={10} /> Verified
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono">{studentData.wallet}</p>
                  <div className="flex gap-6 pt-2">
                    <div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Certificates</p>
                      <p className="text-sm font-bold">{studentData.count} Issued</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#111827] p-6 rounded-xl text-white flex flex-col justify-between">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Ledger Status</p>
                <h3 className="text-xl font-bold">Live on Solana</h3>
                <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-bold uppercase">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Verified from uploaded evidence
                </div>
              </div>
            </div>
          )}

          {aiReport && (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
              <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <BrainCircuit className="text-purple-600" />
                  <h3 className="font-bold text-slate-800">AI Skill Verification Report</h3>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Credential Score</p>
                  <p className="text-2xl font-black text-purple-600">
                    {aiReport.overallScore ? `${aiReport.overallScore}%` : '0%'}
                  </p>
                </div>
              </div>

              <div className="p-8 space-y-6">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Verified Skills</p>
                <div className="flex flex-wrap gap-2">
                  {aiReport.skillsVerified?.map((tag) => (
                    <span key={tag} className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="bg-slate-50 p-6 rounded-lg border-l-4 border-purple-500">
                  <p className="text-sm text-slate-600 italic">
                    "{aiReport.summary}"
                  </p>
                </div>

                {aiReport.strongestAreas && aiReport.strongestAreas.length > 0 && (
                  <div className="pt-2 space-y-3">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Strongest Areas</p>
                    <div className="flex flex-wrap gap-2">
                      {aiReport.strongestAreas.map((area) => (
                        <span key={area} className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded">
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {aiReport.skillGaps && aiReport.skillGaps.length > 0 && (
                  <div className="pt-4 space-y-3">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Skill Gaps</p>
                    <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                      {aiReport.skillGaps.map((rec, i) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {aiReport.recommendation && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Hiring Recommendation</p>
                    <p className="mt-2 text-sm text-slate-700">{aiReport.recommendation}</p>
                  </div>
                )}

                <div className="w-full bg-slate-100 rounded-full h-2 mt-6">
                  <div 
                    className="bg-linear-to-r from-purple-500 to-emerald-400 h-2 rounded-full transition-all duration-1000" 
                    style={{ width: `${aiReport.overallScore || 0}%` }}
                  />
                </div>

                <div className="flex gap-4 pt-4 print:hidden">
                  <button 
                    onClick={handleShare}
                    className="px-6 py-2 border border-slate-200 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-slate-50 transition"
                  >
                    {copied ? <Check size={14} className="text-emerald-500" /> : <Share2 size={14} />} 
                    {copied ? 'Link Copied' : 'Share Report'}
                  </button>
                  <button 
                    onClick={handleDownload}
                    className="px-6 py-2 bg-black text-white rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-slate-800 transition"
                  >
                    <Download size={14} /> Download Report
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-100 flex items-center gap-4 shadow-sm hover:shadow-md transition">
              <div className="bg-slate-50 p-4 rounded-lg">
                <QRCodeSVG value={verificationUrl} size={64} />
              </div>
              <div>
                <p className="font-bold text-sm text-slate-800">Scan to Verify</p>
                <p className="text-[10px] text-slate-500 max-w-[150px]">Scan with your phone to test instant mobile verification.</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3">
                <FileSearch className="text-slate-500" size={18} />
                <div>
                  <p className="font-bold text-sm text-slate-800">Verification Inputs</p>
                  <p className="text-[11px] text-slate-500">
                    {getProfile('employer').companyName || 'Employer workspace'} can verify by wallet, profile link, or certificate ID.
                  </p>
                </div>
              </div>
              <code className="mt-4 bg-slate-100 p-3 rounded text-[10px] block font-mono text-slate-600 break-all">
                {studentData?.recentCertId 
                  ? `LATEST CERTIFICATE: ${studentData.recentCertId}`
                  : 'LATEST CERTIFICATE: Awaiting candidate lookup'}
              </code>
            </div>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
};

export default SkillVerifier;
