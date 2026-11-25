import { useState, useEffect, useRef } from 'react';
import { Mail, ExternalLink, ChevronRight } from 'lucide-react';

// ─── Prose primitives ─────────────────────────────────────────────────────────

function H2({ id, children }) {
  return (
    <h2 id={id} className="text-[22px] font-bold text-foreground mt-12 mb-4 leading-snug scroll-mt-20 first:mt-0">
      {children}
    </h2>
  );
}

function H3({ id, children }) {
  return (
    <h3 id={id} className="text-[16px] font-semibold text-foreground mt-8 mb-3 scroll-mt-20">
      {children}
    </h3>
  );
}

function P({ children }) {
  return <p className="text-[14px] text-muted-foreground leading-relaxed mb-4">{children}</p>;
}

function B({ children }) {
  return <strong className="font-semibold text-foreground">{children}</strong>;
}

function Code({ children }) {
  return (
    <code className="bg-muted text-foreground text-[12px] font-mono px-1.5 py-0.5 rounded border border-border">
      {children}
    </code>
  );
}

function Divider() {
  return <hr className="border-border my-10" />;
}

function Note({ children, type = 'info' }) {
  const styles = {
    info:    'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/30 dark:border-blue-800/50 dark:text-blue-300',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-950/30 dark:border-yellow-800/50 dark:text-yellow-300',
    tip:     'bg-green-50 border-green-200 text-green-800 dark:bg-green-950/30 dark:border-green-800/50 dark:text-green-300',
  };
  const label = { info: 'Note', warning: 'Warning', tip: 'Tip' };
  return (
    <div className={`border rounded-lg px-4 py-3 mb-4 text-[13px] leading-relaxed ${styles[type]}`}>
      <span className="font-bold mr-1.5">{label[type]}:</span>
      {children}
    </div>
  );
}

function StepList({ steps }) {
  return (
    <ol className="space-y-3 mb-4">
      {steps.map((s, i) => (
        <li key={i} className="flex gap-3">
          <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
            {i + 1}
          </span>
          <span className="text-[14px] text-muted-foreground leading-relaxed">{s}</span>
        </li>
      ))}
    </ol>
  );
}

function BulletList({ items }) {
  return (
    <ul className="space-y-1.5 mb-4 ml-4">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-[14px] text-muted-foreground leading-relaxed">
          <span className="text-primary mt-1.5 text-[8px]">●</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Table({ head, rows }) {
  return (
    <div className="overflow-x-auto mb-6 rounded-lg border border-border">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="bg-muted">
            {head.map((h) => (
              <th key={h} className="px-4 py-2.5 text-left font-semibold text-foreground border-b border-border">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row, i) => (
            <tr key={i} className="bg-card hover:bg-muted/50 transition-colors">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2.5 text-muted-foreground">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── FAQ accordion ────────────────────────────────────────────────────────────

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-lg overflow-hidden mb-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 px-4 py-3.5 text-left bg-card hover:bg-muted/50 transition-colors"
      >
        <span className="text-[14px] font-medium text-foreground">{q}</span>
        <ChevronRight className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="px-4 py-3.5 border-t border-border bg-muted/20">
          <p className="text-[13px] text-muted-foreground leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

// ─── Left nav ─────────────────────────────────────────────────────────────────

const NAV_SECTIONS = [
  {
    heading: 'Overview',
    items: [
      { id: 'introduction',  label: 'Introduction' },
      { id: 'quick-start',   label: 'Quick Start' },
    ],
  },
  {
    heading: 'Core Features',
    items: [
      { id: 'cameras',     label: 'Cameras & Devices' },
      { id: 'live-view',   label: 'Live View' },
      { id: 'recordings',  label: 'Recordings & Gallery' },
      { id: 'timelapse',   label: 'Timelapse' },
      { id: 'timeline',    label: 'Timeline Playback' },
      { id: 'map',         label: 'Map View' },
    ],
  },
  {
    heading: 'Account & Security',
    items: [
      { id: 'account',       label: 'Account Management' },
      { id: 'auth',          label: 'Authentication' },
      { id: 'sessions',      label: 'Sessions & Tokens' },
    ],
  },
  {
    heading: 'Subscription',
    items: [
      { id: 'plans',  label: 'Plans & Limits' },
    ],
  },
  {
    heading: 'Troubleshooting',
    items: [
      { id: 'faq',     label: 'FAQ' },
      { id: 'support', label: 'Contact Support' },
    ],
  },
];

function DocNav({ active }) {
  return (
    <nav className="space-y-5">
      {NAV_SECTIONS.map(({ heading, items }) => (
        <div key={heading}>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-2">
            {heading}
          </p>
          <ul className="space-y-0.5">
            {items.map(({ id, label }) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className={`block px-2 py-1.5 text-[13px] rounded-md transition-colors ${
                    active === id
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  }`}
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

// ─── Main docs content ────────────────────────────────────────────────────────

function DocContent() {
  return (
    <article className="max-w-[720px]">

      {/* ── Introduction ── */}
      <H2 id="introduction">Introduction</H2>
      <P>
        <B>Smart-Cam</B> is a cloud-based Video Management System (VMS) built for construction sites,
        industrial facilities, and multi-location businesses. It integrates with the{' '}
        <B>Shinobi VMS</B> engine to provide real-time monitoring, cloud recording, timelapse generation,
        and a site map — all from a single dashboard.
      </P>
      <P>
        This guide covers everything from setting up your first camera to managing your account,
        understanding token-based sessions, and troubleshooting common issues.
      </P>
      <Note type="tip">
        If you just created your account, skip to <a href="#quick-start" className="underline font-medium">Quick Start</a> to
        get your first camera running in under 5 minutes.
      </Note>

      <Divider />

      {/* ── Quick Start ── */}
      <H2 id="quick-start">Quick Start</H2>
      <P>
        Follow these steps to go from a fresh account to a working live camera feed.
      </P>
      <StepList steps={[
        <>Go to <B>Devices</B> in the sidebar → click <B>Add Group</B>. Give your site a name (e.g. "Site A – Mumbai").</>,
        <>Inside the group, click <B>Add Camera</B>. Enter the RTSP stream URL, camera name, and position.</>,
        <>Open <B>Live View</B> — your camera feed should appear within a few seconds.</>,
        <>To record, go to the camera settings and enable <B>Continuous Recording</B> or <B>Motion-triggered</B> recording.</>,
        <>After a day of recording, go to <B>Timelapse</B> and click <B>Generate</B> to create a condensed video.</>,
      ]} />
      <Note type="info">
        The Shinobi VMS service must be running at the URL configured in your environment (<Code>VITE_SHINOBI_URL</Code>).
        Contact your administrator if streams are not loading.
      </Note>

      <Divider />

      {/* ── Cameras & Devices ── */}
      <H2 id="cameras">Cameras &amp; Devices</H2>
      <P>
        Smart-Cam organises cameras into <B>Groups</B> (also called Devices). A group typically
        represents one physical site or building. Each group has a unique <Code>groupKey</Code> that
        links it to Shinobi VMS.
      </P>

      <H3 id="cameras-add">Adding a camera</H3>
      <StepList steps={[
        <>Navigate to <B>Devices</B> → select or create a group.</>,
        <>Click <B>+ Add Camera</B> and fill in the camera name, RTSP URL, and optional description.</>,
        <>Click <B>Save</B>. The camera is registered in Shinobi and appears in the list immediately.</>,
      ]} />

      <H3 id="cameras-rtsp">RTSP URL format</H3>
      <P>Most IP cameras use one of these formats:</P>
      <BulletList items={[
        <><Code>rtsp://admin:password@192.168.1.100:554/stream1</Code> — username/password auth</>,
        <><Code>rtsp://192.168.1.100:554/h264/ch1/main/av_stream</Code> — no auth (Hikvision)</>,
        <><Code>rtsp://192.168.1.100:554/cam/realmonitor?channel=1&subtype=0</Code> — Dahua format</>,
      ]} />
      <Note type="warning">
        RTSP port <Code>554</Code> must be reachable from the server running Shinobi. If the camera is
        on a separate VLAN, ensure firewall rules allow the connection.
      </Note>

      <Divider />

      {/* ── Live View ── */}
      <H2 id="live-view">Live View</H2>
      <P>
        Live View shows real-time streams from all cameras in your selected group. Streams are delivered
        as <B>HLS (HTTP Live Streaming)</B> via Shinobi, which works in all modern browsers without plugins.
      </P>
      <BulletList items={[
        'Click any camera tile to expand it full-screen.',
        'Use the grid selector (top-right) to switch between 1×1, 2×2, and 3×3 layouts.',
        'Streams auto-reconnect if the connection drops — no page refresh needed.',
        'Stream delay is typically 2–6 seconds (HLS segment size).',
      ]} />
      <Note type="tip">
        For lower latency, ask your administrator to configure Shinobi to use WebRTC output instead of HLS.
      </Note>

      <Divider />

      {/* ── Recordings & Gallery ── */}
      <H2 id="recordings">Recordings &amp; Gallery</H2>
      <P>
        Recordings are saved to <B>S3-compatible object storage</B>. The Gallery page lets you browse,
        play, download, and delete recorded clips.
      </P>

      <H3>Recording modes</H3>
      <Table
        head={['Mode', 'Description', 'Storage impact']}
        rows={[
          ['Continuous', 'Records 24/7 regardless of activity', 'High'],
          ['Motion-triggered', 'Records only when motion is detected', 'Low to medium'],
          ['Schedule-based', 'Records during configured hours only', 'Medium'],
          ['Manual', 'Start/stop recording from the dashboard', 'Varies'],
        ]}
      />

      <H3>Downloading a clip</H3>
      <P>
        Open <B>Gallery</B> → find the clip → click the <B>download icon</B>. Clips are served via
        pre-signed S3 URLs that expire after 1 hour. Downloaded files are in <Code>.mp4</Code> format.
      </P>

      <Divider />

      {/* ── Timelapse ── */}
      <H2 id="timelapse">Timelapse</H2>
      <P>
        Timelapse condenses hours or days of footage into a short video. It reads from recorded clips
        stored in S3 and uses <B>FFmpeg</B> on the server to stitch frames together.
      </P>

      <H3>Generating a timelapse</H3>
      <StepList steps={[
        <>Go to <B>Timelapse</B> in the sidebar.</>,
        <>Select the camera and date range you want to compress.</>,
        <>Choose the output speed (e.g., <B>10× real-time</B> = 1 hour of footage → 6-minute video).</>,
        <>Click <B>Generate</B>. Processing happens in the background — you'll see progress in the UI.</>,
        <>When complete, the timelapse appears in <B>Gallery</B> under the "Timelapse" filter.</>,
      ]} />
      <Note type="info">
        Generation time depends on the length of the source footage and server resources. A full day of
        recording typically takes 2–5 minutes to process.
      </Note>

      <Divider />

      {/* ── Timeline ── */}
      <H2 id="timeline">Timeline Playback</H2>
      <P>
        The <B>Timeline</B> page lets you scrub through any recorded footage without searching individual files.
        It displays a visual timeline bar for each camera, colour-coded by recording type (motion, continuous, etc.).
      </P>
      <BulletList items={[
        'Click anywhere on the timeline to jump to that moment.',
        'Use the zoom slider to inspect a specific hour or expand to see a full week.',
        'Multiple cameras can be viewed side-by-side in timeline mode.',
        'Clips are loaded on demand — no need to download before playback.',
      ]} />

      <Divider />

      {/* ── Map View ── */}
      <H2 id="map">Map View</H2>
      <P>
        Map View plots all camera and site locations on an interactive map. This is especially useful
        for teams managing multiple sites across a city or region.
      </P>
      <BulletList items={[
        'Camera locations are set when adding a camera (latitude/longitude).',
        'Click a marker to open a mini live view popup for that camera.',
        'Site groups are shown as clustered markers when zoomed out.',
      ]} />

      <Divider />

      {/* ── Account Management ── */}
      <H2 id="account">Account Management</H2>
      <P>
        Access your account settings from the sidebar (<B>Settings</B>) or the user menu in the top-right corner.
      </P>

      <H3>Updating your profile</H3>
      <P>
        Go to <B>Settings → Profile Information</B>. You can update your <B>full name</B> and{' '}
        <B>email address</B>. Changes take effect immediately.
      </P>
      <Note type="warning">
        Changing your email will require you to log in again on other devices, as the new email becomes
        your login credential.
      </Note>

      <H3>Changing your password</H3>
      <StepList steps={[
        <>Go to <B>Settings → Change Password</B>.</>,
        'Enter your current password to confirm your identity.',
        <>Choose a new password — it must be at least <B>8 characters</B> and include an uppercase letter, lowercase letter, and a number.</>,
        <>Click <B>Change password</B>. All other sessions (other browsers/devices) are signed out automatically.</>,
      ]} />

      <H3>Forgot your password?</H3>
      <P>
        On the login page, click <B>"Forgot password?"</B>. Enter your email address and we'll send a
        reset link. The link expires in <B>1 hour</B> and is single-use. Check your spam folder if it
        doesn't arrive within a few minutes.
      </P>

      <Divider />

      {/* ── Authentication ── */}
      <H2 id="auth">Authentication</H2>
      <P>
        Smart-Cam uses <B>JWT (JSON Web Token)</B> based authentication with a two-token system
        designed for security and convenience.
      </P>

      <Table
        head={['Token type', 'Lifetime', 'Purpose']}
        rows={[
          ['Access token', '2 hours', 'Authorises API requests. Sent as Authorization: Bearer header.'],
          ['Refresh token', '30 days', 'Obtains a new access token silently when the 2-hour token expires.'],
          ['Password reset token', '1 hour', 'Single-use. Sent via email to reset a forgotten password.'],
        ]}
      />

      <H3>Automatic session renewal</H3>
      <P>
        When your <B>2-hour access token</B> expires, the app automatically requests a new one using the
        refresh token — without asking you to log in again. You'll only be redirected to the login page if:
      </P>
      <BulletList items={[
        'Your refresh token has expired (after 30 days of inactivity).',
        'You explicitly log out.',
        'Your password is changed (all sessions are revoked).',
        'An administrator deactivates your account.',
      ]} />

      <Divider />

      {/* ── Sessions & Tokens ── */}
      <H2 id="sessions">Sessions &amp; Tokens</H2>

      <H3>Token security</H3>
      <P>
        Tokens are stored in <Code>localStorage</Code>. Each refresh token is <B>single-use</B> —
        when it's used to get a new access token, it's immediately invalidated and a brand new pair is
        issued. This is known as <B>refresh token rotation</B> and prevents token replay attacks.
      </P>

      <H3>Signing out</H3>
      <P>
        Logging out calls the backend to <B>revoke your refresh token</B> from the database. This means
        even if someone copied your token, it would be invalid after you log out.
      </P>

      <H3>API key / Group key</H3>
      <P>
        Your <Code>groupKey</Code> (also shown as <Code>apiKey</Code>) is a unique identifier generated
        when you register. It links your account to your camera group in Shinobi VMS. It does <B>not</B>{' '}
        expire and should be kept confidential.
      </P>

      <Divider />

      {/* ── Plans & Limits ── */}
      <H2 id="plans">Plans &amp; Limits</H2>
      <Table
        head={['Plan', 'Cameras', 'Storage', 'Retention', 'Price']}
        rows={[
          ['Free',       '2',       '10 GB',  '7 days',  '₹0 / mo'],
          ['Pro',        '10',      '100 GB', '30 days', '₹999 / mo'],
          ['Enterprise', 'Unlimited','1 TB+', '90 days', 'Custom'],
        ]}
      />
      <Note type="info">
        All new accounts start on the <B>Free plan</B> automatically. To upgrade, go to <B>Settings → Subscription</B> or
        contact our sales team.
      </Note>

      <Divider />

      {/* ── FAQ ── */}
      <H2 id="faq">Frequently Asked Questions</H2>

      {[
        {
          q: "Why isn't my camera stream showing?",
          a: "Check that the RTSP URL is correct and the camera is powered on. Verify the Shinobi VMS service is running and reachable at the configured URL. Ensure port 554 (RTSP) is open in your firewall. If the stream worked before, try restarting the Shinobi monitor for that camera.",
        },
        {
          q: "I'm being logged out unexpectedly. What's wrong?",
          a: "Smart-Cam sessions last 30 days with automatic background renewal. If you're being signed out early, your browser may be configured to clear localStorage on close (Private/Incognito mode does this). Check browser privacy settings. Also ensure you're not using the app from two devices simultaneously with the same refresh token.",
        },
        {
          q: "My timelapse is stuck generating. What do I do?",
          a: "Timelapse generation uses FFmpeg on the server. If it's stuck, the server may be out of disk space or CPU-bound with another job. Ask your administrator to check the server logs. In the UI you can cancel and retry the generation.",
        },
        {
          q: "Can I use Smart-Cam on my phone?",
          a: "Yes — Smart-Cam is a fully responsive web app. Open it in any modern mobile browser (Chrome, Safari, Firefox). For the best mobile experience, add the site to your home screen from the browser menu. Live streams work over Wi-Fi; mobile data may have quality limitations.",
        },
        {
          q: "How do I manage multiple construction sites?",
          a: "Create a separate Device Group per site. Each group has its own cameras, groupKey, and recording settings. You can switch between sites from the Devices page. The Map View shows all sites and cameras simultaneously.",
        },
        {
          q: "Can I download all my recordings before my plan expires?",
          a: "Yes. Go to Gallery → filter by camera and date → use the Download button on each clip. There's no bulk-download yet, but each clip generates a pre-signed link valid for 1 hour.",
        },
        {
          q: "Is my video footage encrypted?",
          a: "Video files are stored encrypted at rest in S3-compatible object storage. Access is controlled via short-lived pre-signed URLs (1 hour expiry). In transit, all connections use HTTPS/TLS.",
        },
        {
          q: "What browsers are supported?",
          a: "Chrome 90+, Firefox 88+, Safari 14+, and Edge 90+. Internet Explorer is not supported. HLS video playback requires a browser with native HLS support or the hls.js library (included automatically).",
        },
      ].map((item) => (
        <FaqItem key={item.q} {...item} />
      ))}

      <Divider />

      {/* ── Support ── */}
      <H2 id="support">Contact Support</H2>
      <P>
        Our support team is available <B>Monday – Friday, 9 AM – 6 PM IST</B>. We aim to respond to
        all queries within <B>24 business hours</B>.
      </P>
      <P>
        Before reaching out, please include: your account email, a description of the issue, browser
        version, and any error messages from the browser console (<Code>F12 → Console</Code>).
      </P>

      <div className="mt-6 grid sm:grid-cols-2 gap-4">
        <a
          href="mailto:support@smart-cam.in"
          className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl hover:border-primary/40 hover:bg-primary/5 transition-all group"
        >
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Mail className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-foreground group-hover:text-primary transition-colors">Email support</p>
            <p className="text-[12px] text-muted-foreground">support@smart-cam.in</p>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground ml-auto opacity-60" />
        </a>

        <a
          href="mailto:sales@smart-cam.in"
          className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl hover:border-primary/40 hover:bg-primary/5 transition-all group"
        >
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Mail className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-foreground group-hover:text-primary transition-colors">Sales & upgrades</p>
            <p className="text-[12px] text-muted-foreground">sales@smart-cam.in</p>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground ml-auto opacity-60" />
        </a>
      </div>

    </article>
  );
}

// ─── Page shell ───────────────────────────────────────────────────────────────

export default function Help() {
  const [activeSection, setActiveSection] = useState('introduction');
  const contentRef = useRef(null);

  // Highlight the active section in the left nav based on scroll position
  useEffect(() => {
    const allIds = NAV_SECTIONS.flatMap((s) => s.items.map((i) => i.id));

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          setActiveSection(visible[0].target.id);
        }
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    );

    allIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">

      {/* ── Left sidebar nav (hidden on mobile) ── */}
      <aside className="hidden xl:block w-[220px] shrink-0 border-r border-border">
        <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto py-8 px-4">
          {/* Doc title */}
          <div className="mb-6 px-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-primary mb-0.5">Smart-Cam</p>
            <p className="text-[15px] font-bold text-foreground leading-tight">Documentation</p>
          </div>

          <DocNav active={activeSection} />

          {/* Version badge */}
          <div className="mt-8 px-2">
            <span className="text-[11px] text-muted-foreground bg-muted px-2 py-1 rounded-md">v1.0 · Feb 2026</span>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div ref={contentRef} className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-[780px] mx-auto px-6 lg:px-10 py-10">

          {/* Page heading */}
          <div className="mb-10">
            <p className="text-[12px] font-semibold uppercase tracking-widest text-primary mb-2">Smart-Cam Documentation</p>
            <h1 className="text-[32px] font-extrabold text-foreground leading-tight mb-3">
              User Guide
            </h1>
            <p className="text-[15px] text-muted-foreground leading-relaxed max-w-[560px]">
              Complete reference for setting up cameras, managing recordings, understanding authentication,
              and getting the most out of Smart-Cam.
            </p>

            {/* Quick links row */}
            <div className="flex flex-wrap gap-2 mt-5">
              {[
                { href: '#quick-start', label: '⚡ Quick Start' },
                { href: '#cameras',    label: '📷 Cameras' },
                { href: '#auth',       label: '🔐 Auth' },
                { href: '#faq',        label: '❓ FAQ' },
                { href: '#support',    label: '✉️ Support' },
              ].map(({ href, label }) => (
                <a
                  key={href}
                  href={href}
                  className="inline-flex items-center text-[12px] font-medium bg-muted hover:bg-primary/10 hover:text-primary text-muted-foreground px-3 py-1.5 rounded-full border border-border transition-colors"
                >
                  {label}
                </a>
              ))}
            </div>
          </div>

          {/* Divider below header */}
          <hr className="border-border mb-10" />

          <DocContent />

          {/* Footer */}
          <div className="mt-16 pt-8 border-t border-border text-center">
            <p className="text-[12px] text-muted-foreground">
              Smart-Cam Documentation · Updated February 2026 ·{' '}
              <a href="mailto:support@smart-cam.in" className="text-primary hover:underline">support@smart-cam.in</a>
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
