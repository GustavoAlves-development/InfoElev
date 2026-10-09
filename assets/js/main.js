document.addEventListener("DOMContentLoaded", () => {
  // Scroll-reveal animations
  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("active");
          obs.unobserve(entry.target);
        }
      });
    },
    { root: null, rootMargin: "0px", threshold: 0.12 }
  );
  document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

  // Nav shadow/background on scroll
  const nav = document.querySelector(".site-nav");
  if (nav) {
    const toggleNavState = () => {
      nav.classList.toggle("is-scrolled", window.scrollY > 12);
    };
    toggleNavState();
    window.addEventListener("scroll", toggleNavState, { passive: true });
  }

  // Mobile menu toggle
  const menuToggle = document.querySelector(".menu-toggle");
  const mobileNav = document.querySelector(".mobile-nav");
  if (menuToggle && mobileNav) {
    menuToggle.addEventListener("click", () => {
      mobileNav.classList.toggle("is-open");
    });
    mobileNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => mobileNav.classList.remove("is-open"));
    });
  }

  // FAQ accordion
  document.querySelectorAll(".faq-item").forEach((item) => {
    const question = item.querySelector(".faq-question");
    if (!question) return;
    question.addEventListener("click", () => {
      const isOpen = item.classList.contains("is-open");
      item.closest(".faq-list")?.querySelectorAll(".faq-item").forEach((other) => {
        other.classList.remove("is-open");
      });
      if (!isOpen) item.classList.add("is-open");
    });
  });

  // Contact form (no backend wired up yet)
  const contactForm = document.querySelector("#contact-form");
  if (contactForm) {
    contactForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const note = document.querySelector("#contact-form-note");
      if (note) {
        note.textContent =
          "Thanks! Our contact channel is being finalized — please reach out directly once our support email is published on this page.";
      }
    });
  }
});
