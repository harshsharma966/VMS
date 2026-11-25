/**
 * Add a working test camera with a public RTSP stream
 */

const { User, Camera } = require('../src/models');
const shinobiService = require('../src/services/shinobi.service');
const crypto = require('crypto');

async function addTestCamera() {
  try {
    console.log('🎥 Adding test camera with working RTSP stream...\n');

    // Get the first user with Shinobi credentials
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

    // Generate unique monitor ID
    const monitorId = crypto.randomBytes(12).toString('hex');

    // Public test RTSP stream (this works!)
    const testCameraConfig = {
      name: 'TEST - Big Buck Bunny',
      type: 'h264',
      protocol: 'rtsp',
      host: 'wowzaec2demo.streamlock.net',
      port: 554,
      path: '/vod/mp4:BigBuckBunny_115k.mp4',
      username: '',
      password: '',
      width: 240,
      height: 160,
      fps: 24
    };

    console.log('📹 Camera details:');
    console.log(`   Name: ${testCameraConfig.name}`);
    console.log(`   RTSP: rtsp://${testCameraConfig.host}:${testCameraConfig.port}${testCameraConfig.path}`);
    console.log(`   Resolution: ${testCameraConfig.width}x${testCameraConfig.height}\n`);

    // Add to database
    console.log('💾 Adding to database...');
    const camera = await Camera.create({
      userId: user.id,
      monitorId: monitorId,
      name: testCameraConfig.name,
      type: testCameraConfig.type,
      host: testCameraConfig.host,
      port: testCameraConfig.port,
      path: testCameraConfig.path,
      width: testCameraConfig.width,
      height: testCameraConfig.height,
      fps: testCameraConfig.fps,
      status: 'offline'
    });
    console.log('   ✅ Saved to database\n');

    // Add to Shinobi
    console.log('📡 Adding to Shinobi...');
    await shinobiService.addCamera(
      user.apiKey,
      user.groupKey,
      monitorId,
      testCameraConfig
    );
    console.log('   ✅ Added to Shinobi\n');

    // Update status
    await camera.update({ status: 'online' });

    console.log('🎉 Test camera added successfully!\n');
    console.log('📱 Next steps:');
    console.log('   1. Refresh your app: http://localhost:5173/live');
    console.log('   2. Select "TEST - Big Buck Bunny" camera');
    console.log('   3. Click "HLS" or "MJPEG" to watch the stream');
    console.log('   4. Wait 10-15 seconds for Shinobi to start streaming\n');
    console.log(`💡 Monitor ID: ${monitorId}\n`);

  } catch (error) {
    console.error('❌ Failed:', error.message);
  } finally {
    process.exit(0);
  }
}

if (require.main === module) {
  addTestCamera();
}

module.exports = addTestCamera;
