import { useState, useEffect }  from 'react';
import { useAuth }              from './context/AuthContext';
import LoginPage                from './features/auth/pages/LoginPage';
import Sidebar                  from './components/layout/Sidebar';
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
  const [activePage, setActivePage]       = useState('drishti-report');
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

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

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
        {activePage === 'drishti-report'                  && <ReportsPage                       onMenuToggle={() => setMobileOpen((o) => !o)} />}
        {activePage === 'transfer-conversion'             && <TransferConversionPage             onMenuToggle={() => setMobileOpen((o) => !o)} />}
        {activePage === 'self-hangup'                     && <SelfHangupPage                     onMenuToggle={() => setMobileOpen((o) => !o)} />}
        {activePage === 'date-wise'                       && <DateWisePage                       onMenuToggle={() => setMobileOpen((o) => !o)} />}
        {activePage === 'date-wise-campaign'              && <DateWiseCampaignPage               onMenuToggle={() => setMobileOpen((o) => !o)} />}
        {activePage === 'sales-conversion'                && <SalesConversionPage                onMenuToggle={() => setMobileOpen((o) => !o)} />}
        {activePage === 'sales-hyderabad'                 && <SalesHydrabadPage                  onMenuToggle={() => setMobileOpen((o) => !o)} />}
        {activePage === 'doctor-sales'                    && <DoctorSalesPage                    onMenuToggle={() => setMobileOpen((o) => !o)} />}
        {activePage === 'transfer-conversion-unique-calls'&& <TransferConversionUniqueCallsPage  onMenuToggle={() => setMobileOpen((o) => !o)} />}
        {activePage === 'transfer-agent-wise'             && <TransferAgentWisePage              onMenuToggle={() => setMobileOpen((o) => !o)} />}
        {activePage === 'raw-data'                        && <RawDataPage                        onMenuToggle={() => setMobileOpen((o) => !o)} />}
      </main>

    </div>
  );
}

export default App;
