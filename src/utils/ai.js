export async function generateTCSQuestions(provider, apiKey, sections, difficulty, numQ) {
  const perSec = Math.ceil(numQ / sections.length);
  const prompt = `You are Skillpilot AI, an elite technical interview and assessment platform. Generate exactly ${numQ} high-quality questions for a professional technical examination.

Sections to cover (distribute evenly): ${sections.join(', ')}
Difficulty: ${difficulty}
Total questions: ${numQ} (approx ${perSec} per section)

Rules:
- Each question must have exactly 4 options (A, B, C, D)
- One correct answer per question
- Include a clear, concise explanation
- Questions must be fresh and unique
- For Programming Logic: include advanced snippets with logic puzzles, algorithmic output prediction, and performance optimization concepts.
- For Numerical: word problems, percentages, ratio, time-work, SI/CI, probability
- For Verbal: grammar, vocabulary, reading comprehension, sentence correction
- For Reasoning: series, coding-decoding, blood relations, syllogisms, seating arrangements

IMPORTANT: Respond ONLY with a valid JSON array of objects. No markdown formatting, no code blocks (like \`\`\`json), just the raw JSON array.

Format (array of exactly ${numQ} objects):
[
  {
    "section": "Numerical Ability",
    "question": "Question text here",
    "type": "mcq", // mcq or coding
    "code": null,
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": 0, // only for mcq
    "explanation": "Clear explanation here",
    "test_cases": null // only for coding: [{ input: "2 3", output: "5" }]
  }
]

Note for Programming: Exactly 3 questions must be of type 'coding'. 
For 'coding' questions, you MUST:
1. Source problems directly from or inspired by real LeetCode, HackerRank, GeeksforGeeks, and TCS Digital past papers.
2. NEVER ask "What will be the output...". This is a bug. You must present a FULL coding problem.
3. The 'question' field MUST be formatted with Markdown and follow this structure:
   # [Problem Title]
   ## Description
   [Detailed context, story, and logic requirements like LeetCode]
   ## Example
   - Input: x
   - Output: y
   ## Constraints
   - [Complexity requirements]
   - [Input range]
4. Provide internal constraints (e.g., "Time Complexity: O(n log n)").
5. Include EXACTLY 3 test cases in 'test_cases'.
6. Do NOT provide options for coding questions.
7. All 'mcq' questions must have 4 options and 1 correct index.`;

  let raw = '';

  if (provider === 'Anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Anthropic API error ${res.status}`);
    }
    const data = await res.json();
    raw = data.content.map(c => c.text || '').join('');
  } 
  
  else if (provider === 'OpenAI') {
    // Attempt with a standard CORS proxy to bypass browser security blocks
    // Using a reliable public proxy for development
    const url = `https://corsproxy.io/?${encodeURIComponent('https://api.openai.com/v1/chat/completions')}`;
    
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Output raw JSON array of questions only.' },
            { role: 'user', content: prompt }
          ]
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `OpenAI error ${res.status}`);
      }
      const data = await res.json();
      raw = data.choices[0].message.content;
    } catch (e) {
      // If CORS Proxy also fails
      throw new Error(`OpenAI Connection failed: ${e.message}. For direct browser access, Gemini is the recommended stable provider.`);
    }
  }
  
  else if (provider === 'Gemini') {
    let targetModel = 'gemini-1.5-flash';
    let res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    if (!res.ok) {
      try {
        const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (modelsRes.ok) {
          const modelsData = await modelsRes.json();
          const supported = modelsData.models
            .filter(m => m.supportedGenerationMethods.includes("generateContent"))
            .map(m => m.name.replace('models/', ''));
          const fallback = supported.find(m => m.includes('flash')) || 
                           supported.find(m => m.includes('2.0')) ||
                           supported.find(m => m.includes('pro')) || 
                           supported[0];
          if (fallback) {
            res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${fallback}:generateContent?key=${apiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });
          }
        }
      } catch (e) {} 
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Gemini API error ${res.status}. Your key may be restricted or invalid.`);
    }
    const data = await res.json();
    raw = data.candidates[0].content.parts[0].text;
  }

  // Parse JSON properly
  let parsed;
  try {
    const jsonStr = raw.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim();
    parsed = JSON.parse(jsonStr);
    if (parsed.questions && Array.isArray(parsed.questions)) {
      parsed = parsed.questions;
    }
  } catch(e) {
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('Could not parse AI response as JSON. Try again.');
    parsed = JSON.parse(match[0]);
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('AI returned no questions. Please try again.');
  }

  return parsed.slice(0, numQ);
}
