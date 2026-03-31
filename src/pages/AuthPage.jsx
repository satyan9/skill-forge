import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, API_BASE } from '../context/AuthContext';

/* ── GOOGLE GSI one-tap init ── */
function initGoogleSignIn(callback) {
  if (window.google && window.google.accounts) {
    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
      callback,
    });
    window.google.accounts.id.prompt();
  }
}

export default function AuthPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // mode: 'login' | 'signup'
  const [mode, setMode] = useState('login');

  // signup sub-step: 1 = name+email, 2 = otp, 3 = password
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [rememberMe, setRememberMe] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [preAuthToken, setPreAuthToken] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const [strength, setStrength] = useState(0);
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['', '#ff5e7a', '#ff9900', '#f0d060', '#00d4aa'];

  const canvasRef = useRef(null);
  const otpRefs = useRef([]);

  useEffect(() => {
    if (isAuthenticated) navigate('/skill-pilot', { replace: true });

    // Check for OAuth callbacks
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const provider = params.get('state'); // Passed via state
    if (code && (provider === 'github' || provider === 'facebook')) {
      handleOAuthCallback(code, provider);
    }
  }, [isAuthenticated, navigate]);

  async function handleOAuthCallback(code, provider) {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/${provider}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, redirectUri: window.location.origin + window.location.pathname }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.message || `${provider} sign-in failed.`); return; }
      login(data.token, data.user, true);
    } catch { setError(`${provider} sign-in failed.`); }
    finally {
      window.history.replaceState({}, document.title, window.location.pathname);
      setLoading(false);
    }
  }

  // Star field canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let id, W = canvas.width = innerWidth, H = canvas.height = innerHeight;
    const stars = Array.from({ length: 100 }, () => ({
      x: Math.random()*W, y: Math.random()*H, r: Math.random()*1.3+.2,
      speed: Math.random()*.25+.05, opacity: Math.random()*.5+.1,
      twinkle: Math.random()*Math.PI*2, hue: Math.random()>.7?270:172,
    }));
    function draw() {
      ctx.clearRect(0,0,W,H);
      stars.forEach(s => {
        s.twinkle+=.018; s.y-=s.speed;
        if(s.y<0){s.y=H;s.x=Math.random()*W;}
        const a=s.opacity*(0.6+0.4*Math.sin(s.twinkle));
        ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
        ctx.fillStyle=`hsla(${s.hue},80%,70%,${a})`; ctx.fill();
      });
      id=requestAnimationFrame(draw);
    }
    draw();
    const onResize=()=>{W=canvas.width=innerWidth;H=canvas.height=innerHeight;};
    window.addEventListener('resize',onResize);
    return()=>{cancelAnimationFrame(id);window.removeEventListener('resize',onResize);};
  }, []);

  // Resend countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const iv = setInterval(() => setResendTimer(t => t - 1), 1000);
    return () => clearInterval(iv);
  }, [resendTimer]);

  // Google GSI script
  useEffect(() => {
    if (!document.getElementById('gsi-script')) {
      const s = document.createElement('script');
      s.id = 'gsi-script';
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      document.head.appendChild(s);
    }
  }, []);

  function handleChange(e) {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
    setError('');
  }

  function handleOtpChange(idx, val) {
    const digits = [...otp];
    digits[idx] = val.replace(/\D/g, '').slice(-1);
    setOtp(digits);
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
  }

  function handleOtpKeyDown(idx, e) {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) otpRefs.current[idx - 1]?.focus();
  }

  function handleOtpPaste(e) {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const digits = [...otp];
    paste.split('').forEach((ch, i) => { digits[i] = ch; });
    setOtp(digits);
    otpRefs.current[Math.min(paste.length, 5)]?.focus();
  }

  function checkStrength(pw) {
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    setStrength(s);
  }

  /* ── SEND OTP ── */
  async function sendOtp() {
    setError(''); setSuccessMsg('');
    if (mode === 'signup' && !form.name.trim()) { setError('Please enter your full name.'); return; }
    if (!form.email || !/^\S+@\S+\.\S+$/.test(form.email)) { setError('Please enter a valid email address.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/send-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, purpose: mode === 'forgot' ? 'reset' : 'register' }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.message || 'Failed to send OTP.'); return; }
      setSuccessMsg(`Verification code sent! Check your inbox (and spam folder).`);
      setOtp(['', '', '', '', '', '']);
      setStep(2);
      setResendTimer(30);
      setTimeout(() => otpRefs.current[0]?.focus(), 300);
    } catch { setError('Network error. Please check your internet connection.'); }
    finally { setLoading(false); }
  }

  /* ── VERIFY OTP ── */
  async function verifyOtp() {
    setError('');
    const code = otp.join('');
    if (code.length !== 6) { setError('Please enter all 6 digits.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, otp: code, purpose: mode === 'forgot' ? 'reset' : 'register' }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.message || 'Invalid OTP.'); return; }
      setPreAuthToken(data.preAuthToken);
      setStep(3);
    } catch { setError('Network error.'); }
    finally { setLoading(false); }
  }

  /* ── COMPLETE SIGNUP ── */
  async function completeSignup() {
    setError('');
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password, preAuthToken }),
      });
      const data = await res.json();
      if (!data.success) {
        const msg = data.errors ? data.errors[0].msg : (data.message || 'Registration failed.');
        setError(msg);
        if (data.message?.includes('verification')) setStep(2);
        return;
      }
      login(data.token, data.user, true);
      setDone(true);
      setTimeout(() => navigate('/skill-pilot', { replace: true }), 1800);
    } catch { setError('Network error.'); }
    finally { setLoading(false); }
  }

  /* ── RESET PASSWORD ── */
  async function handleResetPassword() {
    setError('');
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password, preAuthToken }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.message || 'Reset failed.'); return; }
      setSuccessMsg('Password has been reset successfully!');
      setTimeout(() => {
        setMode('login');
        setStep(1);
        setForm({ ...form, password: '', confirm: '' });
        setSuccessMsg('');
      }, 2000);
    } catch { setError('Network error.'); }
    finally { setLoading(false); }
  }

  /* ── LOGIN ── */
  async function handleLogin(e) {
    e.preventDefault(); setError('');
    if (!form.email || !form.password) { setError('Please enter your email and password.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.message || 'Login failed.'); return; }
      login(data.token, data.user, rememberMe);
      setDone(true);
      setTimeout(() => navigate('/skill-pilot', { replace: true }), 1500);
    } catch { setError('Network error. Is the server running?'); }
    finally { setLoading(false); }
  }

  /* ── GOOGLE ── */
  async function handleGoogle() {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || clientId.includes('your_')) return showToast('Google login is not yet configured on this server.');

    initGoogleSignIn(async (response) => {
      try {
        const res = await fetch(`${API_BASE}/auth/google`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: response.credential }),
        });
        const data = await res.json();
        if (!data.success) { setError(data.message || 'Google sign-in failed.'); return; }
        login(data.token, data.user, true);
        navigate('/skill-pilot', { replace: true });
      } catch { setError('Google sign-in failed.'); }
    });
  }

  /* ── GITHUB ── */
  function handleGithub() {
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
    if (!clientId || clientId.includes('your_')) return showToast('GitHub login is not yet configured on this server.');
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=user:email&redirect_uri=${window.location.origin}/auth&state=github`;
  }

  /* ── FACEBOOK ── */
  function handleFacebook() {
    const clientId = import.meta.env.VITE_FACEBOOK_CLIENT_ID;
    if (!clientId || clientId.includes('your_')) return showToast('Facebook login is not yet configured on this server.');
    window.location.href = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${clientId}&scope=email,public_profile&redirect_uri=${window.location.origin}/auth&state=facebook`;
  }

  function showToast(msg) { setError(msg); setTimeout(() => setError(''), 4000); }

  function flip(newMode) {
    setMode(typeof newMode === 'string' ? newMode : (mode === 'login' ? 'signup' : 'login'));
    setStep(1); setError(''); setSuccessMsg('');
    setForm({ name: '', email: '', password: '', confirm: '' });
    setOtp(['', '', '', '', '', '']);
    setDone(false);
  }

  async function resendOtp() {
    setResendTimer(30);
    setOtp(['', '', '', '', '', '']);
    setError(''); setSuccessMsg('');
    try {
      const res = await fetch(`${API_BASE}/auth/send-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, purpose: mode === 'forgot' ? 'reset' : 'register' }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('New code sent! Check your inbox.');
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      } else setError(data.message || 'Failed to resend.');
    } catch { setError('Network error.'); }
  }

  // ─── RENDER ───────────────────────────────────
  return (
    <div style={s.root}>
      <canvas ref={canvasRef} style={s.canvas} />
      <div style={s.orb1} /><div style={s.orb2} /><div style={s.orb3} />

      <div style={s.scene}>
        <div style={s.card}>
          <div style={s.shimmer} />

          {/* Logo */}
          <div style={s.logo}>
            <div style={s.logoMark}>⚡</div>
            <span style={s.logoText}>SkillPilot</span>
            <span style={s.logoBadge}>AI</span>
          </div>

          {done && (
            <div style={s.successOverlay}>
              <div style={s.successRing}>✓</div>
              <div style={s.successText}>{mode === 'login' ? 'Welcome back!' : 'Account created!'}</div>
              <div style={s.successSub}>Redirecting…</div>
            </div>
          )}

          {/* ─── LOGIN ─── */}
          {mode === 'login' && (
            <>
              <h1 style={s.heading}>Welcome<br /><em style={s.em}>back.</em></h1>
              <p style={s.sub}>Sign in to continue your AI-powered journey</p>

              {error && <div style={s.errorBox}>⚠ {error}</div>}

              <form onSubmit={handleLogin}>
                <Field label="Email Address" icon="email">
                  <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@example.com" style={s.input} autoComplete="email" />
                </Field>
                <Field label="Password" icon="lock">
                  <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="••••••••" style={s.input} autoComplete="current-password" />
                </Field>

                <div style={s.rowFlex}>
                  <label style={s.checkLabel}>
                    <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} style={{ display: 'none' }} />
                    <span style={{ ...s.checkBox, borderColor: rememberMe ? '#6c63ff' : 'rgba(255,255,255,.12)' }}>
                      {rememberMe && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6c63ff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                    </span>
                    Remember me
                  </label>
                  <a href="#" onClick={(e) => { e.preventDefault(); flip('forgot'); }} style={s.link}>Forgot password?</a>
                </div>

                <Btn type="submit" loading={loading} text="Sign In" />
              </form>

              <SocialSection onGoogle={handleGoogle} onFacebook={handleFacebook} onGithub={handleGithub} />
              <div style={s.switchPrompt}>Don't have an account? <button style={s.switchBtn} onClick={flip}>Create one →</button></div>

              <div style={s.statRow}>
                {[['12K+','Users'],['99%','Uptime'],['4.9★','Rating']].map(([n,l])=>(
                  <div key={l} style={s.stat}><span style={s.statNum}>{n}</span><span style={s.statLabel}>{l}</span></div>
                ))}
              </div>
            </>
          )}

          {/* ─── SIGNUP ─── */}
          {mode === 'signup' && (
            <>
              {/* Step dots */}
              <div style={s.stepDots}>
                {[1,2,3].map(n => (
                  <div key={n} style={{ ...s.stepDot, background: n < step ? '#00d4aa' : n === step ? '#6c63ff' : 'rgba(255,255,255,.1)' }} />
                ))}
                <span style={s.stepLabel}>Step {step} of 3</span>
              </div>

              {error && <div style={s.errorBox}>⚠ {error}</div>}
              {successMsg && <div style={s.successBox}>✉ {successMsg}</div>}

              {/* Step 1 */}
              {step === 1 && (
                <>
                  <h1 style={s.heading}>Join the<br /><em style={s.em}>journey.</em></h1>
                  <p style={s.sub}>Create your account and start forging skills</p>
                  <Field label="Full Name" icon="user"><input name="name" type="text" value={form.name} onChange={handleChange} placeholder="Jane Doe" style={s.input} autoComplete="name" /></Field>
                  <Field label="Email Address" icon="email"><input name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@example.com" style={s.input} autoComplete="email" /></Field>
                  <Btn loading={loading} text="Send Verification Code →" onClick={sendOtp} />
                  <SocialSection onGoogle={handleGoogle} onFacebook={handleFacebook} onGithub={handleGithub} />
                  <div style={s.switchPrompt}>Already have an account? <button style={s.switchBtn} onClick={() => flip('login')}>← Sign in</button></div>
                </>
              )}

              {/* Step 2: OTP */}
              {step === 2 && (
                <>
                  <h1 style={s.heading}>Verify your<br /><em style={s.em}>email.</em></h1>
                  <p style={s.sub}>Enter the 6-digit code sent to {form.email}</p>
                  <div style={s.otpRow}>
                    {otp.map((d, i) => (
                      <input
                        key={i} ref={el => otpRefs.current[i] = el}
                        value={d} maxLength={1} inputMode="numeric"
                        onChange={e => handleOtpChange(i, e.target.value)}
                        onKeyDown={e => handleOtpKeyDown(i, e)}
                        onPaste={handleOtpPaste}
                        style={{ ...s.otpDigit, ...(d ? s.otpFilled : {}) }}
                      />
                    ))}
                  </div>
                  <Btn loading={loading} text="Verify Code" onClick={verifyOtp} />
                  <div style={s.resendRow}>
                    Didn't receive it?&nbsp;
                    <button onClick={resendOtp} disabled={resendTimer > 0} style={{ ...s.switchBtn, ...(resendTimer > 0 ? { color: 'var(--muted)', cursor: 'default' } : {}) }}>
                      Resend {resendTimer > 0 ? `(${resendTimer}s)` : ''}
                    </button>
                  </div>
                  <div style={{ ...s.switchPrompt, marginTop: 12 }}><button style={s.switchBtn} onClick={() => { setStep(1); setError(''); }}>← Change email</button></div>
                </>
              )}

              {/* Step 3: Password */}
              {step === 3 && (
                <>
                  <h1 style={s.heading}>Almost<br /><em style={s.em}>there!</em></h1>
                  <p style={s.sub}>Create a strong password to secure your account</p>
                  <Field label="Password" icon="lock">
                    <input name="password" type="password" value={form.password}
                      onChange={e => { handleChange(e); checkStrength(e.target.value); }}
                      placeholder="Create a strong password" style={s.input} autoComplete="new-password" />
                  </Field>
                  {/* strength bar */}
                  <div style={{ display: 'flex', gap: 4, marginBottom: 4, marginTop: -10 }}>
                    {[1,2,3,4].map(i => <div key={i} style={{ flex:1,height:3,borderRadius:2,background:i<=strength?strengthColors[strength]:'rgba(255,255,255,.08)',transition:'background .3s' }} />)}
                  </div>
                  {strength > 0 && <div style={{ fontSize:11,color:strengthColors[strength],marginBottom:14 }}>{strengthLabels[strength]}</div>}

                  <Field label="Confirm Password" icon="lock">
                    <input name="confirm" type="password" value={form.confirm} onChange={handleChange} placeholder="Repeat your password" style={s.input} autoComplete="new-password" />
                  </Field>
                  <Btn loading={loading} text="Create Account ⚡" onClick={completeSignup} />
                </>
              )}
            </>
          )}

          {/* ─── FORGOT PASSWORD ─── */}
          {mode === 'forgot' && (
            <>
              <div style={s.stepDots}>
                {[1,2,3].map(n => (
                  <div key={n} style={{ ...s.stepDot, background: n < step ? '#00d4aa' : n === step ? '#6c63ff' : 'rgba(255,255,255,.1)' }} />
                ))}
                <span style={s.stepLabel}>Step {step} of 3</span>
              </div>

              {error && <div style={s.errorBox}>⚠ {error}</div>}
              {successMsg && <div style={s.successBox}>✉ {successMsg}</div>}

              {/* Step 1: Request Email */}
              {step === 1 && (
                <>
                  <h1 style={s.heading}>Reset<br /><em style={s.em}>password.</em></h1>
                  <p style={s.sub}>Enter your email to receive a reset code</p>
                  <Field label="Email Address" icon="email">
                    <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@example.com" style={s.input} autoComplete="email" />
                  </Field>
                  <Btn loading={loading} text="Send Reset Code →" onClick={sendOtp} />
                  <div style={s.switchPrompt}>Remember your password? <button style={s.switchBtn} onClick={() => flip('login')}>← Sign in</button></div>
                </>
              )}

              {/* Step 2: Enter OTP */}
              {step === 2 && (
                <>
                  <h1 style={s.heading}>Verify your<br /><em style={s.em}>email.</em></h1>
                  <p style={s.sub}>Enter the 6-digit code sent to {form.email}</p>
                  <div style={s.otpRow}>
                    {otp.map((d, i) => (
                      <input
                        key={i} ref={el => otpRefs.current[i] = el}
                        value={d} maxLength={1} inputMode="numeric"
                        onChange={e => handleOtpChange(i, e.target.value)}
                        onKeyDown={e => handleOtpKeyDown(i, e)}
                        onPaste={handleOtpPaste}
                        style={{ ...s.otpDigit, ...(d ? s.otpFilled : {}) }}
                      />
                    ))}
                  </div>
                  <Btn loading={loading} text="Verify Code" onClick={verifyOtp} />
                  <div style={s.resendRow}>
                     Didn't receive it?&nbsp;
                     <button onClick={resendOtp} disabled={resendTimer > 0} style={{ ...s.switchBtn, ...(resendTimer > 0 ? { color: 'var(--muted)', cursor: 'default' } : {}) }}>
                       Resend {resendTimer > 0 ? `(${resendTimer}s)` : ''}
                     </button>
                  </div>
                  <div style={{ ...s.switchPrompt, marginTop: 12 }}><button style={s.switchBtn} onClick={() => { setStep(1); setError(''); }}>← Change email</button></div>
                </>
              )}

              {/* Step 3: New Password */}
              {step === 3 && (
                <>
                  <h1 style={s.heading}>Set New<br /><em style={s.em}>password!</em></h1>
                  <p style={s.sub}>Create a new strong password for your account</p>
                  <Field label="New Password" icon="lock">
                    <input name="password" type="password" value={form.password}
                      onChange={e => { handleChange(e); checkStrength(e.target.value); }}
                      placeholder="Create a strong password" style={s.input} autoComplete="new-password" />
                  </Field>
                  {/* strength bar */}
                  <div style={{ display: 'flex', gap: 4, marginBottom: 4, marginTop: -10 }}>
                    {[1,2,3,4].map(i => <div key={i} style={{ flex:1,height:3,borderRadius:2,background:i<=strength?strengthColors[strength]:'rgba(255,255,255,.08)',transition:'background .3s' }} />)}
                  </div>
                  {strength > 0 && <div style={{ fontSize:11,color:strengthColors[strength],marginBottom:14 }}>{strengthLabels[strength]}</div>}

                  <Field label="Confirm New Password" icon="lock">
                    <input name="confirm" type="password" value={form.confirm} onChange={handleChange} placeholder="Repeat your new password" style={s.input} autoComplete="new-password" />
                  </Field>
                  <Btn loading={loading} text="Reset Password ⚡" onClick={handleResetPassword} />
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ── */
function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display:'block',fontSize:11,letterSpacing:'.1em',textTransform:'uppercase',color:'rgba(238,240,248,.45)',marginBottom:7,fontWeight:600 }}>{label}</label>
      <div style={{ position:'relative' }}>{children}</div>
    </div>
  );
}

function Btn({ loading, text, onClick, type = 'button' }) {
  return (
    <button type={type} onClick={onClick} disabled={loading} style={{ width:'100%',padding:14,background:'linear-gradient(135deg,#6c63ff,#8b80ff)',color:'#fff',fontFamily:"'Outfit',sans-serif",fontWeight:600,fontSize:15,border:'none',borderRadius:13,cursor:'pointer',marginTop:4,marginBottom:0,display:'flex',alignItems:'center',justifyContent:'center',gap:8,opacity:loading?.65:1 }}>
      {loading && <span style={{ width:16,height:16,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'#fff',borderRadius:'50%',display:'inline-block',animation:'spin .8s linear infinite' }} />}
      {text}
    </button>
  );
}

function SocialSection({ onGoogle, onFacebook, onGithub }) {
  return (
    <>
      <div style={{ display:'flex',alignItems:'center',gap:12,margin:'18px 0',fontSize:11,color:'rgba(238,240,248,.4)',letterSpacing:'.06em',textTransform:'uppercase' }}>
        <div style={{ flex:1,height:1,background:'rgba(255,255,255,.08)' }} />or continue with<div style={{ flex:1,height:1,background:'rgba(255,255,255,.08)' }} />
      </div>
      <div style={{ display:'flex',flexDirection:'column',gap:9 }}>
        <SBtn onClick={onGoogle} icon={<GoogleIcon />} label="Continue with Google" />
        <SBtn onClick={onFacebook} icon={<FbIcon />} label="Continue with Facebook" />
        <SBtn onClick={onGithub} icon={<GhIcon />} label="Continue with GitHub" />
      </div>
    </>
  );
}

function SBtn({ onClick, icon, label }) {
  return (
    <button onClick={onClick} style={{ width:'100%',padding:'11px 16px',borderRadius:13,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',color:'#eef0f8',fontFamily:"'Outfit',sans-serif",fontSize:14,fontWeight:500,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:10 }}>
      {icon}{label}
    </button>
  );
}

function GoogleIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>; }
function FbIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>; }
function GhIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="#eef0f8"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>; }

const s = {
  root: { position:'relative', height:'100vh', overflow:'hidden', background:'#040811', fontFamily:"'Outfit',sans-serif", color:'#eef0f8' },
  canvas: { position:'fixed', inset:0, zIndex:0, pointerEvents:'none' },
  orb1: { position:'fixed', width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle,#6c63ff,#4a44cc)', filter:'blur(90px)', opacity:.12, top:-150, left:-150, pointerEvents:'none' },
  orb2: { position:'fixed', width:450, height:450, borderRadius:'50%', background:'radial-gradient(circle,#00d4aa,#0099aa)', filter:'blur(90px)', opacity:.12, bottom:-100, right:-100, pointerEvents:'none' },
  orb3: { position:'fixed', width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle,#a855f7,#7c3aed)', filter:'blur(90px)', opacity:.1, top:'45%', left:'42%', pointerEvents:'none' },
  scene: { position:'relative', zIndex:1, display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', padding:20 },
  card: { position:'relative', width:440, maxWidth:'100%', background:'rgba(255,255,255,.035)', backdropFilter:'blur(32px)', border:'1px solid rgba(255,255,255,.08)', borderRadius:28, padding:'36px 28px 32px', overflow:'hidden', overflowY:'auto', maxHeight:'95vh' },
  shimmer: { position:'absolute', top:0, left:'-60%', width:'60%', height:1, background:'linear-gradient(90deg,transparent,#9b94ff,transparent)' },
  logo: { display:'flex', alignItems:'center', gap:12, marginBottom:24 },
  logoMark: { width:40, height:40, borderRadius:12, background:'linear-gradient(135deg,#6c63ff,#00d4aa)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:700, color:'#fff', boxShadow:'0 4px 20px rgba(108,99,255,.4)' },
  logoText: { fontFamily:"'Space Grotesk',sans-serif", fontSize:21, fontWeight:700, background:'linear-gradient(90deg,#9b94ff,#39e8ca)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' },
  logoBadge: { fontSize:10, fontWeight:600, letterSpacing:'.08em', background:'rgba(108,99,255,.2)', border:'1px solid rgba(108,99,255,.3)', borderRadius:6, padding:'2px 7px', color:'#9b94ff', textTransform:'uppercase' },
  stepDots: { display:'flex', alignItems:'center', gap:8, marginBottom:20 },
  stepDot: { width:28, height:4, borderRadius:2, transition:'background .3s' },
  stepLabel: { fontSize:11, color:'rgba(238,240,248,.4)', marginLeft:4, letterSpacing:'.06em' },
  heading: { fontFamily:"'Space Grotesk',sans-serif", fontSize:28, fontWeight:700, lineHeight:1.2, marginBottom:6, letterSpacing:'-.02em' },
  em: { fontStyle:'italic', color:'#39e8ca' },
  sub: { color:'rgba(238,240,248,.45)', fontSize:13, marginBottom:20 },
  errorBox: { background:'rgba(255,94,122,.1)', border:'1px solid rgba(255,94,122,.25)', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#ff9999', marginBottom:14, lineHeight:1.5 },
  successBox: { background:'rgba(0,212,170,.08)', border:'1px solid rgba(0,212,170,.25)', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#39e8ca', marginBottom:14 },
  input: { width:'100%', padding:'12px 14px 12px 14px', background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', borderRadius:13, color:'#eef0f8', fontFamily:"'Outfit',sans-serif", fontSize:14, outline:'none' },
  otpRow: { display:'flex', gap:6, marginBottom:20 },
  otpDigit: { width:42, minWidth:0, height:52, textAlign:'center', fontSize:20, fontWeight:700, fontFamily:"'Space Grotesk',sans-serif", background:'rgba(255,255,255,.04)', border:'2px solid rgba(255,255,255,.08)', borderRadius:11, color:'#eef0f8', outline:'none', flex:'1 1 0' },
  otpFilled: { borderColor:'rgba(108,99,255,.5)', background:'rgba(108,99,255,.12)' },
  resendRow: { textAlign:'center', fontSize:13, color:'rgba(238,240,248,.45)', marginTop:14 },
  rowFlex: { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, fontSize:13 },
  checkLabel: { display:'flex', alignItems:'center', gap:8, cursor:'pointer', color:'rgba(238,240,248,.45)' },
  checkBox: { width:17, height:17, border:'1px solid rgba(255,255,255,.12)', borderRadius:5, display:'inline-flex', alignItems:'center', justifyContent:'center' },
  link: { color:'#9b94ff', textDecoration:'none', fontSize:13 },
  switchPrompt: { textAlign:'center', fontSize:13, color:'rgba(238,240,248,.45)', marginTop:18 },
  switchBtn: { background:'none', border:'none', color:'#9b94ff', fontFamily:"'Outfit',sans-serif", fontSize:13, fontWeight:600, cursor:'pointer' },
  statRow: { display:'flex', gap:16, marginTop:24, paddingTop:20, borderTop:'1px solid rgba(255,255,255,.08)' },
  stat: { textAlign:'center', flex:1 },
  statNum: { fontFamily:"'Space Grotesk',sans-serif", fontSize:20, fontWeight:700, color:'#39e8ca', display:'block' },
  statLabel: { fontSize:10, color:'rgba(238,240,248,.45)', letterSpacing:'.07em', textTransform:'uppercase', marginTop:2, display:'block' },
  successOverlay: { position:'absolute', inset:0, borderRadius:28, background:'rgba(4,8,17,.97)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14, zIndex:10 },
  successRing: { width:70, height:70, borderRadius:'50%', border:'2px solid #00d4aa', display:'flex', alignItems:'center', justifyContent:'center', fontSize:30, background:'rgba(0,212,170,.1)' },
  successText: { fontFamily:"'Space Grotesk',sans-serif", fontSize:22, fontWeight:700, color:'#00d4aa' },
  successSub: { fontSize:13, color:'rgba(238,240,248,.45)' },
};
