const http = require('http');

const data = JSON.stringify({
  machineID: 'drishyamvms',
  mail: 'test@drishyam.com',
  pass: 'Test1234',
  function: 'dash'
});

const req = http.request({
  hostname: '127.0.0.1',
  port: 8080,
  path: '/?json=true',
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
}, (res) => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    try {
      const parsed = JSON.parse(body);
      console.log('Response:', JSON.stringify(parsed, null, 2));
    } catch(e) {
      console.log('Response (raw):', body.substring(0, 500));
    }
  });
});

req.write(data);
req.end();
