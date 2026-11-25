/**
 * Smart-Cam Marketing Website
 * Main JavaScript File
 */

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {

    // ======================
    // Mobile Menu Toggle
    // ======================
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');

    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', function() {
            mobileMenu.classList.toggle('hidden');

            // Change icon
            const icon = this.querySelector('i');
            if (mobileMenu.classList.contains('hidden')) {
                icon.className = 'ph ph-list text-3xl';
            } else {
                icon.className = 'ph ph-x text-3xl';
            }
        });

        // Close mobile menu when clicking on a link
        const mobileLinks = mobileMenu.querySelectorAll('a');
        mobileLinks.forEach(link => {
            link.addEventListener('click', function() {
                mobileMenu.classList.add('hidden');
                const icon = mobileMenuBtn.querySelector('i');
                icon.className = 'ph ph-list text-3xl';
            });
        });
    }

    // ======================
    // Smooth Scroll for Anchor Links
    // ======================
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');

            // Skip if href is just "#"
            if (href === '#') return;

            e.preventDefault();
            const target = document.querySelector(href);

            if (target) {
                const headerOffset = 80; // Height of fixed header
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // ======================
    // Contact Form Handler
    // ======================
    const contactForm = document.getElementById('contact-form');
    const successMessage = document.getElementById('success-message');

    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // Get form data
            const formData = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                phone: document.getElementById('phone').value,
                subject: document.getElementById('subject').value,
                message: document.getElementById('message').value
            };

            console.log('Form submitted:', formData);

            // TODO: Replace with actual API call
            // Example:
            // fetch('/api/contact', {
            //     method: 'POST',
            //     headers: {
            //         'Content-Type': 'application/json',
            //     },
            //     body: JSON.stringify(formData)
            // })
            // .then(response => response.json())
            // .then(data => {
            //     // Show success message
            //     successMessage.classList.remove('hidden');
            //     contactForm.reset();
            // })
            // .catch(error => console.error('Error:', error));

            // For demo: Show success message and reset form
            successMessage.classList.remove('hidden');
            contactForm.reset();

            // Hide success message after 5 seconds
            setTimeout(() => {
                successMessage.classList.add('hidden');
            }, 5000);
        });
    }

    // ======================
    // Navbar Scroll Effect
    // ======================
    const header = document.querySelector('header');
    let lastScroll = 0;

    window.addEventListener('scroll', function() {
        const currentScroll = window.pageYOffset;

        // Add shadow when scrolled
        if (currentScroll > 50) {
            header.classList.add('shadow-lg');
        } else {
            header.classList.remove('shadow-lg');
        }

        // Optional: Hide/show header on scroll
        // if (currentScroll > lastScroll && currentScroll > 100) {
        //     header.style.transform = 'translateY(-100%)';
        // } else {
        //     header.style.transform = 'translateY(0)';
        // }

        lastScroll = currentScroll;
    });

    // ======================
    // Intersection Observer for Animations
    // ======================
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe all sections
    document.querySelectorAll('section').forEach(section => {
        observer.observe(section);
    });

    // ======================
    // Auto-open First FAQ Item
    // ======================
    const firstFaqItem = document.querySelector('details');
    if (firstFaqItem && window.location.pathname.includes('faq')) {
        firstFaqItem.open = true;
    }

    // ======================
    // Pricing Plan Selection (from URL)
    // ======================
    const urlParams = new URLSearchParams(window.location.search);
    const selectedPlan = urlParams.get('plan');

    if (selectedPlan) {
        console.log('Selected plan from URL:', selectedPlan);
        // TODO: Pre-select plan in registration form or highlight in pricing page
    }

    // ======================
    // Add Loading State to Buttons
    // ======================
    function addLoadingState(button) {
        const originalText = button.innerHTML;
        button.innerHTML = '<div class="spinner mx-auto"></div>';
        button.disabled = true;

        // Return function to restore button
        return function() {
            button.innerHTML = originalText;
            button.disabled = false;
        };
    }

    // ======================
    // Form Validation Enhancement
    // ======================
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        const inputs = form.querySelectorAll('input[required], textarea[required], select[required]');

        inputs.forEach(input => {
            input.addEventListener('blur', function() {
                if (this.value.trim() === '') {
                    this.classList.add('border-red');
                } else {
                    this.classList.remove('border-red');
                }
            });
        });
    });

    // ======================
    // Cookie Consent (Optional)
    // ======================
    function showCookieConsent() {
        const consent = localStorage.getItem('cookieConsent');

        if (!consent) {
            // Create and show cookie banner
            const banner = document.createElement('div');
            banner.className = 'fixed bottom-0 left-0 right-0 bg-neutral-900 text-white p-6 shadow-2xl z-50';
            banner.innerHTML = `
                <div class="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <p class="text-sm">
                        We use cookies to improve your experience. By continuing to use this site, you agree to our use of cookies.
                        <a href="#" class="text-primary hover:text-orange-600 underline">Learn more</a>
                    </p>
                    <button id="accept-cookies" class="bg-primary hover:bg-orange-600 px-6 py-2 rounded-full font-medium transition-colors whitespace-nowrap">
                        Accept Cookies
                    </button>
                </div>
            `;

            document.body.appendChild(banner);

            document.getElementById('accept-cookies').addEventListener('click', function() {
                localStorage.setItem('cookieConsent', 'true');
                banner.remove();
            });
        }
    }

    // Uncomment to enable cookie consent banner
    // showCookieConsent();

    // ======================
    // Utility Functions
    // ======================

    // Debounce function for performance optimization
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Throttle function for scroll events
    function throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // Format currency
    function formatCurrency(amount, currency = 'USD') {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(amount);
    }

    // Format date
    function formatDate(date) {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(new Date(date));
    }

    // Copy to clipboard
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            console.log('Copied to clipboard:', text);
        }).catch(err => {
            console.error('Failed to copy:', err);
        });
    }

    // ======================
    // Analytics Event Tracking (Optional)
    // ======================
    function trackEvent(category, action, label) {
        // Google Analytics example
        if (typeof gtag !== 'undefined') {
            gtag('event', action, {
                'event_category': category,
                'event_label': label
            });
        }

        // Console log for debugging
        console.log('Event tracked:', { category, action, label });
    }

    // Track button clicks
    document.querySelectorAll('a[href*="register"], a[href*="login"]').forEach(link => {
        link.addEventListener('click', function() {
            const action = this.href.includes('register') ? 'Click Register' : 'Click Login';
            trackEvent('Conversion', action, this.href);
        });
    });

    // ======================
    // Performance Monitoring
    // ======================
    if ('performance' in window) {
        window.addEventListener('load', function() {
            setTimeout(() => {
                const perfData = window.performance.timing;
                const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
                console.log('Page load time:', pageLoadTime + 'ms');
            }, 0);
        });
    }

    console.log('Smart-Cam Marketing Website Loaded ✨');
});
