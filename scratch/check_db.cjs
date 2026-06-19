const https = require('https');

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error("ERROR: SUPABASE_ACCESS_TOKEN environment variable is not set.");
  process.exit(1);
}

const proj = 'esmppoxxnyiscidzsjvy';
const sql = `
  SELECT column_name, data_type 
  FROM information_schema.columns 
  WHERE table_name = 'agency_members' AND table_schema = 'public';
`;

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
  });
});

req.on('error', (err) => {
  console.error('ERROR:', err);
});

req.write(body);
req.end();
