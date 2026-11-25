const crypto = require('crypto');

const email = 'test@drishyam.com';
const pass = crypto.createHash('sha256').update('Test1234').digest('hex');
const ke = crypto.randomBytes(16).toString('hex');
const uid = crypto.randomBytes(16).toString('hex');
const auth = crypto.randomBytes(16).toString('hex');
const details = JSON.stringify({"sub":true,"allmonitors":"1","monitor_create":"1","monitor_edit":"1","monitor_delete":"1","video_delete":"1","video_view":"1"});

const sql = `INSERT INTO Users (ke, uid, mail, pass, auth_token, details) VALUES ('${ke}', '${uid}', '${email}', '${pass}', '${auth}', '${details}');`;

console.log('SQL: ' + sql);
console.log('');
console.log(JSON.stringify({ email, groupKey: ke, apiKey: auth }, null, 2));
