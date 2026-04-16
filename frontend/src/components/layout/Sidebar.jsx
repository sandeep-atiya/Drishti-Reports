import {
  BarChart2, TrendingUp, ArrowRightLeft, PhoneOff, CalendarDays,
  Layers, Users, ChevronLeft, ChevronRight, X, LogOut, Database, LayoutDashboard,
} from 'lucide-react';

// ── Sidebar gradient (matches Python analytics.html exactly) ──────────────────
const SB_GRADIENT = 'linear-gradient(168deg,#1e1b4b 0%,#312e81 30%,#4338ca 65%,#7c3aed 100%)';

const NAV = [
  {
    group: 'Main',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: 'New' },
    ],
  },
  {
    group: 'Reports',
    items: [
      { id: 'drishti-report',                    label: 'Drishti Report',                    icon: TrendingUp     },
      { id: 'transfer-conversion',               label: 'Transfer Conversion',               icon: ArrowRightLeft },
      { id: 'transfer-conversion-unique-calls',  label: 'Transfer Unique Calls',             icon: ArrowRightLeft },
      { id: 'transfer-agent-wise',               label: 'Agent Wise Transfer',               icon: Users          },
      { id: 'self-hangup',                       label: 'Self Hangup',                       icon: PhoneOff       },
      { id: 'date-wise',                         label: 'Date Wise Report',                  icon: CalendarDays   },
      { id: 'date-wise-campaign',                label: 'Date Wise Campaign',                icon: Layers         },
      { id: 'sales-conversion',                  label: 'Sales Conversion',                  icon: Users          },
      { id: 'sales-hyderabad',                   label: 'Sales Hyderabad',                   icon: Users          },
      { id: 'doctor-sales',                      label: 'Doctor Sales',                      icon: Users          },
      { id: 'raw-data',                          label: 'Raw Data Explorer',                 icon: Database,  badge: 'PG' },
    ],
  },
];

// ── Logo area ─────────────────────────────────────────────────────────────────
const Logo = ({ collapsed }) => (
  <div
    className="flex items-center shrink-0"
    style={{
      padding: collapsed ? '18px 0 14px' : '18px 16px 14px',
      borderBottom: '1px solid rgba(255,255,255,.1)',
      justifyContent: collapsed ? 'center' : 'flex-start',
      gap: collapsed ? 0 : '10px',
    }}
  >
    <div
      style={{
        width: 38, height: 38, flexShrink: 0,
        background: 'rgba(255,255,255,.15)',
        borderRadius: '11px',
        border: '1px solid rgba(255,255,255,.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <BarChart2 size={19} color="white" />
    </div>
    {!collapsed && (
      <div style={{ minWidth: 0 }}>
        <p style={{ color: '#fff', fontWeight: 800, fontSize: '14px', letterSpacing: '-.3px', lineHeight: 1.2 }}>
          Drishti
        </p>
        <p style={{ fontSize: '10px', color: 'rgba(255,255,255,.5)', fontWeight: 400, letterSpacing: '.8px', textTransform: 'uppercase', marginTop: '1px' }}>
          Reports Dashboard
        </p>
      </div>
    )}
  </div>
);

// ── Nav list ──────────────────────────────────────────────────────────────────
const NavList = ({ activePage, onNavigate, collapsed }) => (
  <nav style={{ padding: '14px 10px', flex: 1, overflowY: 'auto' }}>
    {NAV.map((group) => (
      <div key={group.group}>
        {!collapsed && (
          <p style={{
            fontSize: '9.5px', fontWeight: 700,
            color: 'rgba(255,255,255,.35)',
            letterSpacing: '1.2px', textTransform: 'uppercase',
            padding: '8px 10px 5px',
          }}>
            {group.group}
          </p>
        )}
        {collapsed && (
          <div style={{ height: '1px', background: 'rgba(255,255,255,.1)', margin: '8px 8px 6px' }} />
        )}

        <ul style={{ listStyle: 'none', marginBottom: '2px' }}>
          {group.items.map(({ id, label, icon: Icon, badge }) => {
            const isActive = activePage === id;
            return (
              <li key={id} style={{ marginBottom: '1px', position: 'relative' }}>
                <button
                  onClick={() => onNavigate(id)}
                  title={collapsed ? label : undefined}
                  className="group"
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center',
                    gap: collapsed ? 0 : '9px',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    padding: collapsed ? '9px 0' : '9px 11px',
                    borderRadius: '10px',
                    background: isActive ? 'rgba(255,255,255,.16)' : 'transparent',
                    color: isActive ? '#fff' : 'rgba(255,255,255,.65)',
                    boxShadow: isActive ? '0 2px 10px rgba(0,0,0,.2)' : 'none',
                    cursor: 'pointer', border: 'none',
                    fontSize: '13px', fontWeight: 500,
                    fontFamily: 'inherit',
                    transition: 'all .15s',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(255,255,255,.1)';
                      e.currentTarget.style.color = '#fff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'rgba(255,255,255,.65)';
                    }
                  }}
                >
                  {/* Active left accent bar */}
                  {isActive && (
                    <span style={{
                      position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                      width: '3px', height: '22px',
                      background: '#a5b4fc', borderRadius: '0 3px 3px 0',
                    }} />
                  )}

                  <Icon size={15} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.75 }} />

                  {!collapsed && (
                    <>
                      <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {label}
                      </span>
                      {badge && (
                        <span style={{
                          marginLeft: 'auto',
                          background: 'linear-gradient(135deg,#a78bfa,#60a5fa)',
                          color: '#fff', fontSize: '9.5px', fontWeight: 700,
                          padding: '2px 7px', borderRadius: '20px', letterSpacing: '.3px',
                        }}>
                          {badge}
                        </span>
                      )}
                    </>
                  )}

                  {/* Collapsed tooltip */}
                  {collapsed && (
                    <span
                      className="group-hover:opacity-100"
                      style={{
                        position: 'absolute', left: '100%', marginLeft: '12px',
                        padding: '6px 10px',
                        background: '#1e1b4b',
                        color: '#fff', fontSize: '12px', whiteSpace: 'nowrap',
                        opacity: 0, pointerEvents: 'none', zIndex: 50,
                        boxShadow: '0 4px 16px rgba(0,0,0,.3)',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,.1)',
                        transition: 'opacity .15s',
                      }}
                    >
                      {label}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    ))}
  </nav>
);

// ── User panel ────────────────────────────────────────────────────────────────
const UserPanel = ({ user, onLogout, collapsed }) => {
  const name    = user?.fullName || user?.username || 'User';
  const initials = name.slice(0, 2).toUpperCase();
  const email   = user?.email || '';

  return (
    <div style={{
      padding: collapsed ? '12px 10px 16px' : '12px 10px 16px',
      borderTop: '1px solid rgba(255,255,255,.1)',
    }}>
      {collapsed ? (
        <button
          onClick={onLogout}
          title="Sign out"
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '8px', borderRadius: '8px', border: 'none',
            background: 'transparent', color: 'rgba(255,255,255,.5)',
            cursor: 'pointer', transition: 'all .15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,.1)';
            e.currentTarget.style.color = '#fff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'rgba(255,255,255,.5)';
          }}
        >
          <LogOut size={15} />
        </button>
      ) : (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '9px',
          padding: '9px 10px', borderRadius: '10px',
          background: 'rgba(255,255,255,.08)',
          border: '1px solid rgba(255,255,255,.1)',
        }}>
          {/* Avatar */}
          <div style={{
            width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg,#a78bfa,#60a5fa)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: '12px',
          }}>
            {initials}
          </div>
          {/* Name + email */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: '#fff', fontWeight: 600, fontSize: '12.5px', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {name}
            </p>
            {email && (
              <p style={{ color: 'rgba(255,255,255,.4)', fontSize: '10.5px', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {email}
              </p>
            )}
          </div>
          {/* Logout */}
          <button
            onClick={onLogout}
            title="Sign out"
            style={{
              width: 28, height: 28, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '7px', border: 'none', background: 'transparent',
              color: 'rgba(255,255,255,.4)', cursor: 'pointer', transition: 'all .15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,.12)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'rgba(255,255,255,.4)';
            }}
          >
            <LogOut size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

// ── Collapse toggle ───────────────────────────────────────────────────────────
const CollapseBtn = ({ collapsed, onToggle }) => (
  <button
    onClick={onToggle}
    title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    style={{
      display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start',
      gap: '7px', margin: '0 10px 4px', padding: '7px 10px',
      borderRadius: '8px', border: 'none', background: 'transparent',
      color: 'rgba(255,255,255,.3)', cursor: 'pointer', fontSize: '11.5px',
      fontWeight: 600, fontFamily: 'inherit', transition: 'all .15s',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = 'rgba(255,255,255,.08)';
      e.currentTarget.style.color = 'rgba(255,255,255,.7)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = 'transparent';
      e.currentTarget.style.color = 'rgba(255,255,255,.3)';
    }}
  >
    {collapsed ? <ChevronRight size={15} /> : <><ChevronLeft size={15} /><span>Collapse</span></>}
  </button>
);

// ── Main Sidebar ──────────────────────────────────────────────────────────────
const Sidebar = ({ activePage, onNavigate, collapsed, onToggleCollapse, mobileOpen, onMobileClose, user, onLogout }) => (
  <>
    {/* ─── Desktop sidebar ─── */}
    <aside
      className="hidden md:flex flex-col shrink-0 h-full overflow-hidden"
      style={{
        width: collapsed ? '64px' : '240px',
        background: SB_GRADIENT,
        transition: 'width .3s ease',
        boxShadow: '4px 0 24px rgba(67,56,202,.25)',
      }}
    >
      <Logo collapsed={collapsed} />
      <NavList activePage={activePage} onNavigate={onNavigate} collapsed={collapsed} />
      <CollapseBtn collapsed={collapsed} onToggle={onToggleCollapse} />
      <UserPanel user={user} onLogout={onLogout} collapsed={collapsed} />
    </aside>

    {/* ─── Mobile overlay ─── */}
    {mobileOpen && (
      <div
        className="fixed inset-0 z-20 md:hidden"
        style={{ background: 'rgba(0,0,0,.55)' }}
        onClick={onMobileClose}
      />
    )}

    {/* ─── Mobile drawer ─── */}
    <aside
      className="fixed top-0 left-0 h-full flex flex-col z-30 md:hidden"
      style={{
        width: '256px',
        background: SB_GRADIENT,
        boxShadow: '4px 0 24px rgba(67,56,202,.3)',
        transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform .3s ease',
      }}
    >
      {/* Logo + close */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,.1)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 34, height: 34,
            background: 'rgba(255,255,255,.15)',
            borderRadius: '10px', border: '1px solid rgba(255,255,255,.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <BarChart2 size={17} color="white" />
          </div>
          <div>
            <p style={{ color: '#fff', fontWeight: 800, fontSize: '13px', letterSpacing: '-.3px' }}>Drishti</p>
            <p style={{ color: 'rgba(255,255,255,.45)', fontSize: '9.5px', letterSpacing: '.8px', textTransform: 'uppercase' }}>Reports Dashboard</p>
          </div>
        </div>
        <button
          onClick={onMobileClose}
          style={{
            width: 30, height: 30, border: 'none',
            background: 'rgba(255,255,255,.08)', borderRadius: '8px',
            color: 'rgba(255,255,255,.6)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <X size={16} />
        </button>
      </div>

      <NavList activePage={activePage} onNavigate={onNavigate} collapsed={false} />
      <UserPanel user={user} onLogout={onLogout} collapsed={false} />
    </aside>
  </>
);

export default Sidebar;
