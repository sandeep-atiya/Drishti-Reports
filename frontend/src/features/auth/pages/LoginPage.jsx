import { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth }      from '../../../context/AuthContext';
import { loginRequest } from '../services/auth.api';

/* ═══════════════════════════════════════════════════════════════════
   CANVAS  —  particle tunnel animation (matches CodePen Three.js look)
═══════════════════════════════════════════════════════════════════ */
function useCanvasAnimation(canvasRef) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let W = (canvas.width  = window.innerWidth);
    let H = (canvas.height = window.innerHeight);
    let mouseX = W / 2;
    let mouseY = H / 2;
    let raf;

    /* ── Tunnel rings (concentric ellipses, perspective z-scroll) ── */
    const RINGS = Array.from({ length: 14 }, (_, i) => ({
      baseR : 60 + i * 55,
      z     : i / 14,          // 0 = far, 1 = near
      rot   : i * 0.18,
      hue   : 170 + i * 8,     // cyan→teal range
      speed : 0.0003 + i * 0.00015,
    }));

    /* ── Flying particles ── */
    const mkParticle = () => {
      const angle = Math.random() * Math.PI * 2;
      const r     = 20 + Math.random() * 220;
      return {
        angle,
        r,
        z   : Math.random(),
        vz  : 0.004 + Math.random() * 0.006,
        cyan: Math.random() > 0.45,   // cyan or green
        size: 0.8 + Math.random() * 2,
      };
    };
    const particles = Array.from({ length: 260 }, mkParticle);

    /* ── Mouse ── */
    const onMouse = (e) => { mouseX = e.clientX; mouseY = e.clientY; };
    window.addEventListener('mousemove', onMouse);

    /* ── Resize ── */
    const onResize = () => {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    let time = 0;

    function draw() {
      raf = requestAnimationFrame(draw);
      time += 0.012;

      /* clear */
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, W, H);

      const cx = W / 2 + (mouseX - W / 2) * 0.04;
      const cy = H / 2 + (mouseY - H / 2) * 0.04;

      /* ── draw tunnel rings ── */
      RINGS.forEach((ring, i) => {
        ring.rot += ring.speed;

        /* perspective: near rings are bigger */
        const scale = 0.3 + ring.z * 0.7;
        const rx    = ring.baseR * scale;
        const ry    = rx * 0.38;
        const alpha = 0.12 + ring.z * 0.3;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(ring.rot + time * 0.04 * (i % 2 === 0 ? 1 : -1));

        /* glow */
        ctx.shadowBlur  = 18;
        ctx.shadowColor = `hsla(${ring.hue},100%,65%,0.6)`;

        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${ring.hue},100%,65%,${alpha})`;
        ctx.lineWidth   = 1.2 + ring.z * 1.5;
        ctx.stroke();
        ctx.restore();
      });

      /* ── draw particles ── */
      /* first pass: connections */
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j];
          /* project to screen */
          const ax = cx + Math.cos(a.angle) * a.r * (0.25 + a.z * 0.75);
          const ay = cy + Math.sin(a.angle) * a.r * 0.38 * (0.25 + a.z * 0.75);
          const bx = cx + Math.cos(b.angle) * b.r * (0.25 + b.z * 0.75);
          const by_ = cy + Math.sin(b.angle) * b.r * 0.38 * (0.25 + b.z * 0.75);
          const dx  = ax - bx, dy = ay - by_;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 90) {
            const alpha = (1 - dist / 90) * 0.35 * Math.min(a.z, b.z);
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(bx, by_);
            ctx.strokeStyle = `rgba(100,200,255,${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      /* second pass: dots */
      particles.forEach((p) => {
        /* advance z (fly toward viewer) */
        p.z += p.vz;
        if (p.z > 1) {
          /* reset to far */
          p.z     = 0;
          p.angle = Math.random() * Math.PI * 2;
          p.r     = 20 + Math.random() * 220;
        }

        const scale = 0.25 + p.z * 0.75;
        const px    = cx + Math.cos(p.angle) * p.r * scale;
        const py    = cy + Math.sin(p.angle) * p.r * 0.38 * scale;
        const radius = p.size * scale * 1.6;

        const col = p.cyan ? '100,200,255' : '0,255,136';
        const alpha = 0.3 + p.z * 0.7;

        /* glow gradient */
        const grad = ctx.createRadialGradient(px, py, 0, px, py, radius * 3.5);
        grad.addColorStop(0,   `rgba(${col},${alpha})`);
        grad.addColorStop(0.4, `rgba(${col},${alpha * 0.4})`);
        grad.addColorStop(1,   `rgba(${col},0)`);

        ctx.beginPath();
        ctx.arc(px, py, radius * 3.5, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        /* solid core */
        ctx.beginPath();
        ctx.arc(px, py, radius * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${col},${Math.min(alpha * 1.4, 1)})`;
        ctx.fill();
      });

      /* ── animated scan line ── */
      const scanY = (cy - 180) + ((Math.sin(time * 0.5) + 1) / 2) * 360;
      const scanGrad = ctx.createLinearGradient(0, scanY - 2, 0, scanY + 2);
      scanGrad.addColorStop(0,   'rgba(100,200,255,0)');
      scanGrad.addColorStop(0.5, 'rgba(100,200,255,0.06)');
      scanGrad.addColorStop(1,   'rgba(100,200,255,0)');
      ctx.fillStyle = scanGrad;
      ctx.fillRect(0, scanY - 2, W, 4);
    }

    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('resize', onResize);
    };
  }, []);
}

/* ═══════════════════════════════════════════════════════════════════
   LOGIN PAGE COMPONENT
═══════════════════════════════════════════════════════════════════ */
export default function LoginPage() {
  const canvasRef = useRef(null);
  useCanvasAnimation(canvasRef);

  const { login }                   = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password,   setPassword]   = useState('');
  const [showPass,   setShowPass]   = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) return;
    setLoading(true);
    setError('');
    try {
      const data = await loginRequest({ login: identifier.trim(), password });
      setSuccess(true);
      setTimeout(() => login(data.token, data.user), 800);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Access denied.');
    } finally {
      setLoading(false);
    }
  };

  /* ── shared input handlers ── */
  const iFocus = (e) => {
    e.target.style.background   = 'rgba(100,200,255,0.10)';
    e.target.style.borderColor  = 'rgba(100,200,255,0.65)';
    e.target.style.boxShadow    = 'inset 0 0 20px rgba(100,200,255,0.10), 0 0 40px rgba(100,200,255,0.30)';
  };
  const iBlur = (e) => {
    e.target.style.background   = 'rgba(100,200,255,0.05)';
    e.target.style.borderColor  = 'rgba(100,200,255,0.20)';
    e.target.style.boxShadow    = 'inset 0 0 20px rgba(100,200,255,0.02)';
  };

  const inputStyle = {
    width: '100%', padding: '14px 18px',
    background: 'rgba(100,200,255,0.05)',
    border: '2px solid rgba(100,200,255,0.20)',
    borderRadius: '12px',
    color: '#ffffff', fontSize: '15px',
    transition: 'all 0.4s ease',
    outline: 'none',
    fontFamily: 'inherit',
    boxShadow: 'inset 0 0 20px rgba(100,200,255,0.02)',
  };

  const labelStyle = {
    display: 'block',
    color: '#64c8ff',
    fontSize: '12px',
    marginBottom: '10px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '1.5px',
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#000' }}>

      {/* ── animated canvas background ── */}
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
      />

      {/* ── success banner ── */}
      <div style={{
        position: 'absolute', top: 36, left: '50%', transform: 'translateX(-50%)',
        background: 'linear-gradient(135deg,#00ff88,#64c8ff)',
        color: '#000', padding: '16px 32px', borderRadius: '12px',
        fontWeight: 700, fontSize: '15px', letterSpacing: '1px',
        boxShadow: '0 0 50px rgba(0,255,136,0.6)',
        zIndex: 20,
        opacity: success ? 1 : 0,
        transition: 'opacity 0.3s ease',
        pointerEvents: 'none',
      }}>
        ✓ Access Granted
      </div>

      {/* ── login card ── */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'rgba(10,10,25,0.90)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        padding: '50px',
        borderRadius: '25px',
        border: '2px solid rgba(100,200,255,0.30)',
        width: '90%', maxWidth: '450px',
        zIndex: 10,
        animation: 'glowPulse 3s ease-in-out infinite',
      }}>

        {/* Brand title */}
        <h1 style={{
          marginBottom: '12px', fontSize: '34px',
          textAlign: 'center', fontWeight: 800,
          letterSpacing: '6px', lineHeight: 1,
          background: 'linear-gradient(135deg,#64c8ff,#00ff88)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          DRISHTI
        </h1>

        <p style={{
          color: '#94a3b8', textAlign: 'center',
          marginBottom: '38px', fontSize: '12px',
          textTransform: 'uppercase', letterSpacing: '3px',
        }}>
          Enter the network
        </p>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(255,60,60,0.10)',
            border: '1.5px solid rgba(255,80,80,0.35)',
            borderRadius: '10px', padding: '12px 16px',
            marginBottom: '22px',
            color: '#ff7070', fontSize: '13.5px',
            textAlign: 'center', letterSpacing: '.3px',
          }}>
            ⚠ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>

          {/* Username / Email */}
          <div style={{ marginBottom: '24px' }}>
            <label style={labelStyle}>Username or Email</label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="you@example.com"
              autoComplete="username"
              autoFocus
              disabled={loading}
              style={inputStyle}
              onFocus={iFocus}
              onBlur={iBlur}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: '10px' }}>
            <label style={labelStyle}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={loading}
                style={{ ...inputStyle, paddingRight: '50px' }}
                onFocus={iFocus}
                onBlur={iBlur}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPass((s) => !s)}
                style={{
                  position: 'absolute', right: '16px', top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none',
                  color: '#64c8ff', cursor: 'pointer', padding: 0,
                  display: 'flex', alignItems: 'center',
                  opacity: 0.75, transition: 'opacity .2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.75)}
              >
                {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !identifier.trim() || !password}
            style={{
              width: '100%', padding: '15px',
              background: (loading || !identifier.trim() || !password)
                ? 'linear-gradient(135deg,rgba(0,180,80,0.4),rgba(60,140,200,0.4))'
                : 'linear-gradient(135deg,#00ff88 0%,#64c8ff 100%)',
              border: 'none', borderRadius: '12px',
              color: '#000000', fontSize: '16px', fontWeight: 700,
              cursor: (loading || !identifier.trim() || !password) ? 'not-allowed' : 'pointer',
              transition: 'all 0.4s ease',
              marginTop: '22px',
              textTransform: 'uppercase', letterSpacing: '2px',
              boxShadow: (loading || !identifier.trim() || !password)
                ? 'none'
                : '0 0 40px rgba(0,255,136,0.4), 0 10px 30px rgba(100,200,255,0.25)',
              fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            }}
            onMouseEnter={(e) => {
              if (!e.currentTarget.disabled) {
                e.currentTarget.style.transform  = 'translateY(-4px)';
                e.currentTarget.style.boxShadow  = '0 0 70px rgba(0,255,136,0.65), 0 20px 50px rgba(100,200,255,0.45)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              if (!e.currentTarget.disabled)
                e.currentTarget.style.boxShadow = '0 0 40px rgba(0,255,136,0.4), 0 10px 30px rgba(100,200,255,0.25)';
            }}
            onMouseDown={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.transform = 'translateY(-1px)'; }}
          >
            {loading ? (
              <>
                <svg style={{ animation: 'spin .7s linear infinite', flexShrink: 0 }}
                  width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="rgba(0,0,0,0.25)" strokeWidth="3" />
                  <path fill="black" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Connecting…
              </>
            ) : 'Access'}
          </button>

        </form>

        {/* Footer */}
        <p style={{
          textAlign: 'center', marginTop: '28px',
          color: '#355a70', fontSize: '12.5px', letterSpacing: '.5px',
        }}>
          v{import.meta.env.VITE_APP_VERSION || '1.0.0'} · Drishti Reports
        </p>
      </div>

      {/* ── global keyframes ── */}
      <style>{`
        @keyframes glowPulse {
          0%,100% { box-shadow: 0 0 100px rgba(100,200,255,0.20), inset 0 0 50px rgba(100,200,255,0.05); }
          50%      { box-shadow: 0 0 160px rgba(100,200,255,0.42), inset 0 0 80px rgba(100,200,255,0.10); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        #login-username::placeholder, #login-password::placeholder { color: #4a7a99; }
        input:-webkit-autofill,
        input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 100px rgba(10,10,25,1) inset !important;
          -webkit-text-fill-color: #ffffff !important;
          caret-color: #64c8ff;
        }
      `}</style>
    </div>
  );
}
