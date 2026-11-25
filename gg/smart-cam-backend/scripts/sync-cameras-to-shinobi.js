/**
 * Sync all cameras from database to Shinobi
 * Run this script to add cameras from your local DB to Shinobi VMS
 */

const { User, Camera } = require('../src/models');
const shinobiService = require('../src/services/shinobi.service');
const logger = require('../src/config/logger');

async function syncCamerasToShinobi() {
  try {
    console.log('🔄 Starting camera sync to Shinobi...\n');

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

      for (const camera of cameras) {
        try {
          console.log(`   → Syncing: ${camera.name} (${camera.monitorId})`);

          const cameraConfig = {
            name: camera.name,
            type: camera.type || 'h264',
            protocol: 'rtsp',
            host: camera.host,
            port: camera.port,
            path: camera.path || '/',
            username: '', // Add if needed
            password: '', // Add if needed
            width: camera.width || 1920,
            height: camera.height || 1080,
            fps: camera.fps || 30
          };

          await shinobiService.addCamera(
            user.apiKey,
            user.groupKey,
            camera.monitorId,
            cameraConfig
          );

          // Update status to online
          await camera.update({ status: 'online' });

          console.log(`     ✅ Success!\n`);
          successCount++;
        } catch (error) {
          console.error(`     ❌ Failed: ${error.message}\n`);
          failCount++;
        }
      }

      console.log(`\n📊 Results for ${user.email}:`);
      console.log(`   ✅ Success: ${successCount}`);
      console.log(`   ❌ Failed: ${failCount}\n`);
      console.log('─'.repeat(60) + '\n');
    }

    console.log('🎉 Sync complete!\n');
    console.log('💡 Next steps:');
    console.log('   1. Login to Shinobi: http://localhost:8443/super');
    console.log('   2. Check that cameras appear');
    console.log('   3. Set each camera mode to "Watch" (start)');
    console.log('   4. Verify RTSP connections are working\n');

  } catch (error) {
    console.error('❌ Sync failed:', error);
    logger.error('Camera sync error', { error: error.message, stack: error.stack });
  } finally {
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  syncCamerasToShinobi();
}

module.exports = syncCamerasToShinobi;
