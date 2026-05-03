import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import WalletContextProvider from './components/WalletContextProvider';
import { PortalProvider } from './context/PortalContext';
import LandingPage from './pages/LandingPage';
import StudentProfile from './pages/StudentProfile';
import Overview from './pages/Dashboard/Overview';
import Institution from './pages/Dashboard/Institution';
import SkillVerifier from './pages/SkillVerifier';
import IssueCertificate from './pages/IssueCertificate';
import ClaimCredentials from './pages/ClaimCredentials';
import StudentRegistration from './pages/StudentRegistration';
import EmailCredentialViewer from './pages/EmailCredentialViewer';
import PortalOnboarding from './pages/PortalOnboarding';

export default function App() {
  return (
    <WalletContextProvider>
      <PortalProvider>
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/home" element={<LandingPage />} />
            <Route path="/portal" element={<PortalOnboarding />} />

            <Route path="/profile/:id" element={<StudentProfile />} />
            <Route path="/profile/me" element={<StudentProfile />} />
            <Route path="/student/signup" element={<StudentRegistration />} />
            <Route path="/claim" element={<ClaimCredentials />} />

            <Route path="/dashboard" element={<Overview />} />
            <Route path="/dashboard/overview" element={<Overview />} />
            <Route path="/dashboard/institution" element={<Institution />} />
            <Route path="/dashboard/issue" element={<IssueCertificate />} />
            <Route path="/dashboard/email-viewer" element={<EmailCredentialViewer />} />

            <Route path="/verifier" element={<SkillVerifier />} />
            <Route path="/dashboard/verifier" element={<SkillVerifier />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </PortalProvider>
    </WalletContextProvider>
  );
}
