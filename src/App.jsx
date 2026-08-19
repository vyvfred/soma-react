import { useAuth } from './context/AuthContext.jsx';
import LoginScreen from './components/LoginScreen.jsx';
import AppShell from './components/AppShell.jsx';

export default function App() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="soma-splash">
        <div className="soma-splash-logo">SOMA</div>
        <div className="soma-splash-sub">Chargement…</div>
      </div>
    );
  }

  if (!session || !profile) {
    return <LoginScreen />;
  }

  return <AppShell />;
}
