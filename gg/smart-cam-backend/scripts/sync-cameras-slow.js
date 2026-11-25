/**
 * Sync cameras to Shinobi - SLOW MODE
 * Adds cameras one at a time with 10-second delays to avoid overwhelming Shinobi
 */

const { User, Camera } = require('../src/models');
const shinobiService = require('../src/services/shinobi.service');
const logger = require('../src/config/logger');

// Helper to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function syncCamerasToShinobiSlow() {
  try {
    console.log('🔄 Starting SLOW camera sync to Shinobi...');
    console.log('⏱️  Using 10-second delays between cameras to prevent overload\n');

    // Get all users with Shinobi credentials
    const users = await User.findAll({
      where: {
        groupKey: { [require('sequelize').Op.ne]: null },
        apiKey: { [require('sequelize').Op.ne]: null }
      }
    });

    if (users.length === 0) {
      console.log('⚠️  No users with Shinobi credentials found.');
      console.log('💡 Users need to have an active subscription first.\n');
      return;
    }

    console.log(`✅ Found ${users.length} user(s) with Shinobi access\n`);

    for (const user of users) {
      console.log(`📧 Processing user: ${user.email}`);
      console.log(`   Group Key: ${user.groupKey}`);
      console.log(`   API Key: ${user.apiKey.substring(0, 10)}...\n`);

      // Get all cameras for this user
      const cameras = await Camera.findAll({
        where: { userId: user.id }
      });

      if (cameras.length === 0) {
        console.log(`   ⚠️  No cameras found for ${user.email}\n`);
        continue;
      }

      console.log(`   📹 Found ${cameras.length} camera(s) to sync:\n`);

      let successCount = 0;
      let failCount = 0;
      let skipCount = 0;

      for (let i = 0; i < cameras.length; i++) {
        const camera = cameras[i];

        console.log(`   [${i + 1}/${cameras.length}] Syncing: ${camera.name} (${camera.monitorId})`);

        try {
          const cameraConfig = {
            name: camera.name,
            type: camera.type || 'h264',
            protocol: 'rtsp',
            host: camera.host,
            port: camera.port,
            path: camera.path || '/',
            username: camera.username || '',
            password: camera.password || '',
            width: camera.width || 1920,
            height: camera.height || 1080,
            fps: camera.fps || 25
          };

          // Attempt to add camera with 90-second timeout
          console.log('      ⏳ Adding to Shinobi (may take up to 90 seconds)...');

          await shinobiService.addCamera(
            user.apiKey,
            user.groupKey,
            camera.monitorId,
            cameraConfig
          );

          // Update status to online
          await camera.update({ status: 'online' });

          console.log(`      ✅ Success!\n`);
          successCount++;

        } catch (error) {
          if (error.message.includes('timeout')) {
            console.error(`      ⏰ TIMEOUT after 90s - Shinobi is overloaded`);
            console.error(`      💡 Skipping remaining cameras for this user\n`);
            skipCount = cameras.length - i - 1;
            failCount++;
            break; // Stop trying if Shinobi is timing out
          } else {
            console.error(`      ❌ Failed: ${error.message}\n`);
            failCount++;
          }
        }

        // Wait 10 seconds before next camera (give Shinobi time to process)
        if (i < cameras.length - 1) {
          console.log(`      ⏸️  Waiting 10 seconds before next camera...\n`);
          await wait(10000);
        }
      }

      console.log(`\n📊 Results for ${user.email}:`);
      console.log(`   ✅ Success: ${successCount}`);
      console.log(`   ❌ Failed: ${failCount}`);
      if (skipCount > 0) {
        console.log(`   ⏭️  Skipped: ${skipCount} (due to timeouts)`);
      }
      console.log('─'.repeat(60) + '\n');
    }

    console.log('🎉 Sync complete!\n');
    console.log('💡 Recommendations:');
    console.log('   1. If many cameras failed, Shinobi is critically overloaded');
    console.log('   2. Consider reducing camera count or upgrading hardware');
    console.log('   3. Check Shinobi UI: http://localhost:8443/super');
    console.log('   4. Monitor CPU: watch -n 1 "ps aux | grep shinobi"\n');

  } catch (error) {
    console.error('❌ Sync failed:', error);
    logger.error('Camera sync error', { error: error.message, stack: error.stack });
  } finally {
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  syncCamerasToShinobiSlow();
}

module.exports = syncCamerasToShinobiSlow;
