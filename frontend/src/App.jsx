import { useState, useEffect }  from 'react';
import { useAuth }              from './context/AuthContext';
import LoginPage                from './features/auth/pages/LoginPage';
import Sidebar                  from './components/layout/Sidebar';
import DashboardPage            from './features/dashboard/pages/DashboardPage';
import ReportsPage              from './features/reports/pages/ReportsPage';
import TransferConversionPage   from './features/transferConversion/pages/TransferConversionPage';
import SelfHangupPage           from './features/selfHangup/pages/SelfHangupPage';
import DateWisePage             from './features/dateWise/pages/DateWisePage';
import DateWiseCampaignPage     from './features/dateWiseCampaign/pages/DateWiseCampaignPage';
import SalesConversionPage      from './features/salesConversion/pages/SalesConversionPage';
import SalesHydrabadPage        from './features/salesHyderabad/pages/SalesHydrabadPage';
import DoctorSalesPage          from './features/doctorSales/pages/DoctorSalesPage';
import RawDataPage              from './features/rawData/pages/RawDataPage';
import TransferConversionUniqueCallsPage from './features/transferConversionUniqueCalls/pages/TransferConversionUniqueCallsPage';
import TransferAgentWisePage    from './features/transferAgentWise/pages/TransferAgentWisePage';

function App() {
  const { isAuthenticated, user, logout } = useAuth();
  const [activePage, setActivePage]       = useState('dashboard');
  const [collapsed,  setCollapsed]        = useState(false);
  const [mobileOpen, setMobileOpen]       = useState(false);

  useEffect(() => {
    const fn = () => { if (window.innerWidth >= 768) setMobileOpen(false); };
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  if (!isAuthenticated) return <LoginPage />;

  const handleNavigate = (id) => {
    setActivePage(id);
    setMobileOpen(false);
  };

  const menuToggle = () => setMobileOpen((o) => !o);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f0f2f8' }}>

      <Sidebar
        activePage={activePage}
        onNavigate={handleNavigate}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        user={user}
        onLogout={logout}
      />

      <main className="flex-1 overflow-y-auto min-w-0">
        {activePage === 'dashboard'                        && <DashboardPage                      onNavigate={handleNavigate} onMenuToggle={menuToggle} user={user} />}
        {activePage === 'drishti-report'                   && <ReportsPage                        onMenuToggle={menuToggle} />}
        {activePage === 'transfer-conversion'              && <TransferConversionPage              onMenuToggle={menuToggle} />}
        {activePage === 'self-hangup'                      && <SelfHangupPage                     onMenuToggle={menuToggle} />}
        {activePage === 'date-wise'                        && <DateWisePage                       onMenuToggle={menuToggle} />}
        {activePage === 'date-wise-campaign'               && <DateWiseCampaignPage               onMenuToggle={menuToggle} />}
        {activePage === 'sales-conversion'                 && <SalesConversionPage                onMenuToggle={menuToggle} />}
        {activePage === 'sales-hyderabad'                  && <SalesHydrabadPage                  onMenuToggle={menuToggle} />}
        {activePage === 'doctor-sales'                     && <DoctorSalesPage                    onMenuToggle={menuToggle} />}
        {activePage === 'transfer-conversion-unique-calls' && <TransferConversionUniqueCallsPage  onMenuToggle={menuToggle} />}
        {activePage === 'transfer-agent-wise'              && <TransferAgentWisePage              onMenuToggle={menuToggle} />}
        {activePage === 'raw-data'                         && <RawDataPage                        onMenuToggle={menuToggle} />}
      </main>

    </div>
  );
}

export default App;
