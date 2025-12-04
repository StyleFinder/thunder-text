// ROI Calculator
function updateROICalculator() {
  const productsCount =
    parseInt(document.getElementById("products-count").value) || 20;
  const timePerProduct =
    parseInt(document.getElementById("time-per-product").value) || 15;
  const hourlyRate =
    parseInt(document.getElementById("hourly-rate").value) || 25;

  // Calculate time saved (assuming AI takes 30 seconds vs manual time)
  const manualTimeWeekly = (productsCount * timePerProduct) / 60; // hours
  const aiTimeWeekly = (productsCount * 0.5) / 60; // 30 seconds per product
  const timeSaved = manualTimeWeekly - aiTimeWeekly;

  // Calculate money saved monthly (4 weeks)
  const moneySaved = timeSaved * hourlyRate * 4;

  // Update display
  document.getElementById("time-saved").textContent =
    `${timeSaved.toFixed(1)} hours`;
  document.getElementById("money-saved").textContent =
    `$${Math.round(moneySaved)}`;
}

// Initialize calculator listeners
document.addEventListener("DOMContentLoaded", () => {
  const calculatorInputs = document.querySelectorAll(
    "#products-count, #time-per-product, #hourly-rate",
  );
  calculatorInputs.forEach((input) => {
    input.addEventListener("input", updateROICalculator);
  });

  // Initial calculation
  updateROICalculator();
});

// Smooth scroll for navigation links
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute("href"));
    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  });
});

// Mobile menu toggle
const mobileMenuToggle = document.querySelector(".mobile-menu-toggle");
const navLinks = document.querySelector(".nav-links");

mobileMenuToggle?.addEventListener("click", () => {
  navLinks.classList.toggle("mobile-active");
  mobileMenuToggle.classList.toggle("active");
});

// Navbar scroll effect
const navbar = document.querySelector(".navbar");

window.addEventListener("scroll", () => {
  const currentScroll = window.pageYOffset;

  if (currentScroll > 100) {
    navbar.classList.add("scrolled");
  } else {
    navbar.classList.remove("scrolled");
  }
});

// Intersection Observer for fade-in animations
const observerOptions = {
  threshold: 0.1,
  rootMargin: "0px 0px -50px 0px",
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("fade-in-visible");
    }
  });
}, observerOptions);

// Observe all feature cards, testimonials, and pricing cards
document
  .querySelectorAll(".feature-card, .testimonial-card, .pricing-card, .step")
  .forEach((el) => {
    el.classList.add("fade-in");
    observer.observe(el);
  });

// Add CSS for animations
const style = document.createElement("style");
style.textContent = `
    .fade-in {
        opacity: 0;
        transform: translateY(20px);
        transition: opacity 0.6s ease, transform 0.6s ease;
        will-change: opacity, transform;
    }
    
    .fade-in-visible {
        opacity: 1 !important;
        transform: translateY(0) !important;
    }
    
    .navbar.scrolled {
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    
    .nav-links.mobile-active {
        display: flex;
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: white;
        flex-direction: column;
        padding: 2rem;
        border-top: 1px solid var(--border-color);
        box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    
    .mobile-menu-toggle.active span:first-child {
        transform: rotate(45deg) translate(5px, 5px);
    }
    
    .mobile-menu-toggle.active span:nth-child(2) {
        opacity: 0;
    }
    
    .mobile-menu-toggle.active span:last-child {
        transform: rotate(-45deg) translate(5px, -5px);
    }
`;
document.head.appendChild(style);

// Typing animation for hero text
const heroText = document.querySelector(".hero h1 .gradient-text");
if (heroText) {
  const text = heroText.textContent;
  heroText.textContent = "";
  let index = 0;

  function typeWriter() {
    if (index < text.length) {
      heroText.textContent += text.charAt(index);
      index++;
      setTimeout(typeWriter, 50);
    }
  }

  // Start typing after page load
  setTimeout(typeWriter, 500);
}

// Counter animation for stats
function animateCounter(element, target, duration = 2000) {
  const start = 0;
  const increment = target / (duration / 16);
  let current = start;

  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      element.textContent = target;
      clearInterval(timer);
    } else {
      element.textContent = Math.floor(current);
    }
  }, 16);
}

// Animate stats when they come into view
const statsObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting && !entry.target.classList.contains("animated")) {
      const statNumber = entry.target.querySelector(".stat-number");
      if (statNumber) {
        const target = parseInt(statNumber.textContent);
        animateCounter(statNumber, target);
        entry.target.classList.add("animated");
      }
    }
  });
}, observerOptions);

document.querySelectorAll(".stat").forEach((stat) => {
  statsObserver.observe(stat);
});

// Parallax effect removed to prevent overlay issues

// Add testimonial carousel functionality
let currentTestimonial = 0;
const testimonials = document.querySelectorAll(".testimonial-card");

function showTestimonial(index) {
  testimonials.forEach((testimonial, i) => {
    if (window.innerWidth <= 768) {
      testimonial.style.display = i === index ? "block" : "none";
    }
  });
}

function nextTestimonial() {
  currentTestimonial = (currentTestimonial + 1) % testimonials.length;
  showTestimonial(currentTestimonial);
}

// Auto-rotate testimonials on mobile
if (window.innerWidth <= 768) {
  setInterval(nextTestimonial, 5000);
  showTestimonial(0);
}

// Handle window resize
window.addEventListener("resize", () => {
  if (window.innerWidth > 768) {
    testimonials.forEach((testimonial) => {
      testimonial.style.display = "block";
    });
  } else {
    showTestimonial(currentTestimonial);
  }
});

// Add ripple effect to buttons
document
  .querySelectorAll(".btn-primary, .btn-large, .btn-plan")
  .forEach((button) => {
    button.addEventListener("click", function (e) {
      const ripple = document.createElement("span");
      ripple.classList.add("ripple");
      this.appendChild(ripple);

      const x = e.clientX - e.target.offsetLeft;
      const y = e.clientY - e.target.offsetTop;

      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;

      setTimeout(() => {
        ripple.remove();
      }, 600);
    });
  });

// Add ripple effect styles
const rippleStyle = document.createElement("style");
rippleStyle.textContent = `
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.5);
        transform: scale(0);
        animation: ripple-animation 0.6s ease-out;
        pointer-events: none;
    }
    
    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    button, .btn-primary, .btn-large, .btn-plan {
        position: relative;
        overflow: hidden;
    }
`;
document.head.appendChild(rippleStyle);

// Lazy loading for images
if ("IntersectionObserver" in window) {
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src || img.src;
        img.classList.add("loaded");
        observer.unobserve(img);
      }
    });
  });

  document.querySelectorAll("img").forEach((img) => {
    imageObserver.observe(img);
  });
}

// Performance monitoring
window.addEventListener("load", () => {
  if (window.performance) {
    const perfData = window.performance.timing;
    const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
    console.log(`Page load time: ${pageLoadTime}ms`);
  }
});

// Cookie consent (placeholder for GDPR compliance)
function showCookieConsent() {
  const consent = localStorage.getItem("cookieConsent");
  if (!consent) {
    // Create and show cookie consent banner using safe DOM methods (no innerHTML)
    const banner = document.createElement("div");
    banner.className = "cookie-consent";

    // Create paragraph with textContent (XSS-safe)
    const paragraph = document.createElement("p");
    paragraph.textContent =
      "We use cookies to enhance your experience. By continuing, you agree to our use of cookies.";

    // Create button with event listener (safer than onclick attribute)
    const button = document.createElement("button");
    button.textContent = "Accept";
    button.addEventListener("click", acceptCookies);

    banner.appendChild(paragraph);
    banner.appendChild(button);
    document.body.appendChild(banner);
  }
}

function acceptCookies() {
  localStorage.setItem("cookieConsent", "true");
  document.querySelector(".cookie-consent")?.remove();
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  // Show cookie consent after 2 seconds
  setTimeout(showCookieConsent, 2000);
});

// Make acceptCookies global
window.acceptCookies = acceptCookies;

// Video reset functionality
document.addEventListener("DOMContentLoaded", () => {
  const demoVideo = document.querySelector(".demo-video-player");
  if (demoVideo) {
    demoVideo.addEventListener("ended", function () {
      this.currentTime = 0;
    });
  }
});

// Image Modal Functionality
document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("imageModal");
  const modalImg = document.getElementById("modalImage");
  const modalCaption = document.getElementById("modalCaption");
  const closeBtn = document.querySelector(".modal-close");

  // Add click handlers to all gallery images
  document.querySelectorAll(".gallery-item img").forEach((img) => {
    img.addEventListener("click", function () {
      modal.style.display = "block";
      modalImg.src = this.src;
      modalCaption.textContent = this.alt;
    });
  });

  // Close modal when clicking X
  closeBtn.addEventListener("click", () => {
    modal.style.display = "none";
  });

  // Close modal when clicking outside image
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.style.display = "none";
    }
  });

  // Close modal with Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.style.display === "block") {
      modal.style.display = "none";
    }
  });
});
