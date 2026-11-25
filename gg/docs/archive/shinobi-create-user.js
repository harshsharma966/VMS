const http = require('http');

function apiCall(method, path, data) {
  return new Promise((resolve, reject) => {
    const body = data ? JSON.stringify(data) : '';
    const headers = data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } : {};
    const req = http.request({ hostname: 'localhost', port: 8443, path, method, headers }, (res) => {
      let chunks = '';
      res.on('data', c => chunks += c);
      res.on('end', () => {
        try { resolve(JSON.parse(chunks)); } catch(e) { resolve(chunks.substring(0, 500)); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  const TOKEN = 'drishyam-super-token-123';
  const KE = '6b17427adfc70df0b5415ffd73a1e243';
  const UID = '5dff221a758a02fb1479b21a533fca25';

  // Edit existing user to set a new password
  console.log('--- Editing user password ---');
  const editResult = await apiCall('POST', '/super/' + TOKEN + '/accounts/editAdmin', {
    data: JSON.stringify({
      ke: KE,
      uid: UID,
      mail: 'test@drishyam.com',
      pass: 'Test1234',
      password_again: 'Test1234'
    })
  });
  console.log('Edit:', JSON.stringify(editResult, null, 2));

  await new Promise(r => setTimeout(r, 1000));

  // Test login
  console.log('\n--- Testing login ---');
  const loginResult = await apiCall('POST', '/?json=true', {
    machineID: 'drishyamvms',
    mail: 'test@drishyam.com',
    pass: 'Test1234',
    function: 'dash'
  });
  console.log('Login:', JSON.stringify(loginResult, null, 2));
}

main().catch(console.error);
