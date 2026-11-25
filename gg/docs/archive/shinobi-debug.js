const crypto = require('crypto');
const http = require('http');

// What Shinobi would compute server-side with sha256
const sha256 = crypto.createHash('sha256').update('Test1234').digest('hex');
console.log('Expected sha256 hash:', sha256);

// Try login with form-urlencoded (like the HTML form does)
const formData = 'machineID=drishyamvms&mail=test%40drishyam.com&pass=Test1234&function=dash';

const req = http.request({
  hostname: 'localhost',
  port: 8443,
  path: '/?json=true',
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(formData) }
}, (res) => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => console.log('Form response:', body));
});

req.write(formData);
req.end();
