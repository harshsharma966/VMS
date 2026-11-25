const crypto = require('crypto');
const mysql = require('mysql');

const db = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  database: 'ccio'
});

db.connect(function(err) {
  if (err) { console.error('DB error:', err.message); process.exit(1); }

  // Check current password in DB
  db.query("SELECT ke, mail, pass, auth FROM Users WHERE mail='test@drishyam.com'", function(err, rows) {
    if (err) { console.error(err.message); process.exit(1); }
    console.log('Current DB row:', JSON.stringify(rows[0]));

    // Try updating with MD5 (some Shinobi versions use MD5 regardless of config)
    const md5pass = crypto.createHash('md5').update('Test1234').digest('hex');
    db.query("UPDATE Users SET pass=? WHERE mail='test@drishyam.com'", [md5pass], function(err) {
      if (err) { console.error(err.message); process.exit(1); }
      console.log('Updated password to MD5:', md5pass);
      db.end();
    });
  });
});
