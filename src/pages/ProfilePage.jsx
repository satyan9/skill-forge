import { useAuth } from '../context/AuthContext';
import { User, Mail, Calendar, Target, Award, Zap } from 'lucide-react';

const s = {
  container: {
    padding: '32px 40px',
    maxWidth: '1200px',
    margin: '0 auto',
    color: '#eef0f8',
    fontFamily: "'Outfit', sans-serif"
  },
  header: {
    marginBottom: '32px',
    display: 'flex',
    alignItems: 'center',
    gap: '24px'
  },
  avatarWrap: {
    width: '100px',
    height: '100px',
    background: 'linear-gradient(135deg, #6c63ff, #00d4aa)',
    borderRadius: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '40px',
    fontWeight: '700',
    color: '#fff',
    boxShadow: '0 8px 32px rgba(108, 99, 255, 0.3)'
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: '24px',
    objectFit: 'cover'
  },
  title: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: '32px',
    fontWeight: '700',
    margin: '0 0 8px 0',
    background: 'linear-gradient(90deg, #fff, #9b94ff)',
    WebkitTextFillColor: 'transparent',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text'
  },
  subtitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: 'rgba(238, 240, 248, 0.6)',
    fontSize: '15px'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
    marginBottom: '24px'
  },
  card: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(16px)',
    borderRadius: '24px',
    padding: '28px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '600',
    fontFamily: "'Space Grotesk', sans-serif",
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  statGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px'
  },
  statBox: {
    background: 'rgba(0, 0, 0, 0.2)',
    padding: '20px',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.03)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  statLabel: {
    fontSize: '13px',
    color: 'rgba(238, 240, 248, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontWeight: '600'
  },
  statValue: {
    fontSize: '28px',
    fontWeight: '700',
    fontFamily: "'Space Grotesk', sans-serif",
    color: '#fff'
  },
  barContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    marginTop: '8px'
  },
  barRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  barLabelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    fontWeight: '500'
  },
  barTrack: {
    height: '10px',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '5px',
    overflow: 'hidden'
  },
  barFill: (width, color) => ({
    width: `${width}%`,
    height: '100%',
    background: color,
    borderRadius: '5px',
    transition: 'width 1s ease-out'
  })
};

export default function ProfilePage() {
  const { user } = useAuth();
  
  if (!user) return <div style={s.container}>Loading profile...</div>;

  // Derive real module scores from user stats, defaulting to 0 if they haven't taken any tests yet
  const moduleScores = user.stats?.moduleScores || {};
  
  const activeModules = [
    { name: 'Numerical', score: moduleScores.Numerical || 0, color: 'linear-gradient(90deg, #6c63ff, #9b94ff)' },
    { name: 'Verbal', score: moduleScores.Verbal || 0, color: 'linear-gradient(90deg, #00d4aa, #39e8ca)' },
    { name: 'Reasoning', score: moduleScores.Reasoning || 0, color: 'linear-gradient(90deg, #a855f7, #c084fc)' },
    { name: 'Programming', score: moduleScores.Programming || 0, color: 'linear-gradient(90deg, #f59e0b, #fbbf24)' },
  ];

  const joinedDate = new Date(user.createdAt || Date.now()).toLocaleDateString('en-US', {
    month: 'long', year: 'numeric'
  });

  return (
    <div style={s.container}>
      <header style={s.header}>
        <div style={s.avatarWrap}>
          {user.avatar ? (
            <img src={user.avatar} alt="Avatar" style={s.avatarImg} />
          ) : (
            user.name ? user.name.charAt(0).toUpperCase() : 'U'
          )}
        </div>
        <div>
          <h1 style={s.title}>{user.name || 'SkillForge User'}</h1>
          <div style={s.subtitle}>
            <Mail size={16} /> {user.email || 'No email provided'}
            <span style={{ margin: '0 8px', color: 'rgba(255,255,255,0.2)' }}>•</span>
            <Calendar size={16} /> Joined {joinedDate}
          </div>
        </div>
      </header>

      <div style={s.grid}>
        <div style={s.card}>
          <h2 style={s.cardTitle}><Target size={20} color="#6c63ff" /> Overall Statistics</h2>
          <div style={s.statGrid}>
            <div style={s.statBox}>
              <span style={s.statLabel}>Total Tests</span>
              <span style={s.statValue}>{user.stats?.totalSubmissions || 0}</span>
            </div>
            <div style={s.statBox}>
              <span style={s.statLabel}>Avg Score</span>
              <span style={s.statValue}>{user.stats?.averageScore || 0}%</span>
            </div>
            <div style={s.statBox}>
              <span style={s.statLabel}>Tests Passed</span>
              <span style={s.statValue}>{user.stats?.totalPassed || 0}</span>
            </div>
            <div style={s.statBox}>
              <span style={s.statLabel}>Streak</span>
              <span style={{ ...s.statValue, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Zap fill="#f59e0b" size={20} /> {user.stats?.streakDays || 0} Days
              </span>
            </div>
          </div>
        </div>

        <div style={s.card}>
          <h2 style={s.cardTitle}><Award size={20} color="#00d4aa" /> Performance by Module</h2>
          <div style={s.barContainer}>
            {activeModules.map(mod => (
              <div key={mod.name} style={s.barRow}>
                <div style={s.barLabelRow}>
                  <span style={{ color: 'rgba(238, 240, 248, 0.8)' }}>{mod.name}</span>
                  <span style={{ color: '#fff', fontWeight: 600 }}>{mod.score}%</span>
                </div>
                <div style={s.barTrack}>
                  <div style={s.barFill(mod.score, mod.color)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
