import { useState, useEffect } from 'react';
import { useSubmissions } from '../utils/useSubmissions';
import { useAuth } from '../context/AuthContext';

export default function HistoryPage() {
  const { user, logout } = useAuth();
  const { getSubmissions, getSubmission, deleteSubmission, getStatsSummary } = useSubmissions();

  const [submissions, setSubmissions] = useState([]);
  const [stats, setStats] = useState(null);
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [filterTopic, setFilterTopic] = useState('');
  const [topicBreakdown, setTopicBreakdown] = useState([]);

  useEffect(() => {
    loadData();
    loadStats();
  }, [page, filterTopic]);

  async function loadData() {
    setLoading(true);
    const data = await getSubmissions({ page, limit: 10, topic: filterTopic });
    if (data.success) {
      setSubmissions(data.submissions);
      setPagination(data.pagination);
      setStats(data.stats);
    }
    setLoading(false);
  }

  async function loadStats() {
    const data = await getStatsSummary();
    if (data.success) {
      setTopicBreakdown(data.topicBreakdown || []);
    }
  }

  async function openDetail(id) {
    setDetailLoading(true);
    const data = await getSubmission(id);
    if (data.success) setSelected(data.submission);
    setDetailLoading(false);
  }

  async function handleDelete(id) {
    if (!confirm('Delete this submission?')) return;
    await deleteSubmission(id);
    setSelected(null);
    loadData();
    loadStats();
  }

  function formatDate(ts) {
    return new Date(ts).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  function scoreColor(score) {
    if (score >= 80) return '#00d4aa';
    if (score >= 50) return '#f0d060';
    return '#ff5e7a';
  }

  return (
    <div style={s.root}>
      {/* header */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <div style={s.logoMark}>⚡</div>
          <div>
            <div style={s.headerTitle}>Submission History</div>
            <div style={s.headerSub}>Welcome back, {user?.name} · {user?.stats?.totalSubmissions || 0} total submissions</div>
          </div>
        </div>
        <button onClick={logout} style={s.logoutBtn}>Sign Out</button>
      </div>

      {/* Stats chips */}
      {stats && (
        <div style={s.statsRow}>
          {[
            ['📊', 'Total', stats.totalSubmissions],
            ['✅', 'Passed', stats.totalPassed],
            ['🏆', 'Avg Score', `${stats.averageScore}%`],
            ['📚', 'Topics', stats.topicsAttempted?.length || 0],
          ].map(([icon, label, val]) => (
            <div key={label} style={s.statChip}>
              <span style={s.chipIcon}>{icon}</span>
              <span style={s.chipVal}>{val}</span>
              <span style={s.chipLabel}>{label}</span>
            </div>
          ))}
        </div>
      )}

      <div style={s.body}>
        {/* Left: List */}
        <div style={s.listPanel}>
          <div style={s.filterBar}>
            <input
              value={filterTopic}
              onChange={e => { setFilterTopic(e.target.value); setPage(1); }}
              placeholder="Filter by topic…"
              style={s.filterInput}
            />
          </div>

          {loading ? (
            <div style={s.loading}>Loading submissions…</div>
          ) : submissions.length === 0 ? (
            <div style={s.empty}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
              <div>No submissions yet.</div>
              <div style={{ opacity: 0.5, fontSize: 13, marginTop: 4 }}>Complete an assessment to see history here.</div>
            </div>
          ) : (
            submissions.map(sub => (
              <div
                key={sub._id}
                onClick={() => openDetail(sub._id)}
                style={{ ...s.subCard, ...(selected?._id === sub._id ? s.subCardActive : {}) }}
              >
                <div style={s.subTop}>
                  <span style={s.subTopic}>{sub.topic}</span>
                  <span style={{ ...s.subScore, color: scoreColor(sub.score || 0) }}>{sub.score || 0}%</span>
                </div>
                <div style={s.subMeta}>
                  <span style={s.subBadge}>{sub.difficulty}</span>
                  <span style={s.subBadge}>{sub.language}</span>
                  <span style={s.subBadge2}>{sub.status}</span>
                </div>
                <div style={s.subDate}>{formatDate(sub.timestamp)}</div>
              </div>
            ))
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div style={s.pagination}>
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} style={s.pageBtn}>← Prev</button>
              <span style={{ color: 'rgba(238,240,248,0.4)', fontSize: 13 }}>{page} / {pagination.totalPages}</span>
              <button onClick={() => setPage(p => Math.min(pagination.totalPages, p+1))} disabled={page === pagination.totalPages} style={s.pageBtn}>Next →</button>
            </div>
          )}
        </div>

        {/* Right: Detail */}
        <div style={s.detailPanel}>
          {detailLoading ? (
            <div style={s.loading}>Loading submission details…</div>
          ) : !selected ? (
            <div style={s.detailEmpty}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>🔍</div>
              <div style={{ fontWeight: 600, fontSize: 18 }}>Select a submission</div>
              <div style={{ opacity: 0.4, fontSize: 13, marginTop: 6 }}>Click any item on the left to view details, code, and AI review</div>
            </div>
          ) : (
            <div style={s.detailContent}>
              <div style={s.detailHeader}>
                <div>
                  <div style={s.detailTopic}>{selected.topic}</div>
                  <div style={s.detailDate}>{formatDate(selected.timestamp)}</div>
                </div>
                <div style={s.detailActions}>
                  <span style={{ ...s.detailScore, color: scoreColor(selected.score) }}>{selected.score}%</span>
                  <button onClick={() => handleDelete(selected._id)} style={s.deleteBtn}>🗑</button>
                </div>
              </div>

              {/* Badges */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                {[selected.difficulty, selected.language, selected.questionType, selected.status].map(b => (
                  <span key={b} style={s.detailBadge}>{b}</span>
                ))}
              </div>

              {/* Question */}
              {selected.question?.title && (
                <section style={s.section}>
                  <div style={s.sectionLabel}>📋 QUESTION</div>
                  <div style={s.questionTitle}>{selected.question.title}</div>
                  {selected.question.description && (
                    <div style={s.questionDesc}>{selected.question.description}</div>
                  )}
                </section>
              )}

              {/* Execution Result */}
              {selected.executionResult && (
                <section style={s.section}>
                  <div style={s.sectionLabel}>🧪 EXECUTION RESULT</div>
                  <div style={{ ...s.resultBox, borderColor: selected.executionResult.passed ? '#00d4aa44' : '#ff5e7a44' }}>
                    <div style={{ color: selected.executionResult.passed ? '#00d4aa' : '#ff5e7a', fontWeight: 600, marginBottom: 8 }}>
                      {selected.executionResult.passed ? '✅ All tests passed' : '❌ Tests failed'}
                    </div>
                    {selected.executionResult.testsTotal > 0 && (
                      <div style={{ fontSize: 13, opacity: 0.7 }}>
                        {selected.executionResult.testsPassed}/{selected.executionResult.testsTotal} test cases passed
                      </div>
                    )}
                    {selected.executionResult.output && (
                      <pre style={s.codeBlock}>{selected.executionResult.output}</pre>
                    )}
                    {selected.executionResult.error && (
                      <pre style={{ ...s.codeBlock, color: '#ff5e7a' }}>{selected.executionResult.error}</pre>
                    )}
                  </div>
                </section>
              )}

              {/* User Code */}
              {selected.userCode && (
                <section style={s.section}>
                  <div style={s.sectionLabel}>💻 YOUR CODE</div>
                  <pre style={s.codeBlock}>{selected.userCode}</pre>
                </section>
              )}

              {/* AI Review */}
              {selected.review && (
                <section style={s.section}>
                  <div style={s.sectionLabel}>🤖 AI REVIEW</div>
                  <div style={s.reviewCard}>
                    {typeof selected.review === 'string' ? (
                      <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.7 }}>{selected.review}</div>
                    ) : (
                      <>
                        {selected.review.summary && (
                          <div style={{ marginBottom: 14 }}>
                            <div style={s.reviewSubLabel}>Summary</div>
                            <div style={{ fontSize: 14, lineHeight: 1.7 }}>{selected.review.summary}</div>
                          </div>
                        )}
                        {selected.review.mistakes && selected.review.mistakes.length > 0 && (
                          <div style={{ marginBottom: 14 }}>
                            <div style={s.reviewSubLabel}>⚠ Mistakes to Fix</div>
                            <ul style={{ paddingLeft: 18, fontSize: 14, lineHeight: 1.8 }}>
                              {selected.review.mistakes.map((m, i) => <li key={i} style={{ color: '#ff9973' }}>{m}</li>)}
                            </ul>
                          </div>
                        )}
                        {selected.review.improvements && selected.review.improvements.length > 0 && (
                          <div style={{ marginBottom: 14 }}>
                            <div style={s.reviewSubLabel}>💡 Improvements</div>
                            <ul style={{ paddingLeft: 18, fontSize: 14, lineHeight: 1.8 }}>
                              {selected.review.improvements.map((m, i) => <li key={i} style={{ color: '#9b94ff' }}>{m}</li>)}
                            </ul>
                          </div>
                        )}
                        {selected.review.verdict && (
                          <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(0,212,170,0.08)', borderRadius: 10, fontSize: 14, color: '#00d4aa', fontWeight: 600 }}>
                            Verdict: {selected.review.verdict}
                          </div>
                        )}
                        {/* Fallback: show raw JSON if none of the above */}
                        {!selected.review.summary && !selected.review.mistakes && !selected.review.verdict && (
                          <pre style={{ ...s.codeBlock, fontSize: 12 }}>{JSON.stringify(selected.review, null, 2)}</pre>
                        )}
                      </>
                    )}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  root: { minHeight: '100vh', background: '#040811', color: '#eef0f8', fontFamily: "'Outfit', sans-serif" },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 32px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(10px)' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 14 },
  logoMark: { width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #6c63ff, #00d4aa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, flexShrink: 0 },
  headerTitle: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 18 },
  headerSub: { fontSize: 13, color: 'rgba(238,240,248,0.4)', marginTop: 2 },
  logoutBtn: { background: 'rgba(255,94,122,0.1)', border: '1px solid rgba(255,94,122,0.2)', borderRadius: 10, color: '#ff5e7a', fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 500, padding: '8px 18px', cursor: 'pointer' },
  statsRow: { display: 'flex', gap: 12, padding: '20px 32px', flexWrap: 'wrap' },
  statChip: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10, minWidth: 120 },
  chipIcon: { fontSize: 20 },
  chipVal: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 18, color: '#9b94ff' },
  chipLabel: { fontSize: 12, color: 'rgba(238,240,248,0.4)' },
  body: { display: 'flex', height: 'calc(100vh - 140px)', overflow: 'hidden' },
  listPanel: { width: 340, minWidth: 280, borderRight: '1px solid rgba(255,255,255,0.06)', overflowY: 'auto', padding: '16px 12px' },
  filterBar: { marginBottom: 12 },
  filterInput: { width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: '#eef0f8', fontFamily: "'Outfit', sans-serif", fontSize: 13, outline: 'none' },
  loading: { textAlign: 'center', color: 'rgba(238,240,248,0.4)', padding: 40, fontSize: 14 },
  empty: { textAlign: 'center', color: 'rgba(238,240,248,0.4)', padding: '60px 20px' },
  subCard: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '14px 16px', marginBottom: 10, cursor: 'pointer', transition: 'all 0.2s' },
  subCardActive: { background: 'rgba(108,99,255,0.12)', borderColor: 'rgba(108,99,255,0.3)' },
  subTop: { display: 'flex', justifyContent: 'space-between', marginBottom: 8 },
  subTopic: { fontWeight: 600, fontSize: 14, color: '#eef0f8' },
  subScore: { fontWeight: 700, fontSize: 15, fontFamily: "'Space Grotesk', sans-serif" },
  subMeta: { display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' },
  subBadge: { fontSize: 11, background: 'rgba(108,99,255,0.15)', borderRadius: 6, padding: '2px 8px', color: '#9b94ff' },
  subBadge2: { fontSize: 11, background: 'rgba(0,212,170,0.1)', borderRadius: 6, padding: '2px 8px', color: '#00d4aa' },
  subDate: { fontSize: 11, color: 'rgba(238,240,248,0.3)' },
  pagination: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 4px', marginTop: 4 },
  pageBtn: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 14px', color: '#eef0f8', fontSize: 12, cursor: 'pointer' },
  detailPanel: { flex: 1, overflowY: 'auto', padding: 32 },
  detailEmpty: { height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(238,240,248,0.4)', textAlign: 'center' },
  detailContent: { maxWidth: 800 },
  detailHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  detailTopic: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700 },
  detailDate: { fontSize: 13, color: 'rgba(238,240,248,0.4)', marginTop: 4 },
  detailActions: { display: 'flex', alignItems: 'center', gap: 12 },
  detailScore: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 800 },
  deleteBtn: { background: 'rgba(255,94,122,0.1)', border: '1px solid rgba(255,94,122,0.2)', borderRadius: 8, color: '#ff5e7a', cursor: 'pointer', fontSize: 16, padding: '6px 10px' },
  detailBadge: { fontSize: 12, background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: 8, padding: '3px 10px', color: '#9b94ff', textTransform: 'capitalize' },
  section: { marginBottom: 24 },
  sectionLabel: { fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(238,240,248,0.35)', fontWeight: 700, marginBottom: 10 },
  questionTitle: { fontWeight: 600, fontSize: 16, marginBottom: 8 },
  questionDesc: { fontSize: 14, lineHeight: 1.7, color: 'rgba(238,240,248,0.7)' },
  resultBox: { background: 'rgba(255,255,255,0.03)', border: '1px solid', borderRadius: 14, padding: 16 },
  codeBlock: { background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 14, fontSize: 13, fontFamily: 'monospace', marginTop: 10, overflowX: 'auto', lineHeight: 1.6, color: '#c5c8d0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
  reviewCard: { background: 'rgba(108,99,255,0.06)', border: '1px solid rgba(108,99,255,0.15)', borderRadius: 14, padding: 20 },
  reviewSubLabel: { fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(238,240,248,0.4)', fontWeight: 700, marginBottom: 8 },
};
