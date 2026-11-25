# Smart-Cam VMS - Complete Development Roadmap
**Tech Stack: React.js + Vite + JavaScript + Shinobi VMS**

---

## 🎯 Project Overview

### Two Separate Applications:
1. **Marketing Website** (`www.drishyamvms.com`) - Public facing
2. **VMS Application** (`app.drishyamvms.com`) - Authenticated users only

---

## 📋 Phase 1: Project Setup & Architecture (Week 1)

### 1.1 Initialize Projects

```bash
# Marketing Website
npm create vite@latest smart-cam-marketing -- --template react
cd smart-cam-marketing
npm install

# VMS Application
npm create vite@latest smart-cam-app -- --template react
cd smart-cam-app
npm install
```

### 1.2 Essential Dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "axios": "^1.6.2",
    "zustand": "^4.4.7",
    "react-query": "^3.39.3",
    "date-fns": "^2.30.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.8",
    "tailwindcss": "^3.3.6",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32"
  }
}
```

### 1.3 Project Structure

```
smart-cam-marketing/
├── public/
│   └── assets/
│       └── images/ (38 images from Figma)
├── src/
│   ├── components/
│   │   ├── Header.jsx
│   │   ├── Hero.jsx
│   │   ├── Features.jsx
│   │   ├── UpgradeSection.jsx
│   │   ├── FAQ.jsx
│   │   ├── ContactForm.jsx
│   │   └── Footer.jsx
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── Pricing.jsx
│   │   ├── Login.jsx
│   │   └── Register.jsx
│   ├── utils/
│   │   └── api.js
│   ├── App.jsx
│   └── main.jsx
└── package.json

smart-cam-app/
├── public/
├── src/
│   ├── components/
│   │   ├── Sidebar.jsx
│   │   ├── Topbar.jsx
│   │   ├── VideoPlayer.jsx
│   │   └── CameraCard.jsx
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── LiveView.jsx
│   │   ├── Playback.jsx
│   │   └── Cameras.jsx
│   ├── services/
│   │   ├── auth.js
│   │   ├── shinobi.js
│   │   └── api.js
│   ├── store/
│   │   └── authStore.js
│   ├── App.jsx
│   └── main.jsx
└── package.json
```

---

## 📋 Phase 2: Marketing Website (Week 2-3)

### 2.1 Download & Organize Figma Assets

**All 38 Images from Your Figma:**
```javascript
// src/assets/images.js
export const images = {
  // Hero & Features
  stateIdle: 'https://www.figma.com/api/mcp/asset/551d8b99-6c7a-460b-8442-800827122737',
  featureCard: 'https://www.figma.com/api/mcp/asset/af30de4b-1c25-4681-90ed-42606e6642ce',
  
  // Icons
  skipForward: 'https://www.figma.com/api/mcp/asset/5df1a555-ea06-4fb3-880a-f3ecab23cbba',
  images: 'https://www.figma.com/api/mcp/asset/093e3055-8e5a-44c0-9427-6cb9a7bc7394',
  videoCamera: 'https://www.figma.com/api/mcp/asset/5ddd3ea7-6f4d-4a31-999a-fb65275ad62d',
  
  // Flags
  ukFlag: 'https://www.figma.com/api/mcp/asset/12c33a3a-b255-4b5c-91a4-de5a608d0ec5',
  germanyFlag: 'https://www.figma.com/api/mcp/asset/bfb09416-6629-4aeb-bdbb-4fa382a7aa13',
  
  // Logo
  logo: 'https://www.figma.com/api/mcp/asset/cbf3ebbb-cabc-4496-a941-9633e8b719e9',
  
  // Contact Section
  contactImage: 'https://www.figma.com/api/mcp/asset/75bde2e5-76a7-4c1f-bb0b-11bb541e2ab8',
  
  // Social Icons
  facebook: 'https://www.figma.com/api/mcp/asset/3ab8856c-2324-4e60-af17-6e4fbdfce73b',
  twitter: 'https://www.figma.com/api/mcp/asset/0dbfc536-30d1-4539-824b-1c8f7638e033',
  linkedin: 'https://www.figma.com/api/mcp/asset/fbb74f57-a020-4696-883f-4b449b958d40'
  // ... all 38 images
};
```

### 2.2 Homepage Sections (Exact from Figma)

```jsx
// src/pages/Home.jsx
import Header from '../components/Header';
import Hero from '../components/Hero';
import Features from '../components/Features';
import Upgrade from '../components/Upgrade';
import FAQ from '../components/FAQ';
import Contact from '../components/Contact';
import Footer from '../components/Footer';

export default function Home() {
  return (
    <div className="bg-white">
      <Header />
      <Hero />
      <Features />
      <Upgrade />
      <FAQ />
      <Contact />
      <Footer />
    </div>
  );
}
```

### 2.3 Tailwind Configuration (From Figma Design Tokens)

```javascript
// tailwind.config.js
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#F7983A',
        neutral: {
          0: '#FFFFFF',
          100: '#F1F2F6',
          200: '#E5E7EB',
          500: '#6B7280',
          700: '#374151',
          900: '#111827',
        }
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
      },
      fontSize: {
        'h1': ['48px', { lineHeight: '1.3', fontWeight: '700' }],
        'h2': ['40px', { lineHeight: '1.3', fontWeight: '700' }],
        'h5': ['24px', { lineHeight: '1.4', fontWeight: '600' }],
        'h6': ['20px', { lineHeight: '1.5', fontWeight: '600' }],
        'body1': ['16px', { lineHeight: '1.5', fontWeight: '400' }],
        'body2': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
      }
    },
  },
  plugins: [],
}
```

---

## 📋 Phase 3: Authentication System (Week 3-4)

### 3.1 Auth Flow Architecture

```
User Journey:
www.drishyamvms.com/pricing 
  → Register 
  → Choose Plan 
  → Payment Gateway
  → JWT Token Generated
  → Redirect to app.drishyamvms.com/dashboard
```

### 3.2 Auth Service

```javascript
// src/services/auth.js
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export const authService = {
  // Register new user
  register: async (userData) => {
    const response = await axios.post(`${API_BASE}/auth/register`, userData);
    return response.data;
  },

  // Login
  login: async (email, password) => {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email,
      password
    });
    
    if (response.data.token) {
      localStorage.setItem('auth_token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    
    return response.data;
  },

  // Logout
  logout: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },

  // Get current user
  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  // Check if authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('auth_token');
  },

  // Get token
  getToken: () => {
    return localStorage.getItem('auth_token');
  }
};
```

### 3.3 Auth Store (Zustand)

```javascript
// src/store/authStore.js
import { create } from 'zustand';
import { authService } from '../services/auth';

export const useAuthStore = create((set) => ({
  user: authService.getCurrentUser(),
  token: authService.getToken(),
  isAuthenticated: authService.isAuthenticated(),

  login: async (email, password) => {
    const data = await authService.login(email, password);
    set({
      user: data.user,
      token: data.token,
      isAuthenticated: true
    });
    return data;
  },

  logout: () => {
    authService.logout();
    set({
      user: null,
      token: null,
      isAuthenticated: false
    });
  },

  register: async (userData) => {
    return await authService.register(userData);
  }
}));
```

### 3.4 Protected Route Component

```javascript
// src/components/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
```

---

## 📋 Phase 4: Shinobi VMS Integration (Week 5-6)

### 4.1 Understanding Shinobi API

**Key Shinobi Endpoints:**
```javascript
// Shinobi API Structure
const SHINOBI_BASE = 'http://your-shinobi-server:8080';

// Authentication
POST /api/:api_key/user/login

// Monitors (Cameras)
GET  /api/:api_key/:group_key/monitor/:monitor_id
POST /api/:api_key/:group_key/monitor/:monitor_id

// Videos
GET  /api/:api_key/:group_key/videos/:monitor_id
GET  /api/:api_key/:group_key/videos/:monitor_id/:filename

// Live Streaming
WS   /socket.io (WebSocket for live feeds)
HLS  /:api_key/hls/:group_key/:monitor_id/s.m3u8
```

### 4.2 Shinobi Service

```javascript
// src/services/shinobi.js
import axios from 'axios';
import { authService } from './auth';

const SHINOBI_BASE = import.meta.env.VITE_SHINOBI_URL;
const API_KEY = import.meta.env.VITE_SHINOBI_API_KEY;

class ShinobiService {
  constructor() {
    this.axios = axios.create({
      baseURL: SHINOBI_BASE,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Add auth token to requests
    this.axios.interceptors.request.use((config) => {
      const token = authService.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  // Get user's group key (from your backend after payment)
  async getUserGroupKey() {
    const response = await this.axios.get('/api/user/group-key');
    return response.data.groupKey;
  }

  // Get all cameras for user
  async getCameras() {
    const groupKey = await this.getUserGroupKey();
    const response = await this.axios.get(
      `/api/${API_KEY}/${groupKey}/monitor`
    );
    return response.data;
  }

  // Get single camera
  async getCamera(monitorId) {
    const groupKey = await this.getUserGroupKey();
    const response = await this.axios.get(
      `/api/${API_KEY}/${groupKey}/monitor/${monitorId}`
    );
    return response.data;
  }

  // Add new camera
  async addCamera(cameraData) {
    const groupKey = await this.getUserGroupKey();
    const response = await this.axios.post(
      `/api/${API_KEY}/${groupKey}/monitor/${cameraData.mid}`,
      cameraData
    );
    return response.data;
  }

  // Update camera
  async updateCamera(monitorId, cameraData) {
    const groupKey = await this.getUserGroupKey();
    const response = await this.axios.post(
      `/api/${API_KEY}/${groupKey}/configureMonitor/${monitorId}`,
      cameraData
    );
    return response.data;
  }

  // Delete camera
  async deleteCamera(monitorId) {
    const groupKey = await this.getUserGroupKey();
    const response = await this.axios.get(
      `/api/${API_KEY}/${groupKey}/monitor/${monitorId}/delete`
    );
    return response.data;
  }

  // Get recordings
  async getRecordings(monitorId, startDate, endDate) {
    const groupKey = await this.getUserGroupKey();
    const response = await this.axios.get(
      `/api/${API_KEY}/${groupKey}/videos/${monitorId}`,
      {
        params: {
          start: startDate,
          end: endDate
        }
      }
    );
    return response.data;
  }

  // Get live stream URL
  getLiveStreamUrl(monitorId) {
    const groupKey = localStorage.getItem('group_key');
    return `${SHINOBI_BASE}/${API_KEY}/hls/${groupKey}/${monitorId}/s.m3u8`;
  }

  // Get recording URL
  getRecordingUrl(monitorId, filename) {
    const groupKey = localStorage.getItem('group_key');
    return `${SHINOBI_BASE}/${API_KEY}/videos/${groupKey}/${monitorId}/${filename}`;
  }
}

export const shinobiService = new ShinobiService();
```

---

## 📋 Phase 5: VMS Application Pages (Week 7-8)

### 5.1 Dashboard Page

```jsx
// src/pages/Dashboard.jsx
import { useEffect, useState } from 'react';
import { shinobiService } from '../services/shinobi';
import CameraCard from '../components/CameraCard';

export default function Dashboard() {
  const [cameras, setCameras] = useState([]);
  const [stats, setStats] = useState({
    totalCameras: 0,
    onlineCameras: 0,
    recordings: 0,
    storageUsed: '0 GB'
  });

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const camerasData = await shinobiService.getCameras();
      setCameras(camerasData);
      
      // Calculate stats
      setStats({
        totalCameras: camerasData.length,
        onlineCameras: camerasData.filter(c => c.mode === 'start').length,
        recordings: camerasData.reduce((sum, c) => sum + (c.videos || 0), 0),
        storageUsed: calculateStorage(camerasData)
      });
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-neutral-900 mb-6">
        Dashboard
      </h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="Total Cameras" 
          value={stats.totalCameras}
          icon="📹"
        />
        <StatCard 
          title="Online" 
          value={stats.onlineCameras}
          icon="🟢"
        />
        <StatCard 
          title="Recordings" 
          value={stats.recordings}
          icon="🎬"
        />
        <StatCard 
          title="Storage Used" 
          value={stats.storageUsed}
          icon="💾"
        />
      </div>

      {/* Camera Grid */}
      <div className="grid grid-cols-3 gap-6">
        {cameras.map(camera => (
          <CameraCard key={camera.mid} camera={camera} />
        ))}
      </div>
    </div>
  );
}
```

### 5.2 Live View Page

```jsx
// src/pages/LiveView.jsx
import { useEffect, useState } from 'react';
import { shinobiService } from '../services/shinobi';
import HLSPlayer from '../components/HLSPlayer';

export default function LiveView() {
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);

  useEffect(() => {
    loadCameras();
  }, []);

  const loadCameras = async () => {
    const data = await shinobiService.getCameras();
    setCameras(data.filter(c => c.mode === 'start')); // Only online cameras
    if (data.length > 0) setSelectedCamera(data[0]);
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-neutral-900 mb-6">
        Live View
      </h1>

      <div className="grid grid-cols-12 gap-6">
        {/* Camera List */}
        <div className="col-span-3 bg-white rounded-lg p-4">
          <h2 className="font-semibold mb-4">Active Cameras</h2>
          {cameras.map(camera => (
            <div
              key={camera.mid}
              onClick={() => setSelectedCamera(camera)}
              className={`p-3 mb-2 rounded cursor-pointer ${
                selectedCamera?.mid === camera.mid
                  ? 'bg-primary text-white'
                  : 'bg-neutral-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span className="font-medium">{camera.name}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Live Stream */}
        <div className="col-span-9 bg-white rounded-lg p-4">
          {selectedCamera ? (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">
                  {selectedCamera.name}
                </h2>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                  ● LIVE
                </span>
              </div>
              
              <HLSPlayer 
                src={shinobiService.getLiveStreamUrl(selectedCamera.mid)}
                poster={selectedCamera.snapshot}
              />

              <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-neutral-500">Resolution:</span>
                  <span className="ml-2 font-medium">
                    {selectedCamera.width}x{selectedCamera.height}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500">FPS:</span>
                  <span className="ml-2 font-medium">
                    {selectedCamera.fps || 30}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500">Status:</span>
                  <span className="ml-2 font-medium text-green-600">
                    Online
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-96 text-neutral-500">
              Select a camera to view live stream
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

### 5.3 HLS Video Player Component

```jsx
// src/components/HLSPlayer.jsx
import { useEffect, useRef } from 'react';
import Hls from 'hls.js';

export default function HLSPlayer({ src, poster }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  useEffect(() => {
    if (!src || !videoRef.current) return;

    const video = videoRef.current;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90
      });

      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play();
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.error('HLS Error:', data);
        }
      });

      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS support
      video.src = src;
      video.addEventListener('loadedmetadata', () => {
        video.play();
      });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [src]);

  return (
    <div className="relative bg-black rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        poster={poster}
        controls
        className="w-full aspect-video"
      />
    </div>
  );
}
```

### 5.4 Playback Page

```jsx
// src/pages/Playback.jsx
import { useState, useEffect } from 'react';
import { shinobiService } from '../services/shinobi';
import { format, subDays } from 'date-fns';

export default function Playback() {
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [recordings, setRecordings] = useState([]);
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [selectedVideo, setSelectedVideo] = useState(null);

  useEffect(() => {
    loadCameras();
  }, []);

  useEffect(() => {
    if (selectedCamera) {
      loadRecordings();
    }
  }, [selectedCamera, dateRange]);

  const loadCameras = async () => {
    const data = await shinobiService.getCameras();
    setCameras(data);
    if (data.length > 0) setSelectedCamera(data[0]);
  };

  const loadRecordings = async () => {
    const data = await shinobiService.getRecordings(
      selectedCamera.mid,
      dateRange.start,
      dateRange.end
    );
    setRecordings(data.videos || []);
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-neutral-900 mb-6">
        Playback & Recordings
      </h1>

      <div className="grid grid-cols-12 gap-6">
        {/* Filters */}
        <div className="col-span-3 bg-white rounded-lg p-4">
          <h2 className="font-semibold mb-4">Filters</h2>
          
          {/* Camera Select */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Camera</label>
            <select
              value={selectedCamera?.mid || ''}
              onChange={(e) => {
                const camera = cameras.find(c => c.mid === e.target.value);
                setSelectedCamera(camera);
              }}
              className="w-full p-2 border border-neutral-200 rounded"
            >
              {cameras.map(camera => (
                <option key={camera.mid} value={camera.mid}>
                  {camera.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Start Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({
                ...prev,
                start: e.target.value
              }))}
              className="w-full p-2 border border-neutral-200 rounded"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">End Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({
                ...prev,
                end: e.target.value
              }))}
              className="w-full p-2 border border-neutral-200 rounded"
            />
          </div>

          <button
            onClick={loadRecordings}
            className="w-full bg-primary text-white py-2 rounded hover:bg-opacity-90"
          >
            Search
          </button>
        </div>

        {/* Recordings List & Player */}
        <div className="col-span-9">
          {/* Video Player */}
          {selectedVideo && (
            <div className="bg-white rounded-lg p-4 mb-6">
              <video
                src={shinobiService.getRecordingUrl(
                  selectedCamera.mid,
                  selectedVideo.filename
                )}
                controls
                className="w-full aspect-video bg-black rounded"
              />
              <div className="mt-4">
                <h3 className="font-semibold">{selectedVideo.filename}</h3>
                <p className="text-sm text-neutral-500">
                  {format(new Date(selectedVideo.time), 'PPpp')}
                </p>
              </div>
            </div>
          )}

          {/* Recordings Grid */}
          <div className="bg-white rounded-lg p-4">
            <h2 className="font-semibold mb-4">
              Recordings ({recordings.length})
            </h2>
            
            <div className="grid grid-cols-3 gap-4">
              {recordings.map(video => (
                <div
                  key={video.filename}
                  onClick={() => setSelectedVideo(video)}
                  className="cursor-pointer border border-neutral-200 rounded-lg p-3 hover:border-primary"
                >
                  <div className="aspect-video bg-neutral-100 rounded mb-2 flex items-center justify-center">
                    <span className="text-4xl">▶️</span>
                  </div>
                  <p className="text-sm font-medium truncate">
                    {format(new Date(video.time), 'PPp')}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {(video.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ))}
            </div>

            {recordings.length === 0 && (
              <div className="text-center py-12 text-neutral-500">
                No recordings found for selected date range
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 5.5 Cameras Management Page

```jsx
// src/pages/Cameras.jsx
import { useState, useEffect } from 'react';
import { shinobiService } from '../services/shinobi';

export default function Cameras() {
  const [cameras, setCameras] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCamera, setEditingCamera] = useState(null);

  useEffect(() => {
    loadCameras();
  }, []);

  const loadCameras = async () => {
    const data = await shinobiService.getCameras();
    setCameras(data);
  };

  const handleAddCamera = async (cameraData) => {
    await shinobiService.addCamera(cameraData);
    setShowAddModal(false);
    loadCameras();
  };

  const handleUpdateCamera = async (monitorId, cameraData) => {
    await shinobiService.updateCamera(monitorId, cameraData);
    setEditingCamera(null);
    loadCameras();
  };

  const handleDeleteCamera = async (monitorId) => {
    if (confirm('Are you sure you want to delete this camera?')) {
      await shinobiService.deleteCamera(monitorId);
      loadCameras();
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-neutral-900">
          Cameras Management
        </h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-opacity-90"
        >
          + Add Camera
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {cameras.map(camera => (
          <div
            key={camera.mid}
            className="bg-white border border-neutral-200 rounded-lg p-6"
          >
            <div className="flex justify-between items-start">
              <div className="flex gap-4">
                <div className="w-48 h-32 bg-neutral-100 rounded overflow-hidden">
                  {camera.snapshot && (
                    <img
                      src={camera.snapshot}
                      alt={camera.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold mb-2">
                    {camera.name}
                  </h3>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="text-neutral-500">Type:</span>{' '}
                      {camera.type}
                    </p>
                    <p>
                      <span className="text-neutral-500">Protocol:</span>{' '}
                      {camera.protocol || 'RTSP'}
                    </p>
                    <p>
                      <span className="text-neutral-500">Resolution:</span>{' '}
                      {camera.width}x{camera.height}
                    </p>
                    <p>
                      <span className="text-neutral-500">Status:</span>{' '}
                      <span className={
                        camera.mode === 'start'
                          ? 'text-green-600'
                          : 'text-red-600'
                      }>
                        {camera.mode === 'start' ? 'Online' : 'Offline'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setEditingCamera(camera)}
                  className="px-4 py-2 border border-neutral-300 rounded hover:bg-neutral-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteCamera(camera.mid)}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Camera Modal */}
      {(showAddModal || editingCamera) && (
        <CameraFormModal
          camera={editingCamera}
          onSubmit={editingCamera ? handleUpdateCamera : handleAddCamera}
          onClose={() => {
            setShowAddModal(false);
            setEditingCamera(null);
          }}
        />
      )}
    </div>
  );
}
```

---

## 📋 Phase 6: Backend API (Week 9-10)

### 6.1 Backend Structure (Node.js + Express)

```
smart-cam-backend/
├── src/
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── paymentController.js
│   │   └── shinobiController.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── errorHandler.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Subscription.js
│   │   └── Camera.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── user.js
│   │   ├── payment.js
│   │   └── shinobi.js
│   ├── services/
│   │   ├── shinobiService.js
│   │   └── paymentService.js
│   ├── config/
│   │   └── database.js
│   └── server.js
└── package.json
```

### 6.2 Key Backend Endpoints

```javascript
// Authentication
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me

// Payment & Subscription
POST /api/payment/create-checkout
POST /api/payment/webhook
GET  /api/subscription/status

// Shinobi Integration
GET  /api/user/group-key
POST /api/shinobi/provision-user
GET  /api/shinobi/cameras
POST /api/shinobi/cameras
PUT  /api/shinobi/cameras/:id
DELETE /api/shinobi/cameras/:id
```

---

## 📋 Phase 7: Payment Integration (Week 11)

### 7.1 Payment Flow

```javascript
// src/services/payment.js
export const paymentService = {
  createCheckout: async (planId) => {
    const response = await axios.post('/api/payment/create-checkout', {
      planId,
      successUrl: `${window.location.origin}/payment/success`,
      cancelUrl: `${window.location.origin}/pricing`
    });
    
    // Redirect to Stripe/Razorpay
    window.location.href = response.data.checkoutUrl;
  },

  verifyPayment: async (sessionId) => {
    const response = await axios.post('/api/payment/verify', {
      sessionId
    });
    
    return response.data;
  }
};
```

### 7.2 Payment Success Flow

```
Payment Success
  ↓
Backend Webhook
  ↓
Create Shinobi Group for User
  ↓
Generate Group Key
  ↓
Store in Database
  ↓
Send JWT Token
  ↓
Redirect to app.drishyamvms.com
```

---

## 📋 Phase 8: Deployment (Week 12)

### 8.1 Environment Variables

```env
# Marketing Website (.env)
VITE_API_BASE_URL=https://api.drishyamvms.com
VITE_STRIPE_PUBLIC_KEY=pk_live_xxx

# VMS App (.env)
VITE_API_BASE_URL=https://api.drishyamvms.com
VITE_SHINOBI_URL=https://shinobi.drishyamvms.com
VITE_SHINOBI_API_KEY=your_api_key
```

### 8.2 Build Commands

```bash
# Marketing Website
cd smart-cam-marketing
npm run build
# Deploy dist/ to www.drishyamvms.com

# VMS App
cd smart-cam-app
npm run build
# Deploy dist/ to app.drishyamvms.com
```

### 8.3 Deployment Stack

```
Frontend:
- Vercel / Netlify (for both sites)

Backend:
- AWS EC2 / DigitalOcean
- Node.js + PM2

Shinobi:
- Dedicated Server (High CPU/RAM)
- Docker Container

Database:
- PostgreSQL / MongoDB

Storage:
- AWS S3 / Cloudflare R2 (10PB)
```

---

## 📋 Phase 9: Testing & Optimization (Week 13-14)

### 9.1 Testing Checklist

- [ ] Authentication flow (Register → Login → JWT)
- [ ] Payment gateway integration
- [ ] Camera CRUD operations
- [ ] Live streaming (HLS)
- [ ] Recording playback
- [ ] Responsive design (Mobile/Tablet/Desktop)
- [ ] Browser compatibility
- [ ] Video player performance
- [ ] Error handling
- [ ] Loading states

### 9.2 Performance Optimization

```javascript
// Lazy load pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const LiveView = lazy(() => import('./pages/LiveView'));
const Playback = lazy(() => import('./pages/Playback'));

// Code splitting
// Image optimization (WebP format)
// CDN for static assets
// Gzip compression
// Service Worker for caching
```

---

## 🎯 Final Deliverables

1. ✅ Marketing Website (React + Vite)
2. ✅ VMS Application (React + Vite)
3. ✅ Backend API (Node.js)
4. ✅ Shinobi Integration
5. ✅ Payment Gateway
6. ✅ Authentication System
7. ✅ Cloud Storage (10PB)
8. ✅ Documentation

---

## 📞 Support & Resources

- Shinobi Docs: https://shinobi.video/docs
- React Docs: https://react.dev
- Vite Docs: https://vitejs.dev
- HLS.js: https://github.com/video-dev/hls.js

---

**Total Timeline: 14 Weeks (3.5 Months)**

