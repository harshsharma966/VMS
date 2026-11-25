/**
 * Test Configuration Fix - Sync a few cameras and verify they stream
 */

require('dotenv').config();
const { Camera, User } = require('../src/models');
const shinobiService = require('../src/services/shinobi.service');

async function main() {
  console.log('🧪 Testing Configuration Fix...\n');

  try {
    // Get one user
    const user = await User.findOne({
      where: { groupKey: '6b17427adfc70df0b5415ffd73a1e243' }
    });

    if (!user) {
      console.error('❌ Test user not found');
      process.exit(1);
    }

    console.log(`✅ Testing with user: ${user.email}`);
    console.log(`   Group Key: ${user.groupKey}\n`);

    // Get first 3 cameras from database
    const cameras = await Camera.findAll({
      where: { userId: user.id },
      limit: 3
    });

    console.log(`📹 Found ${cameras.length} test camera(s)\n`);

    for (const camera of cameras) {
      console.log(`→ Testing: ${camera.name} (${camera.monitorId})`);
      console.log(`   Host: ${camera.host}`);
      console.log(`   Username: ${camera.username}`);
      console.log(`   Password: ${camera.password ? '***' : '(none)'}`);
      console.log(`   Port: ${camera.port}`);

      try {
        const cameraConfig = {
          username: camera.username,
          password: camera.password,
          host: camera.host,
          port: camera.port,
          path: camera.path,
          protocol: camera.protocol,
          name: camera.name,
          type: camera.type,
          width: camera.width,
          height: camera.height,
          fps: camera.fps
        };

        // Build Shinobi config
        const config = shinobiService._buildShinobiConfig(
          camera.monitorId,
          user.groupKey,
          cameraConfig
        );

        console.log(`   Generated host field: "${config.host}"`);
        console.log(`   Generated port field: "${config.port}"`);

        // Check if host field contains credentials
        if (config.host.includes('@')) {
          console.log(`   ⚠️  WARNING: Host field contains @ symbol!`);
        } else {
          console.log(`   ✅ Host field looks correct (no @ symbol)`);
        }

        // Sync to Shinobi (note: addCamera takes 4 params: apiKey, groupKey, monitorId, cameraConfig)
        console.log(`   🔄 Syncing to Shinobi...`);
        await shinobiService.addCamera(user.apiKey, user.groupKey, camera.monitorId, cameraConfig);
        console.log(`   ✅ Synced successfully\n`);

      } catch (error) {
        console.error(`   ❌ Failed:`, error.message, '\n');
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Waiting 10 seconds for streams to initialize...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await new Promise(resolve => setTimeout(resolve, 10000));

    // Check FFmpeg processes
    const { exec } = require('child_process');
    exec('docker exec shinobi ps aux | grep ffmpeg | grep -v defunct | grep -v grep | wc -l', (error, stdout) => {
      if (!error) {
        const count = parseInt(stdout.trim());
        console.log(`📹 Active FFmpeg processes: ${count}`);
        if (count > 0) {
          console.log('✅ VIDEO STREAMING IS WORKING! 🎉\n');
        } else {
          console.log('⚠️  No FFmpeg processes found\n');
        }
      }
      process.exit(0);
    });

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);
