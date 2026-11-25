/**
 * Add cameras from Hikvision/compatible NVR to Shinobi
 * Edit the configuration below with your NVR details
 */

const { User, Camera } = require('../src/models');
const shinobiService = require('../src/services/shinobi.service');
const crypto = require('crypto');

// ========================================
// CONFIGURATION - EDIT THIS SECTION
// ========================================
const NVR_CONFIG = {
  ip: '103.61.254.67',
  port: 554,
  username: 'admin',          // ← PUT YOUR NVR PASSWORD BELOW
  password: 'Synoweb@abc123cd',

  // Define your cameras (from the screenshot: Camera 01-08)
  cameras: [
    { channel: 1, name: 'Camera 01', resolution: { width: 1920, height: 1080 } },
    { channel: 2, name: 'Camera 02', resolution: { width: 1920, height: 1080 } },
    { channel: 3, name: 'Camera 03', resolution: { width: 1920, height: 1080 } },
    { channel: 4, name: 'Camera 04', resolution: { width: 1920, height: 1080 } },
    { channel: 5, name: 'Camera 05', resolution: { width: 1920, height: 1080 } },
    { channel: 6, name: 'Camera 06', resolution: { width: 1920, height: 1080 } },
    { channel: 7, name: 'Camera 07', resolution: { width: 1920, height: 1080 } },
    { channel: 8, name: 'Camera 08', resolution: { width: 1920, height: 1080 } },
  ],

  useSubStream: false  // Set to true for lower quality/bandwidth
};
// ========================================

async function addNVRCameras() {
  try {
    console.log('🎥 Adding cameras from NVR...\n');
    console.log(`📡 NVR: ${NVR_CONFIG.ip}:${NVR_CONFIG.port}`);
    console.log(`📹 Cameras to add: ${NVR_CONFIG.cameras.length}\n`);

    // Get user with Shinobi credentials
    const user = await User.findOne({
      where: {
        groupKey: { [require('sequelize').Op.ne]: null },
        apiKey: { [require('sequelize').Op.ne]: null }
      }
    });

    if (!user) {
      console.log('❌ No user with Shinobi credentials found.');
      console.log('💡 Create a subscription first.\n');
      return;
    }

    console.log(`✅ Using user: ${user.email}\n`);
    console.log('─'.repeat(60) + '\n');

    let successCount = 0;
    let failCount = 0;

    for (const cam of NVR_CONFIG.cameras) {
      try {
        // Generate unique monitor ID
        const monitorId = crypto.randomBytes(12).toString('hex');

        // Calculate channel number for RTSP URL
        const streamType = NVR_CONFIG.useSubStream ? '02' : '01';
        const channelNumber = `${cam.channel}${streamType}`;

        // Build RTSP URL
        const rtspPath = `/Streaming/Channels/${channelNumber}`;
        const fullRtspUrl = `rtsp://${NVR_CONFIG.username}:${NVR_CONFIG.password}@${NVR_CONFIG.ip}:${NVR_CONFIG.port}${rtspPath}`;

        console.log(`📹 Adding: ${cam.name}`);
        console.log(`   Channel: ${cam.channel}`);
        console.log(`   RTSP: rtsp://${NVR_CONFIG.ip}${rtspPath}`);

        const cameraConfig = {
          name: cam.name,
          type: 'h264',
          protocol: 'rtsp',
          host: NVR_CONFIG.ip,
          port: NVR_CONFIG.port,
          path: rtspPath,
          username: NVR_CONFIG.username,
          password: NVR_CONFIG.password,
          width: cam.resolution.width,
          height: cam.resolution.height,
          fps: 25
        };

        // Add to database
        const camera = await Camera.create({
          userId: user.id,
          monitorId: monitorId,
          name: cam.name,
          type: 'h264',
          host: NVR_CONFIG.ip,
          port: NVR_CONFIG.port,
          path: rtspPath,
          width: cam.resolution.width,
          height: cam.resolution.height,
          fps: 25,
          status: 'offline'
        });

        // Add to Shinobi
        await shinobiService.addCamera(
          user.apiKey,
          user.groupKey,
          monitorId,
          cameraConfig
        );

        // Update status
        await camera.update({ status: 'online' });

        console.log(`   ✅ Added successfully\n`);
        successCount++;

      } catch (error) {
        console.error(`   ❌ Failed: ${error.message}\n`);
        failCount++;
      }
    }

    console.log('─'.repeat(60));
    console.log('\n📊 Summary:');
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}\n`);

    if (successCount > 0) {
      console.log('🎉 Cameras added!\n');
      console.log('📱 Next steps:');
      console.log('   1. Refresh your app: http://localhost:5173/live');
      console.log('   2. Wait 10-15 seconds for streams to start');
      console.log('   3. Select a camera and click HLS or MJPEG');
      console.log('   4. Check Shinobi for any connection errors\n');
    }

  } catch (error) {
    console.error('❌ Failed:', error.message);
  } finally {
    process.exit(0);
  }
}

if (require.main === module) {
  addNVRCameras();
}

module.exports = addNVRCameras;
