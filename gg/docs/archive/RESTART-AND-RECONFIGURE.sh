#!/bin/bash

# ============================================================================
# Restart Shinobi and Reconfigure All Cameras
# ============================================================================

set -e  # Exit on error

echo "🔄 Starting Shinobi restart and camera reconfiguration..."
echo ""

# ============================================================================
# Step 1: Restart Shinobi Service
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1: Restarting Shinobi VMS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if Shinobi is running in Docker
if docker ps | grep -q shinobi 2>/dev/null; then
    echo "📦 Shinobi running in Docker - restarting container..."
    docker restart shinobi
    echo "✅ Shinobi container restarted"
else
    # Check if Shinobi is running as systemd service
    if systemctl is-active --quiet shinobi 2>/dev/null; then
        echo "🔧 Shinobi running as systemd service - restarting..."
        sudo systemctl restart shinobi
        echo "✅ Shinobi service restarted"
    else
        # Check if Shinobi is running as PM2 process
        if pm2 list 2>/dev/null | grep -q shinobi; then
            echo "⚡ Shinobi running under PM2 - restarting..."
            pm2 restart shinobi
            echo "✅ Shinobi PM2 process restarted"
        else
            # Shinobi might be running directly
            echo "⚠️  Shinobi not found in Docker/systemd/PM2"
            echo "   Attempting to restart via process kill and restart..."

            # Kill existing Shinobi processes
            pkill -f "node.*Shinobi/camera.js" || true
            pkill -f "node.*Shinobi/cron.js" || true

            # Start Shinobi (assuming it's in /home/Shinobi)
            if [ -d "/home/Shinobi" ]; then
                echo "   Starting Shinobi from /home/Shinobi..."
                cd /home/Shinobi
                nohup node camera.js > /dev/null 2>&1 &
                nohup node cron.js > /dev/null 2>&1 &
                echo "✅ Shinobi processes started"
            else
                echo "❌ Could not find Shinobi installation directory"
                echo "   Please restart Shinobi manually"
                exit 1
            fi
        fi
    fi
fi

echo ""
echo "⏳ Waiting 10 seconds for Shinobi to initialize..."
sleep 10

# Verify Shinobi is accessible
if curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:8443 | grep -q "200"; then
    echo "✅ Shinobi is responding on port 8443"
else
    echo "❌ Shinobi is not responding - check manually"
    echo "   Try: curl http://localhost:8443"
    exit 1
fi

echo ""

# ============================================================================
# Step 2: Sync Cameras to Shinobi
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2: Syncing Cameras to Shinobi"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd /home/systools/Desktop/drisyam/smart-cam-backend

echo "📹 Running camera sync script..."
node scripts/sync-cameras-to-shinobi.js

echo ""
echo "⏳ Waiting 5 seconds for cameras to register..."
sleep 5

echo ""

# ============================================================================
# Step 3: Start All Cameras
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3: Starting All Cameras"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "🎬 Starting all cameras (switching from 'record' to 'start' mode)..."
node scripts/start-all-cameras.js

echo ""
echo "⏳ Waiting 15 seconds for streams to initialize..."
sleep 15

echo ""

# ============================================================================
# Step 4: Verify Cameras are Streaming
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 4: Verification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Count FFmpeg processes (should be 27 for 27 cameras)
FFMPEG_COUNT=$(ps aux | grep -c "ffmpeg.*shinobi" || true)
echo "📊 Active FFmpeg processes: $FFMPEG_COUNT"

# Check Shinobi CPU usage
CPU_USAGE=$(ps aux | grep "node.*Shinobi/camera.js" | grep -v grep | awk '{print $3}' || echo "N/A")
echo "💻 Shinobi CPU usage: ${CPU_USAGE}%"

echo ""

# ============================================================================
# Done!
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Restart and Reconfiguration Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Next Steps:"
echo ""
echo "   1. Refresh your browser: http://localhost:5173/live"
echo "      Press Ctrl+F5 for hard refresh"
echo ""
echo "   2. Cameras should now show HLS video streams"
echo "      (no more black screens)"
echo ""
echo "   3. If streams still don't work, check Shinobi UI:"
echo "      http://localhost:8443"
echo ""
echo "   4. Monitor Shinobi CPU usage:"
echo "      watch -n 1 'ps aux | grep shinobi | grep -v grep'"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
