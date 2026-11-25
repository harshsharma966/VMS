/**
 * Fix Double Port Bug in Shinobi Monitors
 * Problem: RTSP URLs have :554:554 instead of :554
 * Solution: Reconfigure all monitors with corrected host field
 */

const axios = require('axios');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const SHINOBI_URL = process.env.SHINOBI_URL || 'http://localhost:8443';

const client = axios.create({
  baseURL: SHINOBI_URL,
  timeout: 30000,
});

// Get all unique group keys from database
async function getAllGroupKeys() {
  const mysql = require('mysql2/promise');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const [rows] = await connection.query(
    'SELECT DISTINCT group_key, api_key FROM users WHERE group_key IS NOT NULL AND api_key IS NOT NULL'
  );

  await connection.end();
  return rows;
}

// Get all monitors for a group
async function getMonitors(apiKey, groupKey) {
  try {
    const { data } = await client.get(`/${apiKey}/monitor/${groupKey}`);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(`Failed to get monitors for group ${groupKey}:`, error.message);
    return [];
  }
}

// Get all cameras from database to rebuild configs
async function getCamerasFromDB() {
  const mysql = require('mysql2/promise');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const [rows] = await connection.query(
    'SELECT monitor_id, name, username, password, host, port, path, type, width, height, fps, group_id FROM cameras'
  );

  await connection.end();
  return rows;
}

// Update monitor with correct configuration
async function updateMonitor(apiKey, groupKey, monitor, cameraFromDB) {
  try {
    const details = JSON.parse(monitor.details || '{}');

    // Build corrected host field (WITHOUT port)
    const auth = cameraFromDB.username ? `${cameraFromDB.username}:${cameraFromDB.password || ''}@` : '';
    const correctedHost = `${auth}${cameraFromDB.host}`;  // No port!

    // Update monitor config
    const updatedMonitor = {
      ...monitor,
      host: correctedHost,  // This is the fix!
      port: String(cameraFromDB.port || 554),
      details: JSON.stringify(details),
    };

    const { data } = await client.post(
      `/${apiKey}/configureMonitor/${groupKey}/${monitor.mid}`,
      { data: JSON.stringify(updatedMonitor) }
    );

    return data;
  } catch (error) {
    console.error(`Failed to update monitor ${monitor.mid}:`, error.message);
    throw error;
  }
}

// Restart monitor
async function restartMonitor(apiKey, groupKey, monitorId) {
  try {
    await client.get(`/${apiKey}/monitor/${groupKey}/${monitorId}/stop`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    await client.get(`/${apiKey}/monitor/${groupKey}/${monitorId}/start`);
    return true;
  } catch (error) {
    console.warn(`Failed to restart monitor ${monitorId}:`, error.message);
    return false;
  }
}

// Main execution
async function main() {
  console.log('🔧 Fixing Double Port Bug in Shinobi Monitors...\n');

  try {
    const groups = await getAllGroupKeys();
    const camerasDB = await getCamerasFromDB();

    // Create map of monitor_id -> camera config
    const cameraMap = {};
    for (const cam of camerasDB) {
      cameraMap[cam.monitor_id] = cam;
    }

    console.log(`✅ Found ${groups.length} user group(s)`);
    console.log(`✅ Found ${camerasDB.length} cameras in database\n`);

    let totalFixed = 0;
    let totalFailed = 0;

    for (const { group_key, api_key } of groups) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`Processing Group: ${group_key}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      const monitors = await getMonitors(api_key, group_key);
      console.log(`📹 Found ${monitors.length} monitors\n`);

      if (monitors.length === 0) continue;

      for (const monitor of monitors) {
        const cameraFromDB = cameraMap[monitor.mid];

        if (!cameraFromDB) {
          console.log(`⏭️  Skipping ${monitor.name} (${monitor.mid}) - not in database`);
          continue;
        }

        // Check if monitor has double port bug
        const hasDoubleBug = monitor.host && monitor.host.includes(`:${monitor.port}`);

        if (!hasDoubleBug) {
          console.log(`✓ ${monitor.name}: Already correct`);
          continue;
        }

        try {
          console.log(`🔧 Fixing: ${monitor.name} (${monitor.mid})`);
          console.log(`   Old host: ${monitor.host}`);

          await updateMonitor(api_key, group_key, monitor, cameraFromDB);
          await restartMonitor(api_key, group_key, monitor.mid);

          const auth = cameraFromDB.username ? `${cameraFromDB.username}:***@` : '';
          console.log(`   New host: ${auth}${cameraFromDB.host}`);
          console.log(`   ✅ Fixed and restarted`);
          totalFixed++;
        } catch (error) {
          console.error(`   ❌ Failed:`, error.message);
          totalFailed++;
        }
      }
    }

    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Fixed: ${totalFixed} monitors`);
    console.log(`❌ Failed: ${totalFailed} monitors`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (totalFixed > 0) {
      console.log('🎥 Monitors should now start streaming VIDEO!');
      console.log('   Wait 10-15 seconds for HLS playlists to generate');
      console.log('   Then refresh your frontend at http://localhost:5173\n');

      // Wait and check FFmpeg
      console.log('Waiting 10 seconds for streams to initialize...');
      await new Promise(resolve => setTimeout(resolve, 10000));

      const { exec } = require('child_process');
      exec('docker exec shinobi ps aux | grep ffmpeg | grep -v defunct | grep -v grep | wc -l', (error, stdout) => {
        if (!error) {
          const count = parseInt(stdout.trim());
          console.log(`\n📹 Active FFmpeg processes: ${count}`);
          if (count > 0) {
            console.log('✅ VIDEO STREAMING IS NOW WORKING! 🎉\n');
          } else {
            console.log('⚠️  Still no FFmpeg processes. Check camera connectivity.\n');
          }
        }
      });
    }

  } catch (error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);
