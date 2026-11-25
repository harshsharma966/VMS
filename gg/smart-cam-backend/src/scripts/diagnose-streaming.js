#!/usr/bin/env node
/**
 * Streaming Diagnostics - Check why HLS streams are failing
 */

const axios = require('axios');
const config = require('../config/env');

const SHINOBI_URL = config.shinobi.url;
const API_KEY = config.shinobi.apiKey;
const GROUP_KEY = '6b17427adfc70df0b5415ffd73a1e243'; // from error logs

async function diagnoseStreaming() {
  console.log('🔍 Streaming Diagnostics\n');
  console.log('━'.repeat(60));

  try {
    // 1. Get all monitors
    console.log('\n1️⃣ Fetching monitors...');
    const monitorsUrl = `${SHINOBI_URL}/${API_KEY}/monitor/${GROUP_KEY}`;
    const { data: monitors } = await axios.get(monitorsUrl);

    console.log(`   Found ${monitors.length} cameras\n`);

    // 2. Check streaming status for each
    const streamingIssues = [];

    for (const monitor of monitors.slice(0, 5)) { // Check first 5
      const mid = monitor.mid;
      const name = monitor.name;
      const mode = monitor.mode;

      console.log(`📹 ${name} (${mid})`);
      console.log(`   Mode: ${mode}`);

      // Check if HLS stream exists
      const hlsUrl = `${SHINOBI_URL}/${API_KEY}/hls/${GROUP_KEY}/${mid}/s.m3u8`;

      try {
        const hlsResponse = await axios.get(hlsUrl, {
          timeout: 3000,
          validateStatus: () => true // Don't throw on 404
        });

        if (hlsResponse.status === 200 && hlsResponse.data) {
          console.log(`   ✅ HLS stream active (${hlsResponse.data.length} bytes)`);
        } else {
          console.log(`   ❌ HLS stream not available (status: ${hlsResponse.status})`);
          streamingIssues.push({ name, mid, mode, reason: 'No HLS stream' });
        }
      } catch (err) {
        console.log(`   ❌ HLS stream error: ${err.message}`);
        streamingIssues.push({ name, mid, mode, reason: err.message });
      }

      console.log('');
    }

    // 3. Analysis
    console.log('\n' + '━'.repeat(60));
    console.log('📊 Analysis:\n');

    const recordModeCount = monitors.filter(m => m.mode === 'record').length;
    const startModeCount = monitors.filter(m => m.mode === 'start').length;
    const idleModeCount = monitors.filter(m => m.mode === 'idle').length;

    console.log(`Camera Modes:`);
    console.log(`  - "record" (motion-based): ${recordModeCount}`);
    console.log(`  - "start" (continuous): ${startModeCount}`);
    console.log(`  - "idle" (disabled): ${idleModeCount}\n`);

    if (recordModeCount > 0 && streamingIssues.length > 0) {
      console.log('⚠️  ISSUE IDENTIFIED:');
      console.log('   Cameras are in "record" mode (motion-based recording).');
      console.log('   HLS streams are only available when motion is detected.\n');
      console.log('💡 Solutions:\n');
      console.log('   Option 1: Change cameras to "start" mode for continuous streaming');
      console.log('   Option 2: Use MJPEG instead of HLS (works without active recording)');
      console.log('   Option 3: Use Shinobi embed player (triggers stream on demand)');
      console.log('   Option 4: Trigger recording before requesting HLS stream\n');
    }

    if (streamingIssues.length > 0) {
      console.log(`\n${streamingIssues.length} cameras with streaming issues:`);
      streamingIssues.forEach(issue => {
        console.log(`  - ${issue.name}: ${issue.reason}`);
      });
    }

  } catch (err) {
    console.error('❌ Diagnostic failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

diagnoseStreaming();
