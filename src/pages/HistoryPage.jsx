import { useState, useEffect } from 'react';
import { useSubmissions } from '../utils/useSubmissions';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, CheckCircle2, XCircle, Clock, Trophy, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';

export default function HistoryPage() {
  const { user } = useAuth();
  const { getSubmissions, getStatsSummary } = useSubmissions();

  const [submissions, setSubmissions] = useState([]);
  const [stats, setStats] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [page]);

  async function loadData() {
    setLoading(true);
    const [subData, statData] = await Promise.all([
      getSubmissions({ page, limit: 10 }),
      getStatsSummary(),
    ]);
    if (subData.success) {
      setSubmissions(subData.submissions);
      setPagination(subData.pagination);
    }
    if (statData.success) setStats(statData.stats);
    setLoading(false);
  }

  function formatDate(ts) {
    return new Date(ts).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  function scoreColor(score) {
    if (score >= 70) return '#00d4aa';
    if (score >= 40) return '#f0d060';
    return '#ff5e7a';
  }

  function statusIcon(status) {
    if (status === 'completed') return <CheckCircle2 size={16} color="#00d4aa" />;
    if (status === 'failed') return <XCircle size={16} color="#ff5e7a" />;
    return <Clock size={16} color="#f0d060" />;
  }

  const topStats = [
    { icon: <LayoutDashboard size={20} />, label: 'Total Tests', value: stats?.totalSubmissions ?? 0, color: '#9b94ff' },
    { icon: <CheckCircle2 size={20} />, label: 'Tests Passed', value: stats?.totalPassed ?? 0, color: '#00d4aa' },
    { icon: <Trophy size={20} />, label: 'Avg Score', value: `${stats?.averageScore ?? 0}%`, color: '#f59e0b' },
    { icon: <BookOpen size={20} />, label: 'Modules', value: stats?.topicsAttempted?.length ?? 0, color: '#a855f7' },
  ];

  return (
    <div style={s.root}>
      {/* Stats Row */}
      <div style={s.statsRow}>
        {topStats.map(({ icon, label, value, color }) => (
          <div key={label} style={s.statCard}>
            <div style={{ ...s.statIcon, color }}>{icon}</div>
            <div>
              <div style={{ ...s.statValue, color }}>{value}</div>
              <div style={s.statLabel}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Test List */}
      <div style={s.section}>
        <h2 style={s.sectionTitle}>Test History</h2>

        {loading ? (
          <div style={s.empty}>Loading...</div>
        ) : submissions.length === 0 ? (
          <div style={s.empty}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>📋</div>
            <div style={{ fontWeight: 600, fontSize: 17 }}>No tests taken yet</div>
            <div style={{ opacity: 0.5, fontSize: 13, marginTop: 6 }}>Complete an assessment to see your history here.</div>
          </div>
        ) : (
          <div style={s.list}>
            {submissions.map(sub => (
              <div key={sub._id} style={s.card}>
                {/* Left: Status + Topic */}
                <div style={s.cardLeft}>
                  <div style={s.statusIcon}>{statusIcon(sub.status)}</div>
                  <div>
                    <div style={s.topic}>{sub.question?.title || sub.topic}</div>
                    <div style={s.meta}>
                      <span style={s.badge}>{sub.difficulty}</span>
                      <span style={s.badge}>{sub.topic}</span>
                      <span style={s.badge}>{sub.questionType}</span>
                    </div>
                  </div>
                </div>

                {/* Center: Date */}
                <div style={s.dateCell}>
                  <Clock size={13} style={{ marginRight: 5, opacity: 0.5 }} />
                  {formatDate(sub.timestamp)}
                </div>

                {/* Right: Score */}
                <div style={{ ...s.scoreCell, color: scoreColor(sub.score || 0) }}>
                  {sub.score || 0}%
                </div>

                {/* Far right: passed/failed text */}
                <div style={{ ...s.resultCell, color: sub.status === 'completed' ? '#00d4aa' : sub.status === 'failed' ? '#ff5e7a' : '#f0d060' }}>
                  {sub.status === 'completed' ? '✓ Passed' : sub.status === 'failed' ? '✗ Failed' : '~ Partial'}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div style={s.pagination}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={s.pageBtn}
            >
              <ChevronLeft size={16} /> Prev
            </button>
            <span style={s.pageInfo}>Page {page} of {pagination.totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              style={s.pageBtn}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  root: {
    padding: '28px 32px',
    maxWidth: 1000,
    margin: '0 auto',
    color: '#eef0f8',
    fontFamily: "'Outfit', sans-serif",
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 16,
    marginBottom: 32,
  },
  statCard: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 18,
    padding: '20px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    background: 'rgba(255,255,255,0.04)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  statValue: {
    fontSize: 26,
    fontWeight: 800,
    fontFamily: "'Space Grotesk', sans-serif",
    lineHeight: 1,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(238,240,248,0.45)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontWeight: 600,
  },
  section: {},
  sectionTitle: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 16,
    color: '#fff',
  },
  empty: {
    textAlign: 'center',
    color: 'rgba(238,240,248,0.4)',
    padding: '60px 0',
    fontSize: 14,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    background: 'rgba(255,255,255,0.025)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: '16px 20px',
    transition: 'border-color 0.2s',
  },
  cardLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    flex: 1,
    minWidth: 0,
  },
  statusIcon: {
    flexShrink: 0,
  },
  topic: {
    fontWeight: 600,
    fontSize: 15,
    color: '#eef0f8',
    marginBottom: 5,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  meta: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
  },
  badge: {
    fontSize: 11,
    background: 'rgba(108,99,255,0.12)',
    borderRadius: 6,
    padding: '2px 8px',
    color: '#9b94ff',
    textTransform: 'capitalize',
  },
  dateCell: {
    fontSize: 13,
    color: 'rgba(238,240,248,0.4)',
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
  },
  scoreCell: {
    fontSize: 22,
    fontWeight: 800,
    fontFamily: "'Space Grotesk', sans-serif",
    flexShrink: 0,
    minWidth: 60,
    textAlign: 'right',
  },
  resultCell: {
    fontSize: 13,
    fontWeight: 600,
    flexShrink: 0,
    minWidth: 80,
    textAlign: 'right',
  },
  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 24,
  },
  pageBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: '8px 16px',
    color: '#eef0f8',
    fontSize: 13,
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
  },
  pageInfo: {
    color: 'rgba(238,240,248,0.4)',
    fontSize: 13,
  },
};
