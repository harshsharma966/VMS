import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, PlayCircle } from 'lucide-react';
import { shinobiService } from '@/services/shinobi';
import { useCameras } from '@/hooks/useQueries';
import { format, subDays } from 'date-fns';

export default function Playback() {
  const { data: cameras = [] } = useCameras();
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [recordings, setRecordings] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd'),
  });

  useEffect(() => {
    if (cameras.length > 0 && !selectedCamera) setSelectedCamera(cameras[0]);
  }, [cameras]);

  const loadRecordings = async () => {
    if (!selectedCamera) return;
    setLoading(true);
    try {
      const data = await shinobiService.getRecordings(
        selectedCamera.mid,
        dateRange.start,
        dateRange.end
      );
      setRecordings(data.videos || []);
    } catch (error) {
      console.error('Failed to load recordings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCamera) loadRecordings();
  }, [selectedCamera]);

  useEffect(() => {
    if (selectedVideo && selectedCamera) {
      loadVideoUrl();
    }
  }, [selectedVideo, selectedCamera]);

  const loadVideoUrl = async () => {
    if (!selectedVideo || !selectedCamera) return;
    try {
      const url = await shinobiService.getRecordingUrl(
        selectedCamera.mid,
        selectedVideo.filename
      );
      setVideoUrl(url);
    } catch (error) {
      console.error('Failed to generate video URL:', error);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-foreground mb-6">
        Playback & Recordings
      </h1>

      <div className="grid grid-cols-12 gap-6">
        {/* Filters */}
        <div className="col-span-12 lg:col-span-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Camera Select */}
              <div>
                <label className="block text-sm font-medium mb-2">Camera</label>
                <select
                  value={selectedCamera?.mid || ''}
                  onChange={(e) => {
                    const camera = cameras.find((c) => c.mid === e.target.value);
                    setSelectedCamera(camera);
                  }}
                  className="w-full p-2 border border-input rounded-md bg-background text-sm"
                >
                  {cameras.map((camera) => (
                    <option key={camera.mid} value={camera.mid}>
                      {camera.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Start Date
                </label>
                <Input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) =>
                    setDateRange((prev) => ({ ...prev, start: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  End Date
                </label>
                <Input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) =>
                    setDateRange((prev) => ({ ...prev, end: e.target.value }))
                  }
                />
              </div>

              <Button onClick={loadRecordings} className="w-full">
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recordings List & Player */}
        <div className="col-span-12 lg:col-span-9 space-y-6">
          {/* Video Player */}
          {selectedVideo && (
            <Card>
              <CardContent className="p-4">
                <video
                  src={videoUrl}
                  controls
                  className="w-full aspect-video bg-black rounded-lg"
                />
                <div className="mt-4">
                  <h3 className="font-semibold">{selectedVideo.filename}</h3>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(selectedVideo.time), 'PPpp')}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recordings Grid */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Recordings ({recordings.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="aspect-video bg-muted rounded-lg animate-pulse"
                    />
                  ))}
                </div>
              ) : recordings.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recordings.map((video) => (
                    <div
                      key={video.filename}
                      onClick={() => setSelectedVideo(video)}
                      className={`cursor-pointer border rounded-lg p-3 transition-colors hover:border-primary ${
                        selectedVideo?.filename === video.filename
                          ? 'border-primary bg-primary/5'
                          : 'border-border'
                      }`}
                    >
                      <div className="aspect-video bg-muted rounded mb-2 flex items-center justify-center">
                        <PlayCircle className="w-10 h-10 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium truncate">
                        {format(new Date(video.time), 'PPp')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(video.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No recordings found for selected date range
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
