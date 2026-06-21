// Using global fetch

async function testKey(name, key) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Reponda apenas 'OK' se você recebeu isso." }] }]
      }),
    });
    console.log(`Key ${name} status:`, res.status);
    const data = await res.json();
    console.log(`Key ${name} response:`, JSON.stringify(data));
  } catch (err) {
    console.error(`Key ${name} failed:`, err);
  }
}

async function main() {
  await testKey("gemini (AIzaSyAO...)", "AIzaSyAO4vBQRCE7QX-B8l542iHvQZIT-biK-M8");
  await testKey("GEMINI_API_KEY (AIzaSyCR...)", "AIzaSyCR2xy6Pm440Hcw8IsIiCxYLYo3vNrxV5o");
}

main();
