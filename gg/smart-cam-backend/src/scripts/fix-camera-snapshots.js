#!/usr/bin/env node
/**
 * Fix Camera Snapshot Settings
 *
 * Problem: 31 cameras with snap_fps=1 (1 snapshot/sec) → 31 snapshots/sec → FFmpeg overload
 * Solution: Disable snapshots or reduce to 0.1 fps (1 snapshot every 10 seconds)
 *
 * Usage: node src/scripts/fix-camera-snapshots.js
 */

const axios = require('axios');
const config = require('../config/env');
const logger = require('../config/logger');

const SHINOBI_URL = config.shinobi.url;
const API_KEY = config.shinobi.apiKey;
const GROUP_KEY = '6b17427adfc70df0b5415ffd73a1e243'; // From Shinobi accounts list

async function fixCameraSnapshots() {
  try {
    console.log('🔍 Fetching all monitors from Shinobi...');

    // Get all monitors
    const { data: monitors } = await axios.get(
      `${SHINOBI_URL}/${API_KEY}/monitor/${GROUP_KEY}`
    );

    if (!Array.isArray(monitors)) {
      console.error('❌ No monitors found or invalid response');
      return;
    }

    console.log(`📊 Found ${monitors.length} monitors`);

    let updated = 0;
    let skipped = 0;

    for (const monitor of monitors) {
      const details = JSON.parse(monitor.details || '{}');

      // Check current snapshot settings
      const currentSnap = details.snap;
      const currentSnapFps = details.snap_fps;

      console.log(`\n📹 Monitor: ${monitor.name} (${monitor.mid})`);
      console.log(`   Current: snap=${currentSnap}, snap_fps=${currentSnapFps}`);

      // Skip if already optimized
      if (currentSnap === '0' || currentSnapFps === '0' || !currentSnap) {
        console.log('   ✅ Already optimized, skipping');
        skipped++;
        continue;
      }

      // Update to disable snapshots (use 0 for no snapshots, or 0.1 for 1 every 10 seconds)
      details.snap = '0';  // Disable snapshots completely
      details.snap_fps = '0';

      // Rebuild monitor config
      const updatedConfig = {
        ...monitor,
        details: JSON.stringify(details)
      };

      // Update monitor
      console.log('   🔧 Disabling snapshots...');
      await axios.post(
        `${SHINOBI_URL}/${API_KEY}/configureMonitor/${GROUP_KEY}/${monitor.mid}`,
        { data: JSON.stringify(updatedConfig) }
      );

      console.log('   ✅ Updated successfully');
      updated++;

      // Small delay to avoid overwhelming Shinobi
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Snapshot optimization complete!`);
    console.log(`   Updated: ${updated} cameras`);
    console.log(`   Skipped: ${skipped} cameras`);
    console.log(`   Total:   ${monitors.length} cameras`);
    console.log('='.repeat(50));

    // Check CPU usage after changes
    console.log('\n💡 Tip: Run "docker stats shinobi --no-stream" to check CPU usage');

  } catch (error) {
    console.error('❌ Error fixing snapshots:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the script
fixCameraSnapshots();
