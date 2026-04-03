import { useState, useEffect } from 'react';
import Sidebar                  from './components/layout/Sidebar';
import ReportsPage              from './features/reports/pages/ReportsPage';
import TransferConversionPage   from './features/transferConversion/pages/TransferConversionPage';
import SelfHangupPage           from './features/selfHangup/pages/SelfHangupPage';
import DateWisePage             from './features/dateWise/pages/DateWisePage';
import DateWiseCampaignPage    from './features/dateWiseCampaign/pages/DateWiseCampaignPage';
import SalesConversionPage     from './features/salesConversion/pages/SalesConversionPage';

function App() {
  const [activePage,  setActivePage]  = useState('drishti-report');
  const [collapsed,   setCollapsed]   = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);

  // auto-close mobile drawer on resize
  useEffect(() => {
    const fn = () => { if (window.innerWidth >= 768) setMobileOpen(false); };
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  const handleNavigate = (id) => {
    setActivePage(id);
    setMobileOpen(false);
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">

      {/* mobile overlay backdrop */}
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
      />

      <main className="flex-1 overflow-y-auto min-w-0">
        {activePage === 'drishti-report' && (
          <ReportsPage onMenuToggle={() => setMobileOpen((o) => !o)} />
        )}
        {activePage === 'transfer-conversion' && (
          <TransferConversionPage onMenuToggle={() => setMobileOpen((o) => !o)} />
        )}
        {activePage === 'self-hangup' && (
          <SelfHangupPage onMenuToggle={() => setMobileOpen((o) => !o)} />
        )}
        {activePage === 'date-wise' && (
          <DateWisePage onMenuToggle={() => setMobileOpen((o) => !o)} />
        )}
        {activePage === 'date-wise-campaign' && (
          <DateWiseCampaignPage onMenuToggle={() => setMobileOpen((o) => !o)} />
        )}
        {activePage === 'sales-conversion' && (
          <SalesConversionPage onMenuToggle={() => setMobileOpen((o) => !o)} />
        )}
      </main>

    </div>
  );
}

export default App;
