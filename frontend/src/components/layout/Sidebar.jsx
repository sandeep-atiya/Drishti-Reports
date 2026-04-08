import { BarChart2, TrendingUp, ArrowRightLeft, PhoneOff, CalendarDays, Layers, Users, ChevronLeft, ChevronRight, X } from 'lucide-react';

const NAV = [
  {
    group: 'Reports',
    items: [
      { id: 'drishti-report',       label: 'Drishti Report',       icon: TrendingUp      },
      { id: 'transfer-conversion',  label: 'Transfer Conversion',  icon: ArrowRightLeft  },
      { id: 'self-hangup',          label: 'Self Hangup',          icon: PhoneOff        },
      { id: 'date-wise',            label: 'Date Wise Report',     icon: CalendarDays    },
      { id: 'date-wise-campaign',   label: 'Date Wise Campaign',   icon: Layers          },
      { id: 'sales-conversion',     label: 'Sales Conversion',     icon: Users           },
    ],
  },
];

/* ── Shared nav list ── */
const NavList = ({ activePage, onNavigate, collapsed }) => (
  <nav className="flex-1 px-2 py-4 overflow-y-auto space-y-4">
    {NAV.map((group) => (
      <div key={group.group}>
        {!collapsed && (
          <p className="px-3 mb-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            {group.group}
          </p>
        )}
        {collapsed && <div className="h-px bg-slate-700/40 mx-2 mb-2" />}
        <ul className="space-y-0.5">
          {group.items.map(({ id, label, icon: Icon }) => (
            <li key={id}>
              <button
                onClick={() => onNavigate(id)}
                title={collapsed ? label : undefined}
                className={`w-full flex items-center text-sm font-medium transition-all duration-150 group relative
                  ${collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'}
                  ${activePage === id
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
              >
                <Icon size={16} className="shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}

                {/* tooltip when collapsed */}
                {collapsed && (
                  <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-800 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 shadow-xl border border-slate-700 transition-opacity duration-150">
                    {label}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    ))}
  </nav>
);

/* ── Main Sidebar ── */
const Sidebar = ({ activePage, onNavigate, collapsed, onToggleCollapse, mobileOpen, onMobileClose }) => (
  <>
    {/* ─── Desktop sidebar ─── */}
    <aside
      className={`hidden md:flex flex-col bg-slate-900 text-white shrink-0 h-full transition-[width] duration-300 ease-in-out overflow-hidden
        ${collapsed ? 'w-16' : 'w-60'}`}
    >
      {/* Logo */}
      <div className={`flex items-center h-14 shrink-0 border-b border-slate-700/50 transition-all duration-300
        ${collapsed ? 'justify-center px-0' : 'px-4 gap-3'}`}
      >
        <div className="w-8 h-8 bg-blue-600 flex items-center justify-center shrink-0 shrink-0">
          <BarChart2 size={17} className="text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0 overflow-hidden">
            <p className="text-sm font-bold text-white leading-tight">Drishti</p>
            <p className="text-[10px] text-slate-400">Reports Dashboard</p>
          </div>
        )}
      </div>

      <NavList activePage={activePage} onNavigate={onNavigate} collapsed={collapsed} />

      {/* Collapse toggle */}
      <button
        onClick={onToggleCollapse}
        className={`flex items-center gap-2 mx-2 mb-2 px-3 py-2 text-slate-500 hover:text-white hover:bg-slate-800 transition-colors text-xs font-medium
          ${collapsed ? 'justify-center' : ''}`}
      >
        {collapsed
          ? <ChevronRight size={16} />
          : <><ChevronLeft size={16} /><span>Collapse</span></>
        }
      </button>

      {!collapsed && (
        <div className="px-4 py-3 border-t border-slate-700/50">
          <p className="text-[10px] text-slate-600">v{import.meta.env.VITE_APP_VERSION} · Drishti Reports</p>
        </div>
      )}
    </aside>

    {/* ─── Mobile drawer ─── */}
    <aside
      className={`fixed top-0 left-0 h-full w-64 bg-slate-900 text-white flex flex-col z-30 md:hidden transition-transform duration-300 ease-in-out shadow-2xl
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
    >
      {/* Logo + close */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-slate-700/50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <BarChart2 size={17} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Drishti</p>
            <p className="text-[10px] text-slate-400">Reports Dashboard</p>
          </div>
        </div>
        <button
          onClick={onMobileClose}
          className="text-slate-400 hover:text-white p-1.5 hover:bg-slate-800 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      <NavList activePage={activePage} onNavigate={onNavigate} collapsed={false} />

      <div className="px-4 py-3 border-t border-slate-700/50">
        <p className="text-[10px] text-slate-600">v{import.meta.env.VITE_APP_VERSION} · Drishti Reports</p>
      </div>
    </aside>
  </>
);

export default Sidebar;
