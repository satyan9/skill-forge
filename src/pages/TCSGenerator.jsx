import { useState, useEffect } from 'react';
import { generateTCSQuestions } from '../utils/ai';
import { executeCode } from '../utils/compiler';
import { Loader2, AlertTriangle, Play, Key, Terminal, Code, HelpCircle, Brain } from 'lucide-react';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import { useSubmissions } from '../utils/useSubmissions';
import './TCSGenerator.css';

export default function TCSGenerator() {
  const { saveSubmission } = useSubmissions();
  const [view, setView] = useState('config'); // config, loading, quiz, score, review
  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem('tcs_config');
    if (saved) return JSON.parse(saved);
    return {
      numQ: 5,
      sections: ['Numerical Ability', 'Programming Logic'],
      difficulty: 'Beginner',
      provider: 'Gemini',
      timePerMCQ: 90,
      timePerCoding: 20,
      apiKey: '',
    };
  });
  
  // Ensure config values are numbers
  useEffect(() => {
    if (typeof config.timePerMCQ !== 'number' || typeof config.timePerCoding !== 'number') {
      setConfig(prev => ({
        ...prev,
        timePerMCQ: Number(prev.timePerMCQ) || 90,
        timePerCoding: Number(prev.timePerCoding) || 20
      }));
    }
  }, [config]);

  useEffect(() => {
    localStorage.setItem('tcs_config', JSON.stringify(config));
  }, [config]);
  
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]); // store option index for MCQ, or code string for Coding
  const [curQ, setCurQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [error, setError] = useState('');
  
  // Coding specific states
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileResult, setCompileResult] = useState(null);
  const [codingLanguage, setCodingLanguage] = useState('python');
  const [codingPasses, setCodingPasses] = useState({}); // { questionIndex: boolean }

  useEffect(() => {
    let timer;
    if (view === 'quiz' && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && view === 'quiz') {
      setView('score');
    }
    return () => clearInterval(timer);
  }, [view, timeLeft]);

  const handleStart = async () => {
    if (config.sections.length === 0) return setError('Select at least one section');
    if (!config.apiKey) return setError(`Please enter your ${config.provider} API Key`);
    
    setError('');
    setView('loading');
    
    try {
      const qs = await generateTCSQuestions(config.provider, config.apiKey, config.sections, config.difficulty, config.numQ);
      setQuestions(qs);
      setAnswers(new Array(qs.length).fill('').map((_, i) => qs[i].type === 'coding' ? '# Write your code here' : -1));
      setCodingPasses({});
      setCurQ(0);
      
      const mcqCount = qs.filter(q => q.type !== 'coding').length;
      const codingCount = qs.filter(q => q.type === 'coding').length;
      const tMcq = Number(config.timePerMCQ) || 90;
      const tCode = Number(config.timePerCoding) || 20;
      const time = (mcqCount * tMcq) + (codingCount * tCode * 60);
      
      setTotalTime(time);
      setTimeLeft(time);
      setView('quiz');
    } catch (err) {
      setError(err.message || 'Failed to generate');
      setView('config');
    }
  };

  const toggleSection = (sec) => {
    setConfig(prev => ({
      ...prev,
      sections: prev.sections.includes(sec) 
        ? prev.sections.filter(s => s !== sec)
        : [...prev.sections, sec]
    }));
  };

  const handleMCQAnswer = (optIndex) => {
    const newAnsw = [...answers];
    newAnsw[curQ] = optIndex;
    setAnswers(newAnsw);
  };

  const handleCodeChange = (val) => {
    const newAnsw = [...answers];
    newAnsw[curQ] = val;
    setAnswers(newAnsw);
  };

  const runTestCases = async (onlyExample = false) => {
    const q = questions[curQ];
    if (!q.test_cases) return;
    
    setIsCompiling(true);
    setCompileResult(null);
    
    const results = [];
    let allPassed = true;

    const testSet = onlyExample ? q.test_cases.slice(0, 1) : q.test_cases;

    try {
      for (let i = 0; i < testSet.length; i++) {
        const tc = testSet[i];
        const res = await executeCode(answers[curQ], codingLanguage, tc.input);
        const actual = res.output.trim();
        const expected = tc.output.trim();
        const passed = actual === expected;
        if (!passed) allPassed = false;
        results.push({ input: tc.input, expected, actual, passed, error: res.error });
      }
      setCompileResult({ results, allPassed, isExampleOnly: onlyExample });
      
      if (!onlyExample && allPassed) {
        setCodingPasses(prev => ({ ...prev, [curQ]: true }));
      } else if (!onlyExample && !allPassed) {
        setCodingPasses(prev => ({ ...prev, [curQ]: false }));
      }
    } catch (err) {
      setCompileResult({ error: err.message });
    } finally {
      setIsCompiling(false);
    }
  };

  const submitQuiz = async () => {
    const left = answers.filter(a => a === -1 || (typeof a === 'string' && a.includes('# Write your code here'))).length;
    if (left > 0 && !window.confirm(`You have ${left} unanswered/unstarted questions. Submit anyway?`)) return;

    // Calculate score with LIVE state values (no stale closure)
    const mcqs = questions.filter(q => q.type !== 'coding');
    const correctMCQCount = mcqs.filter(q => answers[questions.indexOf(q)] === q.correct).length;
    const passedCodingCount = Object.values(codingPasses).filter(v => v === true).length;
    const totalPoints = mcqs.length + (Object.keys(codingPasses).length > 0 ? 3 : 0);
    const earnedPoints = correctMCQCount + passedCodingCount;
    const pct = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

    const moduleMap = {
      'Numerical Ability': 'Numerical',
      'Verbal Ability': 'Verbal',
      'Reasoning Ability': 'Reasoning',
      'Programming Logic': 'Programming',
    };
    const primarySection = config.sections[0] || 'Programming Logic';
    const topic = moduleMap[primarySection] || primarySection;
    const status = pct >= 70 ? 'completed' : pct >= 40 ? 'partial' : 'failed';

    // Save to MongoDB immediately while all state is fresh
    try {
      await saveSubmission({
        topic,
        difficulty: config.difficulty,
        language: codingLanguage,
        questionType: config.sections.includes('Programming Logic') ? 'mixed' : 'mcq',
        score: pct,
        timeTaken: totalTime - timeLeft,
        status,
        executionResult: {
          passed: pct >= 70,
          testsPassed: earnedPoints,
          testsTotal: totalPoints,
        },
        question: {
          title: `${config.sections.join(' + ')} — ${config.difficulty}`,
          description: `${questions.length} questions`,
        },
        userCode: answers.filter(a => typeof a === 'string').join('\n\n---\n\n'),
        review: {
          summary: `Scored ${pct}% on ${topic} module at ${config.difficulty} level.`,
          verdict: pct >= 70 ? 'Pass' : 'Needs Improvement',
        },
      });
      console.log('Submission saved successfully');
    } catch (err) {
      console.error('Failed to save submission:', err);
    }

    setView('score');
  };

  if (view === 'config') {
    return (
      <div className="tcs-container" style={{maxWidth: 700, margin: '0 auto'}}>
        <div className="page-header">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
              <Brain size={32} className="text-indigo-400" />
            </div>
            <h1 className="page-title" style={{margin: 0}}>SkillPilot AI</h1>
          </div>
          <p className="page-subtitle text-center">Adaptive Technical Assessments & Coding Challenges</p>
        </div>
        
        <div className="card">
          {error && (
            <div className="error-box">
              <AlertTriangle size={16}/> {error}
            </div>
          )}
          
          <div className="form-group">
            <label className="form-label">Sections</label>
            <div className="chip-list">
              {['Numerical Ability', 'Verbal Ability', 'Reasoning Ability', 'Programming Logic'].map(sec => (
                <button 
                  key={sec} 
                  className={`chip ${config.sections.includes(sec) ? 'active' : ''}`}
                  onClick={() => toggleSection(sec)}
                >
                  {sec.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label">Difficulty</label>
            <div className="chip-list">
              {['Beginner', 'Intermediate', 'Advanced'].map(diff => (
                <button 
                  key={diff} 
                  className={`chip ${config.difficulty === diff ? 'active' : ''}`}
                  onClick={() => setConfig({...config, difficulty: diff})}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Number of Questions</label>
            <div className="chip-list">
              {[5, 10, 20, 30].map(n => (
                <button 
                  key={n} 
                  className={`chip flex-1 ${config.numQ === n ? 'active' : ''}`}
                  onClick={() => setConfig({...config, numQ: n})}
                  style={{flex: 1}}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">AI Provider</label>
            <div className="chip-list">
              {['Gemini', 'OpenAI', 'Anthropic'].map(p => (
                <button 
                  key={p} 
                  className={`chip ${config.provider === p ? 'active' : ''}`}
                  onClick={() => setConfig({...config, provider: p})}
                  style={{flex: 1}}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <div className="form-group flex-1">
              <label className="form-label">Min per Coding</label>
              <input 
                type="number" 
                className="input-field" 
                value={config.timePerCoding}
                onChange={e => setConfig({...config, timePerCoding: parseInt(e.target.value) || 20})}
              />
            </div>
            <div className="form-group flex-1">
              <label className="form-label">Sec per MCQ</label>
              <input 
                type="number" 
                className="input-field" 
                value={config.timePerMCQ}
                onChange={e => setConfig({...config, timePerMCQ: parseInt(e.target.value) || 90})}
              />
            </div>
          </div>
          <div className="form-group" style={{marginBottom: 32}}>
            <div className="flex justify-between items-center mb-3">
              <label className="form-label" style={{marginBottom: 0, display: 'flex', alignItems: 'center', gap: '8px'}}>
                {config.provider} API Key
                <div className="tooltip-wrapper">
                  <HelpCircle size={14} className="text-indigo-400 cursor-help" />
                  <div className="tooltip-content">
                    <h4 className="text-xs font-bold text-white mb-2">How to get a key?</h4>
                    <div className="flex flex-col gap-2">
                      <div className="text-[11px] text-gray-300 flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[9px]">1</span>
                        Visit {config.provider === 'Gemini' ? 'Google AI Studio' : 'OpenAI Platform'}
                      </div>
                      <div className="text-[11px] text-gray-300 flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[9px]">2</span>
                        Sign in and click "Create API Key"
                      </div>
                      <div className="text-[11px] text-gray-300 flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[9px]">3</span>
                        Paste key here to save locally
                      </div>
                      <a 
                        href={config.provider === 'Gemini' ? "https://aistudio.google.com/app/apikey" : config.provider === 'OpenAI' ? "https://platform.openai.com/api-keys" : "https://console.anthropic.com/settings/keys"} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 mt-1 font-bold underline"
                      >
                        Click here to get it
                      </a>
                    </div>
                  </div>
                </div>
              </label>
            </div>
            
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Key size={16} className="text-gray-500" />
              </div>
              <input 
                type="password" 
                className="input-field" 
                style={{paddingLeft: '36px'}}
                placeholder={`Paste your ${config.provider} API key here...`} 
                value={config.apiKey}
                onChange={e => setConfig({...config, apiKey: e.target.value})}
              />
            </div>


          </div>

          <button className="btn btn-primary" style={{width: '100%', padding: '16px', fontSize: '16px'}} onClick={handleStart}>
            <Play size={18} />
            Generate Test & Start
          </button>
        </div>
      </div>
    );
  }

  if (view === 'loading') {
    return (
      <div className="loading-state">
        <Loader2 size={48} className="spinner" />
        <h2 className="loading-title">Forging your assessment...</h2>
        <p className="loading-sub">SkillPilot AI is generating unique technical challenges matching your criteria...</p>
      </div>
    );
  }

  if (view === 'quiz') {
    const q = questions[curQ];
    const isCoding = q.type === 'coding';
    
    return (
      <div className={`quiz-container ${isCoding ? 'coding-layout' : ''}`}>
        <div className="quiz-header">
          <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
            <span className="badge badge-primary">{q.section}</span>
            <span className="q-progress">Question {curQ + 1} of {questions.length}</span>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
            <div className={`timer ${timeLeft < 60 ? 'timer-warn' : ''}`}>
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </div>
            <button className="btn" style={{background: 'var(--danger)', color: '#fff'}} onClick={submitQuiz}>
              Submit
            </button>
          </div>
        </div>

        <div className="quiz-body">
          <div className="quiz-main">
            {isCoding ? (
              <div className="markdown-body">
                <ReactMarkdown>{q.question}</ReactMarkdown>
              </div>
            ) : (
              <h2 className="q-text">{q.question}</h2>
            )}
            
            {q.code && !isCoding && (
              <pre className="q-code">{q.code}</pre>
            )}

            {isCoding && q.test_cases && (
              <div className="test-cases-example mb-6" style={{ marginTop: '20px' }}>
                <h4 className="text-sm font-bold text-indigo-400 mb-2 flex items-center gap-2">
                  <Terminal size={14} /> Example Test Cases
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  {q.test_cases.slice(0, 2).map((tc, idx) => (
                    <div key={idx} style={{ padding: '12px', background: '#18191e', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', fontSize: '12px' }}>
                      <div style={{ marginBottom: '4px' }}><span style={{ color: '#6b7280' }}>Input:</span> <code style={{ color: '#818cf8' }}>{tc.input}</code></div>
                      <div><span style={{ color: '#6b7280' }}>Output:</span> <code style={{ color: '#4ade80' }}>{tc.output}</code></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!isCoding ? (
              <div className="options-list">
                {q.options.map((opt, i) => {
                  let btnCls = 'option-btn';
                  let icon = <div className="opt-key">{String.fromCharCode(65+i)}</div>;
                  if (answers[curQ] === i) btnCls += ' opt-selected';

                  return (
                    <button key={i} className={btnCls} onClick={() => handleMCQAnswer(i)}>
                      {icon}
                      <span className="opt-text">{opt}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="coding-workspace card">
                <div className="workspace-header">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Code size={16} /> Language:
                    </div>
                    <select 
                      className="lang-select"
                      value={codingLanguage}
                      onChange={(e) => setCodingLanguage(e.target.value)}
                    >
                      <option value="python">Python 3</option>
                      <option value="c">C</option>
                      <option value="cpp">C++</option>
                      <option value="java">Java</option>
                      <option value="javascript">JavaScript</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn btn-secondary btn-sm" onClick={() => runTestCases(true)} disabled={isCompiling}>
                      {isCompiling ? <Loader2 size={14} className="spinner" /> : <Play size={14} />}
                      Run Example
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={() => runTestCases(false)} disabled={isCompiling}>
                      {isCompiling ? <Loader2 size={14} className="spinner" /> : <Play size={14} />}
                      Run Tests
                    </button>
                  </div>
                </div>
                
                <div className="editor-container">
                  <Editor
                    height="400px"
                    defaultLanguage="python"
                    language={codingLanguage}
                    theme="vs-dark"
                    value={answers[curQ]}
                    onChange={handleCodeChange}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                    }}
                  />
                </div>

                {compileResult && (
                  <div className={`terminal-output ${compileResult.error ? 'err' : ''}`}>
                    <div className="term-head">
                      <Terminal size={14} /> Terminal Output
                    </div>
                    {compileResult.error ? (
                      <div className="term-body text-red-400">{compileResult.error}</div>
                    ) : (
                      <div className="term-body">
                        {compileResult.results.map((r, i) => (
                          <div key={i} className={`test-row ${r.passed ? 'pass' : 'fail'}`}>
                            <span>Test Case {i+1}:</span>
                            <span className="badge">{r.passed ? 'PASSED' : 'FAILED'}</span>
                            {!r.passed && <span className="text-xs ml-2">Exp: {r.expected} | Got: {r.actual}</span>}
                          </div>
                        ))}
                        <div className={`final-status ${compileResult.allPassed ? 'text-green-400' : 'text-red-400'}`}>
                          {compileResult.allPassed ? '✓ ALL TEST CASES PASSED' : '✗ SOME TEST CASES FAILED'}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="quiz-sidebar">
            <h4 className="pal-label">Question Palette</h4>
            <div className="palette-grid">
              {questions.map((_, i) => {
                let cls = 'pal-btn';
                if (i === curQ) cls += ' current';
                else if (answers[i] !== -1 && typeof answers[i] !== 'string') cls += ' answered';
                else if (typeof answers[i] === 'string' && !answers[i].includes('# Write your code here')) cls += ' answered';
                return (
                  <button key={i} className={cls} onClick={() => { setCurQ(i); setCompileResult(null); }}>
                    {i+1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="quiz-footer">
          <button className="btn btn-secondary" disabled={curQ === 0} onClick={() => { setCurQ(c => c-1); setCompileResult(null); }}>Prev</button>
          <button className="btn btn-secondary" disabled={curQ === questions.length-1} onClick={() => { setCurQ(c => c+1); setCompileResult(null); }}>Next</button>
        </div>
      </div>
    );
  }

  if (view === 'score') {
    const mcqs = questions.filter(q => q.type !== 'coding');
    
    const correctMCQCount = mcqs.filter((q) => {
      const idx = questions.indexOf(q);
      return answers[idx] === q.correct;
    }).length;

    const passedCodingCount = Object.values(codingPasses).filter(v => v === true).length;
    
    // Weighted scoring: Coding is 30% of total score if applicable
    const mcqWeight = mcqs.length > 0 ? (correctMCQCount / mcqs.length) * 70 : 0;
    const codingWeight = Object.keys(codingPasses).length > 0 ? (passedCodingCount / 3) * 30 : 0;
    
    const totalPoints = mcqs.length + (Object.keys(codingPasses).length > 0 ? 3 : 0);
    const earnedPoints = correctMCQCount + passedCodingCount;
    const pct = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

    return (
      <div className="score-container">
        <div className="card score-card">
          <div className="score-circle">
            <span className="score-pct">{pct}%</span>
          </div>
          <h2 className="score-title">{pct >= 70 ? 'Excellent!' : 'Keep practicing!'}</h2>
          <p className="score-sub">
            MCQ: {correctMCQCount}/{mcqs.length} Correct | Coding: {passedCodingCount}/3 Passed
          </p>
          
          <div className="score-actions">
            <button className="btn btn-secondary" onClick={() => setView('review')}>Review Answers</button>
            <button className="btn btn-primary" onClick={() => setView('config')}>Start New Session</button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'review') {
    return (
      <div className="review-container" style={{maxWidth: 800, margin: '0 auto', paddingBottom: 60}}>
        <div className="review-header" style={{display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32}}>
          <button className="btn btn-secondary" onClick={() => setView('score')}>← Back to Score</button>
          <h2 className="page-title" style={{margin: 0}}>Test Review</h2>
        </div>
        
        <div className="review-list" style={{display: 'flex', flexDirection: 'column', gap: 24}}>
          {questions.map((q, i) => {
            const isCoding = q.type === 'coding';
            const isMCQCorrect = !isCoding && answers[i] === q.correct;
            const isSkipped = answers[i] === -1 || (isCoding && answers[i].includes('# Write your code'));
            
            return (
              <div key={i} className="card">
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 16}}>
                  <div style={{display: 'flex', gap: 8}}>
                    <span className="badge badge-primary">{q.section}</span>
                    <span style={{color: 'var(--text-muted)'}}>Q{i+1}</span>
                  </div>
                  {isCoding ? (
                    <span className={`badge ${codingPasses[i] ? 'badge-success' : isSkipped ? 'badge-warning' : 'badge-danger'}`}>
                      {codingPasses[i] ? 'Passed' : isSkipped ? 'Skipped' : 'Failed'}
                    </span>
                  ) : (
                    <span className={`badge ${isSkipped ? 'badge-warning' : isMCQCorrect ? 'badge-success' : 'badge-danger'}`}>
                      {isSkipped ? 'Skipped' : isMCQCorrect ? 'Correct' : 'Wrong'}
                    </span>
                  )}
                </div>
                
                <p className="q-text">{q.question}</p>
                {q.code && !isCoding && (
                  <pre className="q-code">{q.code}</pre>
                )}
                
                {!isCoding ? (
                  <div style={{display: 'flex', flexDirection: 'column', gap: 8, margin: '20px 0'}}>
                    {q.options.map((opt, j) => {
                      let c = 'rev-opt ';
                      if (j === q.correct) c += 'correct';
                      else if (j === answers[i] && !isMCQCorrect) c += 'wrong';
                      return <div key={j} className={c}>{String.fromCharCode(65+j)}. {opt}</div>
                    })}
                  </div>
                ) : (
                  <div className="my-4 p-4 bg-[#0d0e12] rounded-lg border border-white/5">
                    <div className="text-sm font-bold text-indigo-400 mb-2">Submitted Code:</div>
                    <pre className="text-xs text-gray-300 font-mono overflow-x-auto">{answers[i]}</pre>
                  </div>
                )}
                
                <div className="explanation-box">
                  <div className="exp-label">Explanation</div>
                  <div className="exp-text">{q.explanation}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin text-indigo-500" size={40} />
        <span className="text-gray-400 font-medium">Initializing Skillpilot...</span>
      </div>
    </div>
  );
}
