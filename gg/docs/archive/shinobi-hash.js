// Compute the SHA256 hash the same way Shinobi does, then update it in DB
const crypto = require('crypto');
const correctHash = crypto.createHash('sha256').update('Test1234').digest('hex');
console.log('SHA256 of Test1234:', correctHash);

// Now query current DB value
const cp = require('child_process');
const result = cp.execSync("mysql -u root ccio -N -e \"SELECT pass FROM Users WHERE mail='test@drishyam.com'\"").toString().trim();
console.log('Current DB pass:', result);
console.log('Match:', result === correctHash);

if (result !== correctHash) {
  console.log('Updating password...');
  cp.execSync("mysql -u root ccio -e \"UPDATE Users SET pass='" + correctHash + "' WHERE mail='test@drishyam.com'\"");
  console.log('Done!');
} else {
  console.log('Password already correct.');
}
