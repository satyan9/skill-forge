import { useAuth, API_BASE } from '../context/AuthContext';

/**
 * A hook that returns helper functions to work with the submissions API.
 * All requests automatically attach the Bearer token.
 */
export function useSubmissions() {
  const { token } = useAuth();

  function authHeaders() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }

  /**
   * Save a new submission after finishing an assessment.
   * @param {Object} payload - { topic, difficulty, language, questionType, question, userCode, executionResult, review, score, timeTaken, status }
   */
  async function saveSubmission(payload) {
    const res = await fetch(`${API_BASE}/submissions`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    return res.json();
  }

  /**
   * Fetch paginated submission history.
   * @param {Object} opts - { page, limit, topic, status }
   */
  async function getSubmissions(opts = {}) {
    const params = new URLSearchParams();
    if (opts.page)   params.set('page', opts.page);
    if (opts.limit)  params.set('limit', opts.limit);
    if (opts.topic)  params.set('topic', opts.topic);
    if (opts.status) params.set('status', opts.status);

    const res = await fetch(`${API_BASE}/submissions?${params}`, {
      headers: authHeaders(),
    });
    return res.json();
  }

  /**
   * Get a single submission by ID (includes full review JSON).
   */
  async function getSubmission(id) {
    const res = await fetch(`${API_BASE}/submissions/${id}`, {
      headers: authHeaders(),
    });
    return res.json();
  }

  /**
   * Delete a submission by ID.
   */
  async function deleteSubmission(id) {
    const res = await fetch(`${API_BASE}/submissions/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return res.json();
  }

  /**
   * Get stats summary (topic breakdown, recent activity, etc.)
   */
  async function getStatsSummary() {
    const res = await fetch(`${API_BASE}/submissions/stats/summary`, {
      headers: authHeaders(),
    });
    return res.json();
  }

  return { saveSubmission, getSubmissions, getSubmission, deleteSubmission, getStatsSummary };
}
