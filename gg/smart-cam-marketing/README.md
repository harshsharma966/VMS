# Smart-Cam Marketing Website

A modern, responsive marketing website for Smart-Cam VMS (Video Management System) built with pure HTML, CSS, JavaScript, and Tailwind CSS.

## 🚀 Features

- **Fully Responsive** - Works seamlessly on desktop, tablet, and mobile devices
- **Pure HTML/CSS/JS** - No framework dependencies (except Tailwind CSS via CDN)
- **Modern Design** - Clean, professional design with smooth animations
- **SEO Optimized** - Proper meta tags and semantic HTML
- **Accessible** - WCAG compliant with keyboard navigation support
- **Fast Loading** - Optimized assets and minimal dependencies

## 📁 Project Structure

```
smart-cam-marketing/
├── index.html           # Homepage
├── pricing.html         # Pricing plans page
├── contact.html         # Contact form page
├── faq.html            # Frequently Asked Questions
├── login.html          # User login page
├── register.html       # User registration page
├── css/
│   └── style.css       # Custom CSS styles
├── js/
│   └── main.js         # JavaScript functionality
├── images/             # Image assets (add your images here)
├── assets/             # Other assets (fonts, icons, etc.)
└── README.md           # This file
```

## 🎨 Design System

### Colors
- **Primary**: #F7983A (Orange)
- **Neutral 0**: #FFFFFF (White)
- **Neutral 100**: #F1F2F6 (Light Gray)
- **Neutral 200**: #E5E7EB
- **Neutral 300**: #D1D5DB
- **Neutral 500**: #6B7280
- **Neutral 700**: #374151
- **Neutral 900**: #111827 (Dark Gray)
- **Red**: #EF4444
- **Green**: #10B981

### Typography
- **Font Family**: Inter (via Google Fonts)
- **Weights**: 400 (Regular), 500 (Medium), 600 (Semi Bold), 700 (Bold)

### Icons
- Using [Phosphor Icons](https://phosphoricons.com/) (via CDN)

## 🛠️ Setup & Installation

### Option 1: Open Directly
Simply open `index.html` in your web browser. All dependencies are loaded via CDN.

### Option 2: Use Live Server (Recommended)
For the best development experience:

1. **Using VS Code:**
   - Install the "Live Server" extension
   - Right-click on `index.html`
   - Select "Open with Live Server"

2. **Using Python:**
   ```bash
   cd smart-cam-marketing
   python -m http.server 8000
   ```
   Then open http://localhost:8000

3. **Using Node.js:**
   ```bash
   npx http-server
   ```

## 📄 Pages Overview

### 1. Homepage (`index.html`)
- Hero section with CTA buttons
- Features showcase (6 key features)
- Upgrade section (X-Ray Mode, Team Collaboration)
- Call-to-action section
- Footer

### 2. Pricing (`pricing.html`)
- Three pricing tiers: Starter, Professional, Enterprise
- Feature comparison
- Billing options
- FAQ section
- Security badges

### 3. Contact (`contact.html`)
- Contact information (email, phone, address)
- Contact form with validation
- Social media links
- Map integration ready

### 4. FAQ (`faq.html`)
- Categorized questions (General, Technical, Billing, Support)
- Expandable/collapsible answers
- Search functionality ready
- CTA section

### 5. Login (`login.html`)
- Email/password login form
- Remember me option
- Forgot password link
- Social login buttons (Google, Microsoft)
- Form validation

### 6. Register (`register.html`)
- Sign up form (name, email, company, password)
- Terms & conditions checkbox
- Social sign up options
- Trial features list
- Form validation

## 🔧 Customization

### Update Colors
Edit the Tailwind config in each HTML file's `<head>`:
```javascript
tailwind.config = {
    theme: {
        extend: {
            colors: {
                primary: '#YOUR_COLOR',
                // ... other colors
            }
        }
    }
}
```

### Add Your Logo
Replace the logo placeholder in the header:
```html
<div class="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
    <i class="ph ph-video-camera text-white text-2xl"></i>
</div>
```

With your image:
```html
<img src="images/logo.png" alt="Smart-Cam Logo" class="w-40 h-10">
```

### Update Images
Place your images in the `images/` folder and update the `src` attributes:
```html
<img src="images/your-image.jpg" alt="Description">
```

## 🔌 API Integration

### Contact Form
Update the form submission in `js/main.js`:
```javascript
fetch('/api/contact', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify(formData)
})
.then(response => response.json())
.then(data => {
    // Handle success
})
.catch(error => {
    // Handle error
});
```

### Authentication
Update login/register forms to call your backend API:
```javascript
// In login.html or register.html
fetch('/api/auth/login', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password })
})
.then(response => response.json())
.then(data => {
    // Redirect to dashboard
    window.location.href = 'https://app.drishyamvms.com/dashboard';
});
```

## 📱 Responsive Breakpoints

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

## ♿ Accessibility

- Semantic HTML5 elements
- ARIA labels where needed
- Keyboard navigation support
- Focus visible states
- Alt text for images
- Color contrast WCAG AA compliant

## 🚀 Deployment

### Deploy to Netlify
1. Create a free account at [Netlify](https://netlify.com)
2. Drag and drop the `smart-cam-marketing` folder
3. Your site is live!

### Deploy to Vercel
1. Create a free account at [Vercel](https://vercel.com)
2. Import your Git repository or upload the folder
3. Deploy with zero configuration

### Deploy to GitHub Pages
1. Push your code to GitHub
2. Go to Settings > Pages
3. Select your branch and folder
4. Your site will be live at `https://yourusername.github.io/smart-cam-marketing`

## 📈 Performance Optimization

### Before Production:
1. **Minify CSS** - Use a CSS minifier
2. **Minify JavaScript** - Use a JS minifier
3. **Optimize Images** - Compress images (use WebP format)
4. **Use Self-Hosted Fonts** - Download and host Inter font locally
5. **Bundle Assets** - Combine CSS/JS files
6. **Enable Caching** - Configure server caching headers
7. **Add CDN** - Use a CDN for static assets

## 🔒 Security

- Input validation on all forms
- HTTPS required for production
- Secure headers configured
- XSS protection
- CSRF tokens (add when integrating backend)

## 📝 License

This project is created for Smart-Cam VMS marketing purposes.

## 👥 Support

For questions or support:
- Email: support@smartcam.com
- Website: https://www.smartcam.com
- Documentation: [Link to docs]

## 🎯 Next Steps

1. **Add Real Content**:
   - Replace placeholder images with actual screenshots
   - Update company information
   - Add real testimonials

2. **Integrate Backend**:
   - Connect contact form to email service
   - Set up authentication API
   - Configure analytics

3. **SEO Optimization**:
   - Add sitemap.xml
   - Configure robots.txt
   - Add Open Graph meta tags
   - Submit to search engines

4. **Analytics**:
   - Add Google Analytics
   - Set up conversion tracking
   - Configure heatmaps (Hotjar, etc.)

5. **Performance**:
   - Run Lighthouse audit
   - Optimize images
   - Enable compression
   - Configure caching

---

Built with ❤️ for Smart-Cam VMS
