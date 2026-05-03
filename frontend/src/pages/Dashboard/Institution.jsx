import { useState, useEffect, useMemo } from 'react';
import { Calendar, Download, Search, ArrowUpRight } from 'lucide-react';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import Sidebar from '../../features/dashboard/Sidebar';
import StatCard from '../../features/dashboard/StatCard';
import ActivityTable from '../../features/dashboard/ActivityTable';
import { useNavigate } from 'react-router-dom';
import { getAllCertificates, getStats } from '../../utils/api';
import { usePortal } from '../../context/PortalContext';

export default function Institution() {
  const navigate = useNavigate();
  const { getProfile, setActiveRole } = usePortal();
  const [stats, setStats] = useState({ totalCertificates: '--', totalStudents: '--' });
  const [searchWallet, setSearchWallet] = useState('');
  const [allCerts, setAllCerts] = useState([]);
  const institutionProfile = getProfile('institution');

  const emptySevenDays = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));
      return {
        label: date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
        mints: 0
      };
    });
  }, []);

  const [chartData, setChartData] = useState(emptySevenDays);

  useEffect(() => {
    setActiveRole('institution');
    getStats().then(res => {
      if (res.success) setStats(res);
    }).catch(() => {});

    getAllCertificates(50).then((res) => {
      if (res.success) {
        setAllCerts(res.certificates);
        
        const today = new Date();
        const lastSevenDays = Array.from({ length: 7 }, (_, index) => {
          const date = new Date(today);
          date.setDate(today.getDate() - (6 - index));
          const key = date.toISOString().slice(0, 10);
          
          const mintsCount = res.certificates.filter((certificate) => (
            (certificate.issueDate || '').toString().slice(0, 10) === key
          )).length;

          return {
            label: date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
            mints: mintsCount
          };
        });
        setChartData(lastSevenDays);
      }
    }).catch(() => {});
  }, [setActiveRole]);

  const handleExport = () => {
    if (allCerts.length === 0) return;
    const headers = ['Certificate ID', 'Student Name', 'Course', 'Wallet', 'IPFS URL', 'Issue Date'];
    const csvRows = [
      headers.join(','),
      ...allCerts.map(c => [
        c.certId,
        `"${c.studentName}"`,
        `"${c.course}"`,
        c.studentWallet,
        c.ipfsUrl,
        c.issueDate
      ].join(','))
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `certachain-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const handleSearch = () => {
    if (searchWallet.trim()) {
      navigate(`/verifier?wallet=${searchWallet.trim()}`);
    }
  };

  const maxCount = useMemo(() => Math.max(...chartData.map((item) => item.mints), 1), [chartData]);

  return (
    <div className="flex min-h-screen bg-[#f8f9ff] flex-col">
      <Navbar />
      <main className="flex-1 w-full">
        <div className="flex items-start">
          <Sidebar />
          <section className="flex-1">
            <div className="max-w-7xl mx-auto w-full px-6 py-10 lg:py-14 space-y-8">
              <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-800">Institution Issuance Hub</h1>
                  <p className="text-sm text-gray-500">
                    Manage academic records for {institutionProfile.institutionName || 'your institution'} across wallet-based and email-based issuance.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 print:hidden">
                  <button className="bg-white border border-gray-200 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-gray-50">
                    <Calendar size={14} /> Last 30 Days
                  </button>
                    <button className="bg-black text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-gray-800" onClick={handleExport}>
                      <Download size={14} /> Export Ledger
                    </button>
                </div>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatCard label="Total Certificates Issued" value={stats.totalCertificates} sub="On-chain records" />
                <StatCard label="Active Students" value={stats.totalStudents} sub="Distinct wallet holders" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-center mb-10">
                    <h3 className="font-bold text-slate-800">Issuance Trends</h3>
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Real certificate records only</p>
                  </div>
                  <div className="flex items-end justify-between h-48 gap-2">
                    {chartData.map((item) => {
                      const val = Number(item.mints) || 0;
                      return (
                        <div key={item.label} className="flex flex-col items-center flex-1 gap-4">
                          <div
                            style={{ height: `${Math.max((val / (maxCount || 1)) * 100, 5)}%` }}
                            className={`w-full rounded-t-sm transition-all ${val > 0 ? 'bg-[#7030d8]' : 'bg-indigo-100'}`}
                          />
                          <span className="text-[10px] font-bold text-gray-400">{item.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-[#111827] p-8 rounded-xl text-white space-y-6">
                  <Search className="text-gray-400" />
                  <div>
                    <h3 className="text-xl font-bold">Student Registry</h3>
                    <p className="text-xs text-gray-400 leading-relaxed mt-2">
                      Locate academic records across the Solana ledger using wallet addresses or jump into the employer verifier.
                    </p>
                  </div>
                  <div className="relative">
                    <input
                      value={searchWallet}
                      onChange={(e) => setSearchWallet(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      placeholder="Enter wallet address..."
                      className="w-full bg-white/5 border border-white/10 rounded-lg py-3 px-4 text-xs focus:outline-none"
                    />
                    <button 
                      onClick={handleSearch}
                      className="absolute right-2 top-2 bg-white text-black p-1 rounded"
                    >
                      <ArrowUpRight size={14} />
                    </button>
                  </div>
                </div>
              </div>

              <ActivityTable />
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
