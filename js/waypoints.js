document.addEventListener('DOMContentLoaded', () => {
  const sections = document.querySelectorAll('#scrolly-container .scrolly-section');
  const revealCards = document.querySelectorAll('.reveal-card');

  if (sections.length) {
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle('active', entry.isIntersecting);
        });
      },
      { threshold: 0.35 }
    );

    sections.forEach((section) => sectionObserver.observe(section));
  }

  if (revealCards.length) {
    const cardObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle('is-visible', entry.isIntersecting);
        });
      },
      { threshold: 0.2 }
    );

    revealCards.forEach((card) => cardObserver.observe(card));
  }
});
