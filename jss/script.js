// script.js
// Smooth scroll for nav links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

// Form submission feedback (Note: Formspree handles actual submission; this is just for user feedback)
document.querySelector('form').addEventListener('submit', function (e) {
    // Optional: Add custom validation or processing here if needed
    alert('Thank you for your message! I will get back to you soon.');
});

// Add any additional JavaScript functionality here