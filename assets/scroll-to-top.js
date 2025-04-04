class ScrollToTopButton extends HTMLElement {
  constructor() {
    super();

    // Toggle the 'reveal' class based on scroll position
    this.classList.toggle('reveal', window.scrollY > window.innerHeight);

    window.addEventListener('scroll', () => {
      requestAnimationFrame(() => {
        this.classList.toggle('reveal', window.scrollY > window.innerHeight);
      });
    }, { passive: true });

    // Handle click event
    this.addEventListener('click', () => {
      this.scrollToTop();
    });

    // Handle Enter key event
    this.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        this.scrollToTop();
      }
    });
  }

  // Generic scroll-to-top function
  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Set a timeout to wait for the scroll to finish before focusing
    setTimeout(() => {
      document.querySelector('.skip-to-content-link')?.focus()
    }, 700);
  }
}

customElements.define('scroll-to-top-button', ScrollToTopButton);
