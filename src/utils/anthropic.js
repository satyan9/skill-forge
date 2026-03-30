export async function generateTCSQuestions(apiKey, sections, difficulty, numQ) {
  const perSec = Math.ceil(numQ / sections.length);
  const prompt = `You are an expert TCS NQT exam question creator. Generate exactly ${numQ} multiple-choice questions for TCS NQT exam preparation.

Sections to cover (distribute evenly): ${sections.join(', ')}
Difficulty: ${difficulty}
Total questions: ${numQ} (approx ${perSec} per section)

Rules:
- Each question must have exactly 4 options (A, B, C, D)
- One correct answer per question
- Include a clear, concise explanation
- Questions must be fresh and unique
- For Programming Logic: include Python/C code snippets with output questions, time complexity, data structures
- For Numerical: word problems, percentages, ratio, time-work, SI/CI, probability
- For Verbal: grammar, vocabulary, reading comprehension, sentence correction
- For Reasoning: series, coding-decoding, blood relations, syllogisms, seating arrangements

IMPORTANT: Respond ONLY with a valid JSON array. No markdown, no explanation, just the JSON.

Format (array of exactly ${numQ} objects):
[
  {
    "section": "Numerical Ability",
    "question": "Question text here",
    "code": null,
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": 0,
    "explanation": "Clear explanation here"
  }
]`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${res.status}`);
  }

  const data = await res.json();
  const raw = data.content.map(c => c.text || '').join('');
  
  let parsed;
  try {
    const jsonStr = raw.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim();
    parsed = JSON.parse(jsonStr);
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
