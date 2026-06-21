async function testUrl(name, url) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Responda apenas 'OK' se você recebeu isso." }] }]
      }),
    });
    console.log(`${name} status:`, res.status);
    const data = await res.json();
    console.log(`${name} response:`, JSON.stringify(data));
  } catch (err) {
    console.error(`${name} failed:`, err);
  }
}

async function main() {
  const keys = {
    gemini: "AIzaSyAO4vBQRCE7QX-B8l542iHvQZIT-biK-M8",
    GEMINI_API_KEY: "AIzaSyCR2xy6Pm440Hcw8IsIiCxYLYo3vNrxV5o"
  };

  for (const [kName, key] of Object.entries(keys)) {
    console.log(`\n--- Testing key: ${kName} ---`);
    
    // v1beta with gemini-1.5-flash (current)
    await testUrl("v1beta gemini-1.5-flash", `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`);
    
    // v1 with gemini-1.5-flash
    await testUrl("v1 gemini-1.5-flash", `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${key}`);

    // v1beta with gemini-1.5-flash-latest
    await testUrl("v1beta gemini-1.5-flash-latest", `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${key}`);

    // v1 with gemini-1.5-flash-latest
    await testUrl("v1 gemini-1.5-flash-latest", `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent?key=${key}`);

    // v1 with gemini-2.5-flash
    await testUrl("v1 gemini-2.5-flash", `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${key}`);
  }
}

main();
