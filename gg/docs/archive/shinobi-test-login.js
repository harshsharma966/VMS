const http = require('http');

const data = JSON.stringify({
  machineID: 'drishyamvms',
  mail: 'test@drishyam.com',
  pass: 'Test1234',
  function: 'dash'
});

const req = http.request({
  hostname: 'localhost',
  port: 8443,
  path: '/?json=true',
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
}, (res) => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => console.log('Response:', body));
});

req.write(data);
req.end();
