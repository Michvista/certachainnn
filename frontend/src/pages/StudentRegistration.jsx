import { Navigate } from 'react-router-dom';

export default function StudentRegistration() {
  return <Navigate to="/portal?role=student" replace />;
}
