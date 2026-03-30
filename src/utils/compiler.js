export async function executeCode(sourceCode, language = 'python', stdin = '') {
  const languageMap = {
    'python': { name: 'python3', id: 71 },
    'python3': { name: 'python3', id: 71 },
    'c': { name: 'c', id: 50 },
    'cpp': { name: 'cpp', id: 54 },
    'java': { name: 'java', id: 62 },
    'javascript': { name: 'javascript', id: 63 }
  };

  const config = languageMap[language.toLowerCase()] || languageMap['python3'];

  // Mirror 1: Judge0 CE (Standard Public Mirror)
  try {
    const res = await fetch('https://ce.judge0.com/submissions?base64_encoded=false&wait=true', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_code: sourceCode,
        language_id: config.id,
        stdin: stdin
      })
    });
    if (res.ok) {
      const data = await res.json();
      return { 
        output: (data.stdout || data.stderr || "").trim(),
        error: data.stderr || "",
        exitCode: data.status.id === 3 ? 0 : 1
      };
    }
  } catch (e) {}

  // Mirror 2: Glot.io (Backup API)
  try {
    const glotRes = await fetch(`https://glot.io/api/run/${config.name === 'python3' ? 'python' : config.name}/latest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        files: [{ name: 'main', content: sourceCode }],
        stdin: stdin
      })
    });
    if (glotRes.ok) {
      const data = await glotRes.json();
      return { output: (data.stdout || data.stderr || "").trim(), error: data.stderr || "", exitCode: 0 };
    }
  } catch (e) {}

  // Mirror 3: JDoodle 
  try {
    const jdRes = await fetch('https://api.jdoodle.com/v1/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: "9a008b8b0e7d5815a9757656641219b1",
        clientSecret: "f9c94ced40467770857502c403328e124587c42738a98345a0b73ea0be574167",
        script: sourceCode,
        language: config.name === 'python3' ? 'python3' : 'nodejs',
        versionIndex: "3",
        stdin: stdin
      })
    });
    if (jdRes.ok) {
      const data = await jdRes.json();
      return { output: (data.output || "").trim(), error: data.stderr || "", exitCode: 0 };
    }
  } catch (e) {}

  throw new Error("Unable to reach any compiler mirrors. Please check your internet connection.");
}
