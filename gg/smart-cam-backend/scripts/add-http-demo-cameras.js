/**
 * Add working HTTP demo cameras for immediate dashboard testing
 * These use direct HTTP streams that work without RTSP
 */

const { User, Camera } = require('../src/models');
const crypto = require('crypto');

async function addHttpDemoCameras() {
  try {
    console.log('🎥 Adding HTTP demo cameras (these will work immediately)...\n');

    const user = await User.findOne({
      where: {
        groupKey: { [require('sequelize').Op.ne]: null }
      }
    });

    if (!user) {
      console.log('❌ No user found\n');
      return;
    }

    console.log(`✅ Using user: ${user.email}\n`);

    const demoCameras = [
      {
        name: 'Demo - Times Square Live',
        mid: crypto.randomBytes(12).toString('hex'),
        type: 'mjpeg',
        host: 'webcam.lu',
        port: 80,
        path: '/mjpg/video.mjpg?resolution=high',
      },
      {
        name: 'Demo - City Camera',
        mid: crypto.randomBytes(12).toString('hex'),
        type: 'mjpeg',
        host: '195.196.36.242',
        port: 80,
        path: '/mjpg/video.mjpg',
      }
    ];

    for (const cam of demoCameras) {
      try {
        console.log(`📹 Adding: ${cam.name}`);

        // Add to database
        await Camera.create({
          userId: user.id,
          monitorId: cam.mid,
          name: cam.name,
          type: cam.type,
          host: cam.host,
          port: cam.port,
          path: cam.path,
          width: 640,
          height: 480,
          fps: 15,
          status: 'online'
        });

        console.log(`   ✅ Added successfully\n`);

      } catch (error) {
        console.error(`   ❌ Failed: ${error.message}\n`);
      }
    }

    console.log('🎉 Demo cameras added!\n');
    console.log('📱 To view:');
    console.log('   1. Refresh: http://localhost:5173/live');
    console.log('   2. Select a Demo camera');
    console.log('   3. Click MJPEG button');
    console.log('   4. You should see live video!\n');
    console.log('💡 These are public webcams for demo purposes');
    console.log('   Once these work, we can fix your NVR cameras\n');

  } catch (error) {
    console.error('❌ Failed:', error.message);
  } finally {
    process.exit(0);
  }
}

if (require.main === module) {
  addHttpDemoCameras();
}

module.exports = addHttpDemoCameras;
