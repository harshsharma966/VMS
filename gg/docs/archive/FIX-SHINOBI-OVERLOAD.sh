#!/bin/bash

# ============================================================================
# Fix Shinobi Overload - Emergency Recovery
# ============================================================================

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚨 Shinobi Overload Recovery"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ============================================================================
# Step 1: Verify Services are Running
# ============================================================================
echo "Step 1: Checking Services..."
echo ""

check_service() {
    if systemctl is-active --quiet "$1" 2>/dev/null; then
        echo "  ✅ $1: Running"
        return 0
    else
        echo "  ❌ $1: Not running"
        return 1
    fi
}

check_service "docker"
check_service "redis-server" || check_service "redis"
check_service "mysql" || check_service "mariadb"

# Check Shinobi container
if docker ps | grep -q shinobi; then
    echo "  ✅ Shinobi container: Running"
else
    echo "  ❌ Shinobi container: Not running"
    echo ""
    echo "Starting Shinobi container..."
    docker start shinobi || {
        echo "Failed to start Shinobi container"
        exit 1
    }
fi

echo ""

# ============================================================================
# Step 2: Clear Shinobi State (Fresh Start)
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2: Restarting Shinobi (fresh state)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "🔄 Restarting Shinobi container..."
docker restart shinobi

echo "⏳ Waiting 15 seconds for Shinobi to initialize..."
sleep 15

# Verify Shinobi is responding
if curl -s -o /dev/null -w "%{http_code}" --max-time 10 http://localhost:8443 | grep -q "200"; then
    echo "✅ Shinobi is responding"
else
    echo "❌ Shinobi not responding - may need more time"
    echo "⏳ Waiting another 15 seconds..."
    sleep 15
fi

echo ""

# ============================================================================
# Step 3: Sync Cameras (SLOW MODE - 10s delays)
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3: Syncing Cameras (SLOW MODE)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd /home/systools/Desktop/drisyam/smart-cam-backend

echo "📹 Adding cameras one at a time with 10-second delays..."
echo "   (This prevents overwhelming Shinobi)"
echo ""

# Give user option to skip sync if they already have cameras
read -p "Do you want to sync cameras now? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    node scripts/sync-cameras-slow.js || {
        echo ""
        echo "⚠️  Camera sync encountered errors (this is expected if Shinobi is still overloaded)"
        echo "💡 You can manually add cameras via Shinobi UI: http://localhost:8443"
        echo ""
    }
else
    echo "⏭️  Skipping camera sync"
    echo "💡 You can run it manually later: node scripts/sync-cameras-slow.js"
fi

echo ""

# ============================================================================
# Step 4: Check Current Status
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 4: Current Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check Docker container stats
echo "📊 Shinobi Resource Usage:"
docker stats shinobi --no-stream --format "   CPU: {{.CPUPerc}}\t Memory: {{.MemUsage}}"

# Check FFmpeg processes
FFMPEG_COUNT=$(ps aux | grep -E "ffmpeg.*shinobi|shinobi.*ffmpeg" | grep -v grep | wc -l || echo "0")
echo "   FFmpeg processes: $FFMPEG_COUNT"

# Check if backend is running
if curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health | grep -q "200"; then
    echo "   Backend API: ✅ Running"
else
    echo "   Backend API: ❌ Not running"
    echo ""
    echo "⚠️  Starting backend..."
    cd /home/systools/Desktop/drisyam/smart-cam-backend
    npm start &
    sleep 3
fi

echo ""

# ============================================================================
# Recommendations
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Recovery Complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Next Steps:"
echo ""
echo "   1. Refresh browser: http://localhost:5173/live (Ctrl+F5)"
echo ""
echo "   2. If cameras still timeout, Shinobi cannot handle 27 cameras"
echo "      You have 3 options:"
echo ""
echo "      Option A: Add cameras MANUALLY via Shinobi UI (slower but works)"
echo "                http://localhost:8443/super"
echo ""
echo "      Option B: Reduce camera count (remove some cameras)"
echo ""
echo "      Option C: Upgrade server (more CPU/RAM)"
echo ""
echo "   3. Monitor Shinobi:"
echo "      docker logs -f shinobi"
echo ""
echo "   4. Check camera status:"
echo "      curl http://localhost:8443/{API_KEY}/monitor/{GROUP_KEY}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
