const crypto = require('crypto');
// conf.json says passwordType: sha256, but let's try both
const sha = crypto.createHash('sha256').update('Test1234').digest('hex');
const md5 = crypto.createHash('md5').update('Test1234').digest('hex');
console.log('sha256:', sha);
console.log('md5:', md5);
