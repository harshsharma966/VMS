# Drisyam VMS - Video Streaming Fix Summary

## Date: 2026-02-20

## Problems Fixed

### 1. **Password URL-Encoding Issue** ✅
- **Problem**: Passwords with special characters (like `@` in `Synoweb@abc123cd`) were breaking RTSP URLs
- **Fix**: [shinobi.service.js:197](smart-cam-backend/src/services/shinobi.service.js#L197)
  ```javascript
  const encodedPassword = password ? encodeURIComponent(password) : '';
  ```
- **Result**: RTSP URL now correctly formatted as `rtsp://admin:Synoweb%40abc123cd@host:554/path`

### 2. **Host Field Credentials** ✅
- **Problem**: Credentials were being included in the `host` field, causing double encoding
- **Fix**: [shinobi.service.js:212](smart-cam-backend/src/services/shinobi.service.js#L212)
  ```javascript
  host: host,  // Clean host without credentials
  ```
- **Result**: Host field contains only hostname/IP, credentials handled separately

### 3. **Audio Support** ✅ 🔊
- **Problem**: Original setup only supported MJPEG (no audio) or broken Shinobi HLS
- **Fix**: [stream.service.js:57-59](smart-cam-backend/src/services/stream.service.js#L57)
  ```javascript
  '-c:a', 'aac',     // AAC audio codec
  '-b:a', '128k',    // 128kbps audio bitrate
  ```
- **Result**: Backend now generates HLS streams with AAC audio

### 4. **Streaming Architecture** ✅
- **Problem**: Shinobi HLS not working reliably
- **Solution**: Bypassed Shinobi HLS, using backend FFmpeg service instead
- **Fix**: [HlsPlayer.jsx:28](smart-cam-app/src/components/HlsPlayer.jsx#L28)
  ```javascript
  const streamUrl = await shinobiService.getDirectStreamUrl(monitorId);
  ```

## How It Works Now

```
Camera RTSP → Backend FFmpeg → HLS (video + audio) → Browser
              (Port 5000)         /streams/{id}/stream.m3u8
```

### Stream Flow:
1. Frontend requests stream: `GET /api/stream/start/{monitorId}`
2. Backend starts FFmpeg process transcoding RTSP → HLS
3. HLS playlist available at: `http://localhost:5000/streams/{monitorId}/stream.m3u8`
4. Frontend plays HLS using HLS.js (with audio!)
5. Auto-cleanup: Stream stops after 5 minutes of inactivity

## Verification Steps

### 1. Check Backend is Running
```bash
curl http://localhost:5000/api/cameras
# Should return 200 OK
```

### 2. Test Stream Start
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/stream/start/{monitorId}
# Should return: {"ok": true, "streamUrl": "/streams/{id}/stream.m3u8"}
```

### 3. Verify HLS Playlist
```bash
curl http://localhost:5000/streams/{monitorId}/stream.m3u8
# Should return:
# #EXTM3U
# #EXT-X-VERSION:3
# ...
```

### 4. Check FFmpeg Process
```bash
ps aux | grep ffmpeg
# Should see FFmpeg transcoding processes with -c:a aac (audio enabled)
```

### 5. Frontend Test
1. Open browser: `http://localhost:5173`
2. Navigate to Live View
3. Open browser console (F12)
4. Look for: `🎬 Using backend HLS stream (with audio):`
5. Video should play WITH audio controls visible

## Files Modified

### Backend:
- `src/services/shinobi.service.js` - Password encoding + host field fix
- `src/services/stream.service.js` - Audio enabled in FFmpeg
- `scripts/test-config-fix.js` - Test script for verification

### Frontend:
- `src/components/HlsPlayer.jsx` - Switched to backend streaming

## Shinobi Configuration

Monitors are now set to `mode: "record"` to enable continuous recording to S3:
- Recordings: Saved to S3 as MP4 files (backend handles sync)
- Live streaming: Handled by backend FFmpeg (not Shinobi HLS)

## Troubleshooting

### No Audio?
- Check browser console: `navigator.mediaDevices.getSupportedConstraints()`
- Ensure `muted=false` prop on HlsPlayer component
- Verify FFmpeg command includes `-c:a aac` (not `-an`)

### Stream Not Starting?
- Check backend logs: `tail -f /path/to/backend/logs`
- Verify camera RTSP is reachable: `ffmpeg -i rtsp://... -frames:v 1 -f null -`
- Check stream directory: `ls -la smart-cam-backend/streams/{monitorId}/`

### HLS Playlist 404?
- Wait 3-5 seconds after starting stream (FFmpeg needs time to generate segments)
- Check if FFmpeg process is running: `ps aux | grep ffmpeg`
- Verify /streams directory is served: `app.use('/streams', express.static(...))`

## Performance Notes

- **Video codec**: `copy` (no transcoding, low CPU)
- **Audio codec**: `aac` at 128kbps (transcoded, minimal CPU)
- **HLS segments**: 2 seconds, last 3 kept in memory
- **Auto-cleanup**: 5 minutes of inactivity
- **Concurrent streams**: Limited by system resources (each camera = 1 FFmpeg process)

## Next Steps

1. ✅ Test with real cameras in browser
2. ⏳ Monitor backend logs for any errors
3. ⏳ Sync all cameras to Shinobi with fixed config: `npm run sync-cameras`
4. ⏳ Update memory.md if needed with new streaming architecture

## Support

If issues persist:
1. Check logs: Backend console + Browser DevTools
2. Verify RTSP connectivity: Direct ffmpeg test
3. Restart services: Backend + Shinobi docker container
