class CustomAccordion extends HTMLElement {
  constructor() {
    super();
    this.init();
  }

  init() {
    this.detailsElem = this.querySelector('details');
    this.summaryElem = this.querySelector('summary');
    this.container = this.summaryElem.nextElementSibling;
    this.oneAtATime = this.dataset.oneAtATime;

    if (window.getComputedStyle(this.container).transitionDuration !== '0s') {
      this.closeListener = this.handleDetailsClose.bind(this);
      this.clickListener = this.handleSummaryClick.bind(this)
      this.detailsElem.addEventListener('transitionend', this.closeListener);
      this.summaryElem.addEventListener('click', this.clickListener);
    }
  }

  reinit() {
    this.detailsElem.removeEventListener('transitionend', this.closeListener);
    this.summaryElem.removeEventListener('click', this.clickListener);
    this.init();
  }

  handleDetailsClose(evt, force) {
    if (force !== true && evt.target !== this.container) return;

    if (this.detailsElem.classList.contains('closing')) {
      this.detailsElem.open = false;
      this.detailsElem.classList.remove('closing');
    }

    this.container.removeAttribute('style');
  }

  close(preventAnimation) {
    if (this.detailsElem.open) {
      if (preventAnimation) {
        this.detailsElem.open = false;
      } else {
        this.container.style.height = `${this.container.scrollHeight}px`;
        this.detailsElem.classList.add('closing');
        requestAnimationFrame(() => this.container.style.height = '0');
        setTimeout(this.closeListener.bind(this, null, true), 450);
      }
    }
  }

  open(preventAnimation) {
    if (!this.detailsElem.open) {
      if (preventAnimation) {
        this.detailsElem.open = true;
      } else {
        this.container.style.height = '0';
        this.detailsElem.open = true;
        this.container.style.height = `${this.container.scrollHeight}px`;
        setTimeout(this.closeListener.bind(this, null, true), 450);
      }

      if (this.dataset.revealsImage) {
        const section = this.closest('.section');
        const image = section.querySelector(this.dataset.revealsImage);
        const currentImage = section.querySelector('.revealed-image.reveal');
        if (image) {
          if (currentImage) currentImage.classList.remove('reveal');
          image.classList.add('reveal');
        }
      }
    }
  }

  handleSummaryClick(evt) {
    evt.preventDefault();

    if (!this.detailsElem.open) {
      // Close existing accordions
      if (this.oneAtATime) {
        this.closest(this.oneAtATime).querySelectorAll('custom-accordion').forEach(customAccordion => {
          if (customAccordion.detailsElem.open) customAccordion.close();
        });
      }

      this.open();
    } else {
      this.close();
    }
  }
}

customElements.define('custom-accordion', CustomAccordion);

class DetailsDisclosure extends HTMLElement {
  constructor() {
    super();
    this.mainDetailsToggle = this.querySelector('details');
    this.summary = this.mainDetailsToggle.querySelector('summary');
    this.content = this.summary.nextElementSibling;

    this.mainDetailsToggle.addEventListener('focusout', this.onFocusOut.bind(this));
    this.mainDetailsToggle.addEventListener('toggle', this.onToggle.bind(this));
  }

  onFocusOut() {
    setTimeout(() => {
      if (!this.contains(document.activeElement)) this.close();
    });
  }

  onToggle() {
    if (!this.animations) this.animations = this.content.getAnimations();

    if (this.mainDetailsToggle.hasAttribute('open')) {
      this.animations.forEach((animation) => animation.play());
    } else {
      this.animations.forEach((animation) => animation.cancel());
    }
  }

  close() {
    this.mainDetailsToggle.removeAttribute('open');
    this.mainDetailsToggle.querySelector('summary').setAttribute('aria-expanded', false);
  }
}

customElements.define('details-disclosure', DetailsDisclosure);

class AccordionSearch extends HTMLElement {
  constructor() {
    super();
    this.section = this.closest('.section');
    this.accordionContainer = this.section.querySelector('.accordion-container');

    this.addEventListener('keyup', this.onKeyUp.bind(this));
  }

  onKeyUp(evt) {
    let hiddenFields = 0;
    let shownFields = 0;
    let isFirst = true;

    const noMatches = this.accordionContainer.querySelector('.no-matches');
    if (noMatches) noMatches.remove();

    this.section.querySelectorAll('.accordion').forEach(searchableBlock => {
      if (searchableBlock.textContent.trim().toLowerCase().includes(evt.target.value.toLowerCase())) {
        searchableBlock.removeAttribute('aria-hidden');
        shownFields++;

        if (isFirst) {
          searchableBlock.querySelector('custom-accordion').open(true);
          searchableBlock.classList.add('first-accordion');
          isFirst = false;
        } else {
          searchableBlock.classList.remove('first-accordion');
          searchableBlock.querySelector('custom-accordion').close(true);
        }
      } else {
        searchableBlock.classList.remove('first-accordion');
        searchableBlock.querySelector('custom-accordion').close(true);
        searchableBlock.setAttribute('aria-hidden', 'true');
        hiddenFields++;
      }
    });

    if (hiddenFields === 0) {
      this.section.querySelectorAll('.accordion').forEach(searchableBlock => searchableBlock.classList.remove('first-accordion'));
    }

    if (shownFields === 0) {
      this.accordionContainer.innerHTML += `<p class="no-matches mb-0 mt-0 t1">${window.strings.sections.collapsibleRows.noResults}</p>`;
    }

    this.section.querySelectorAll('.collapsible-content__heading,.collapsible-content__text,.collapsible-content__spacer').forEach(elem => {
      elem.classList.toggle('hidden', hiddenFields > 0);
    });
  }
}

customElements.define('accordion-search', AccordionSearch);

class HeaderMenu extends DetailsDisclosure {
  constructor() {
    super();
    this.header = document.querySelector('.header-wrapper');

    if (Shopify.designMode) {
      this.blockSelectHandler = this.blockSelectHandler || this.onBlockSelect.bind(this);
      this.blockDeselectHandler = this.blockDeselectHandler || this.onBlockDeselect.bind(this);
      document.addEventListener('shopify:block:select', this.blockSelectHandler);
      document.addEventListener('shopify:block:deselect', this.blockDeselectHandler);
    }

    if (window.matchMedia('(hover: hover)').matches && this.header) {
      this.mouseEnterHandler = this.onMouseEnter.bind(this);
      this.mouseLeaveHandler = this.onMouseLeave.bind(this);
      this.mouseLeaveSummaryHandler = this.onMouseLeaveSummary.bind(this);
      this.mouseOverSummaryHandler = this.onMouseOverSummary.bind(this);
      this.addEventListener('mouseenter', this.mouseEnterHandler);
      this.addEventListener('mouseleave', this.mouseLeaveHandler);
      this.summary.addEventListener('mouseleave', this.mouseLeaveSummaryHandler);
      this.summary.addEventListener('mouseover', this.mouseOverSummaryHandler);
    }
  }

  disconnectedCallback() {
    if (Shopify.designMode) {
      document.removeEventListener('shopify:block:select', this.blockSelectHandler);
      document.removeEventListener('shopify:block:deselect', this.blockDeselectHandler);
    }

    if (this.mouseEnterHandler) {
      this.removeEventListener('mouseenter', this.mouseEnterHandler);
      this.removeEventListener('mouseleave', this.mouseLeaveHandler);
      this.summary.removeEventListener('mouseleave', this.mouseLeaveSummaryHandler);
      this.summary.removeEventListener('mouseover', this.mouseOverSummaryHandler);
    }
  }

  onBlockSelect(evt) {
    const closestHeaderMenu = evt.target.closest('header-menu');
    if (closestHeaderMenu === this && this.mainDetailsToggle.open === false) {
      this.summary.click();
      this.preventHoverClose = true;
      document.querySelector('.drawer-menu--on-scroll')?.classList.add('drawer-menu--on-scroll--paused');
    }
  }

  onBlockDeselect(evt) {
    const closestHeaderMenu = evt.target.closest('header-menu');
    if (closestHeaderMenu === this && this.mainDetailsToggle.open) {
      this.summary.click();
      this.preventHoverClose = false;
    }
    document.querySelector('.drawer-menu--on-scroll')?.classList.remove('drawer-menu--on-scroll--paused');
  }

  closeAnyOpenMegaMenus() {
    this.header.querySelectorAll('.mega-menu[open]').forEach(megaMenu => {
      const headerMenu = megaMenu.closest('header-menu');
      if (headerMenu) headerMenu.summary.click();
    });
    document.querySelector('.drawer-menu--on-scroll')?.classList.remove('drawer-menu--on-scroll--paused');
  }

  onMouseEnter() {
    window.menuHoverIntentDelay = typeof window.menuHoverIntentDelay === undefined ? 100 : window.menuHoverIntentDelay;

    this.hoverIntentTimer = setTimeout(() => {
      window.menuHoverIntentDelay = 0;

      if (this.mainDetailsToggle.open === false) {
        this.closeAnyOpenMegaMenus();
        this.classList.add('open');
        this.style.setProperty('--link-end',
          `${Number.parseInt(this.offsetTop + this.getBoundingClientRect().height) - 1}px`);
        this.style.setProperty('--header-zindex', '1');
        this.summary.click();
      }
    }, window.menuHoverIntentDelay);
  }

  onMouseLeave() {
    clearTimeout(this.hoverIntentTimer);

    if (this.mainDetailsToggle.open && !this.preventHoverClose) {
      this.classList.remove('open');
      this.summary.click();
    }
  }

  onMouseLeaveSummary() {
    this.mouseOverSummary = false;
    setTimeout(() => {
      if (!this.mouseOverSummary) {
        this.style.setProperty('--header-zindex', '0');
      }
    }, 300);
  }

  onMouseOverSummary() {
    this.mouseOverSummary = true;
  }

  onToggle() {
    if (!this.header) return;
    this.header.preventHide = this.mainDetailsToggle.open;

    if (document.documentElement.style.getPropertyValue('--header-bottom-position-desktop') !== '') return;
    document.documentElement.style.setProperty(
      '--header-bottom-position-desktop',
      `${Math.floor(this.header.getBoundingClientRect().bottom)}px`
    );
  }
}

customElements.define('header-menu', HeaderMenu);
