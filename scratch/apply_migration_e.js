const fs = require('fs');
const https = require('https');

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error("ERROR: SUPABASE_ACCESS_TOKEN environment variable is not set.");
  process.exit(1);
}

const proj = 'esmppoxxnyiscidzsjvy';
const sql = fs.readFileSync('supabase/migrations/20260625000003_checkin_links_and_boarding_events.sql', 'utf8');

const body = JSON.stringify({ query: sql });

const req = https.request({
  hostname: 'api.supabase.com',
  port: 443,
  path: `/v1/projects/${proj}/database/query`,
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  }
}, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    console.log('RESPONSE:', data);
    process.exit(res.statusCode === 201 || res.statusCode === 200 ? 0 : 1);
  });
});

req.on('error', (err) => {
  console.error('ERROR:', err);
  process.exit(1);
});

req.write(body);
req.end();
