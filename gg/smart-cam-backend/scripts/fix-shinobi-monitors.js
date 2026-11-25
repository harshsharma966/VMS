/**
 * Fix Shinobi Monitors - Change from 'record' to 'start' mode
 * This script updates all monitors to use continuous streaming mode
 */

const axios = require('axios');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const SHINOBI_URL = process.env.SHINOBI_URL || 'http://localhost:8443';
const SHINOBI_API_KEY = process.env.SHINOBI_API_KEY;

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

// Update a single monitor
async function updateMonitor(apiKey, groupKey, monitor) {
  try {
    const details = JSON.parse(monitor.details || '{}');

    // Parse the monitor config
    const updatedMonitor = {
      ...monitor,
      mode: 'start', // ← CRITICAL FIX: Change to continuous streaming
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

// Restart monitor to apply changes
async function restartMonitor(apiKey, groupKey, monitorId) {
  try {
    // Stop
    await client.get(`/${apiKey}/monitor/${groupKey}/${monitorId}/stop`);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s

    // Start
    await client.get(`/${apiKey}/monitor/${groupKey}/${monitorId}/start`);
    return true;
  } catch (error) {
    console.warn(`Failed to restart monitor ${monitorId}:`, error.message);
    return false;
  }
}

// Main execution
async function main() {
  console.log('🔧 Starting Shinobi Monitor Fix...\n');
  console.log(`📡 Shinobi URL: ${SHINOBI_URL}`);
  console.log(`🔑 API Key: ${SHINOBI_API_KEY}\n`);

  try {
    // Get all groups
    console.log('📋 Fetching user groups from database...');
    const groups = await getAllGroupKeys();
    console.log(`✅ Found ${groups.length} user group(s)\n`);

    let totalUpdated = 0;
    let totalFailed = 0;

    // Process each group
    for (const { group_key, api_key } of groups) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`Processing Group: ${group_key}`);
      console.log(`API Key: ${api_key}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      // Get monitors for this group
      const monitors = await getMonitors(api_key, group_key);
      console.log(`📹 Found ${monitors.length} monitors in this group\n`);

      if (monitors.length === 0) continue;

      // Update each monitor
      for (const monitor of monitors) {
        const currentMode = monitor.mode;

        if (currentMode === 'start') {
          console.log(`✓ ${monitor.name} (${monitor.mid}): Already in 'start' mode - skipping`);
          continue;
        }

        try {
          console.log(`⚙️  ${monitor.name} (${monitor.mid}): Updating from '${currentMode}' to 'start' mode...`);

          // Update monitor configuration
          await updateMonitor(api_key, group_key, monitor);

          // Restart to apply changes
          await restartMonitor(api_key, group_key, monitor.mid);

          console.log(`✅ ${monitor.name}: Successfully updated and restarted`);
          totalUpdated++;
        } catch (error) {
          console.error(`❌ ${monitor.name}: Failed to update -`, error.message);
          totalFailed++;
        }
      }
    }

    // Summary
    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Successfully updated: ${totalUpdated} monitors`);
    console.log(`❌ Failed: ${totalFailed} monitors`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (totalUpdated > 0) {
      console.log('🎉 All monitors have been updated to continuous streaming mode!');
      console.log('🔄 Please refresh your Live View page to see the live streams.\n');
    }

  } catch (error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);
