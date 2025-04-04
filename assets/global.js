function getFocusableElements(container) {
  return Array.from(
    container.querySelectorAll(
      "summary, a[href], button:enabled, [tabindex]:not([tabindex^='-']), [draggable], area, input:not([type=hidden]):enabled, select:enabled, textarea:enabled, object, iframe"
    )
  );
}

document.querySelectorAll('[id^="Details-"] summary').forEach((summary) => {
  summary.setAttribute('role', 'button');
  summary.setAttribute('aria-expanded', summary.parentNode.hasAttribute('open'));

  if (summary.nextElementSibling.getAttribute('id')) {
    summary.setAttribute('aria-controls', summary.nextElementSibling.id);
  }

  summary.addEventListener('click', (event) => {
    event.currentTarget.setAttribute('aria-expanded', !event.currentTarget.closest('details').hasAttribute('open'));
  });

  if (summary.closest('header-drawer, menu-drawer')) return;
  summary.parentElement.addEventListener('keyup', onKeyUpEscape);
});

const trapFocusHandlers = {};

function trapFocus(container, elementToFocus = container, lastElement) {
  var elements = getFocusableElements(container);
  var first = elements[0];
  var last = lastElement || elements[elements.length - 1];

  removeTrapFocus();

  trapFocusHandlers.focusin = (event) => {
    if (event.target !== container && event.target !== last && event.target !== first) return;

    document.addEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.focusout = function () {
    document.removeEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.keydown = function (event) {
    if (event.code.toUpperCase() !== 'TAB') return; // If not TAB key
    // On the last focusable element and tab forward, focus the first element.
    if (event.target === last && !event.shiftKey) {
      event.preventDefault();
      first.focus();
    }

    //  On the first focusable element and tab backward, focus the last element.
    if ((event.target === container || event.target === first) && event.shiftKey) {
      event.preventDefault();
      last.focus();
    }
  };

  document.addEventListener('focusout', trapFocusHandlers.focusout);
  document.addEventListener('focusin', trapFocusHandlers.focusin);

  if (elementToFocus) {
    setTimeout(() => {
      elementToFocus.focus();

      if (
        elementToFocus.tagName === 'INPUT' &&
        ['search', 'text', 'email', 'url'].includes(elementToFocus.type) &&
        elementToFocus.value
      ) {
        elementToFocus.setSelectionRange(0, elementToFocus.value.length);
      }
    }, 300);
  }
}

// Here run the querySelector to figure out if the browser supports :focus-visible or not and run code based on it.
try {
  document.querySelector(':focus-visible');
} catch (e) {
  focusVisiblePolyfill();
}

function focusVisiblePolyfill() {
  const navKeys = [
    'ARROWUP',
    'ARROWDOWN',
    'ARROWLEFT',
    'ARROWRIGHT',
    'TAB',
    'ENTER',
    'SPACE',
    'ESCAPE',
    'HOME',
    'END',
    'PAGEUP',
    'PAGEDOWN',
  ];
  let currentFocusedElement = null;
  let mouseClick = null;

  window.addEventListener('keydown', (event) => {
    if (navKeys.includes(event.code.toUpperCase())) {
      mouseClick = false;
    }
  });

  window.addEventListener('mousedown', (event) => {
    mouseClick = true;
  });

  window.addEventListener(
    'focus',
    () => {
      if (currentFocusedElement) currentFocusedElement.classList.remove('focused');

      if (mouseClick) return;

      currentFocusedElement = document.activeElement;
      currentFocusedElement.classList.add('focused');
    },
    true
  );
}

function pauseAllMedia() {
  document.querySelectorAll('.js-youtube:not(.js-video-background)').forEach((video) => {
    video.contentWindow.postMessage('{"event":"command","func":"' + 'pauseVideo' + '","args":""}', '*');
  });
  document.querySelectorAll('.js-vimeo:not(.js-video-background)').forEach((video) => {
    video.contentWindow.postMessage('{"method":"pause"}', '*');
  });
  document.querySelectorAll('video:not(.js-video-background)').forEach((video) => video.pause());
  document.querySelectorAll('product-model').forEach((model) => {
    if (model.modelViewerUI) model.modelViewerUI.pause();
  });
}

// Load <template> content if needed
function loadTemplateContent(elem) {
  elem.querySelectorAll('template.deferred').forEach(template => {
    if (template?.content?.childNodes) {
      // Create a DocumentFragment to hold the template content
      const fragment = document.createDocumentFragment();

      // Append all child nodes of the template content to the DocumentFragment
      while (template.content.firstChild) {
        fragment.appendChild(template.content.firstChild);
      }

      // Insert the DocumentFragment after the <template> tag
      template.parentNode.insertBefore(fragment, template.nextSibling);

      // Remove the <template> element
      template.remove();
    }
  });
}

function removeTrapFocus(elementToFocus = null) {
  document.removeEventListener('focusin', trapFocusHandlers.focusin);
  document.removeEventListener('focusout', trapFocusHandlers.focusout);
  document.removeEventListener('keydown', trapFocusHandlers.keydown);

  if (elementToFocus) elementToFocus.focus();
}

function onKeyUpEscape(event) {
  if (event.code.toUpperCase() !== 'ESCAPE') return;

  const openDetailsElement = event.target.closest('details[open]');
  if (!openDetailsElement) return;

  const summaryElement = openDetailsElement.querySelector('summary');
  openDetailsElement.removeAttribute('open');
  summaryElement.setAttribute('aria-expanded', false);
  summaryElement.focus();
}

class QuantityInput extends HTMLElement {
  constructor() {
    super();
    this.input = this.querySelector('input');
    this.changeEvent = new Event('change', { bubbles: true });
    this.input.addEventListener('change', this.onInputChange.bind(this));
    this.querySelectorAll('button').forEach((button) =>
      button.addEventListener('click', this.onButtonClick.bind(this))
    );
  }

  quantityUpdateUnsubscriber = undefined;

  connectedCallback() {
    this.validateQtyRules();
    this.quantityUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.quantityUpdate, this.validateQtyRules.bind(this));
  }

  disconnectedCallback() {
    if (this.quantityUpdateUnsubscriber) {
      this.quantityUpdateUnsubscriber();
    }
  }

  onInputChange(event) {
    this.validateQtyRules();
  }

  onButtonClick(event) {
    event.preventDefault();
    const previousValue = this.input.value;

    if (event.target.name === 'plus') {
      if (parseInt(this.input.dataset.min) > parseInt(this.input.step) && this.input.value == 0) {
        this.input.value = this.input.dataset.min;
      } else {
        this.input.stepUp();
      }
    } else {
      this.input.stepDown();
    }

    if (previousValue !== this.input.value) this.input.dispatchEvent(this.changeEvent);

    if (this.input.dataset.min === previousValue && event.target.name === 'minus') {
      this.input.value = parseInt(this.input.min);
    }
  }

  validateQtyRules() {
    const value = parseInt(this.input.value);
    if (this.input.min) {
      const buttonMinus = this.querySelector(".quantity__button[name='minus']");
      buttonMinus.classList.toggle('disabled', parseInt(value) <= parseInt(this.input.min));
    }
    if (this.input.max) {
      const max = parseInt(this.input.max);
      const buttonPlus = this.querySelector(".quantity__button[name='plus']");
      buttonPlus.classList.toggle('disabled', value >= max);
    }
  }
}

customElements.define('quantity-input', QuantityInput);

window.sectionInstances = new WeakMap();

function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

function throttle(fn, delay) {
  let lastCall = 0;
  return function (...args) {
    const now = new Date().getTime();
    if (now - lastCall < delay) {
      return;
    }
    lastCall = now;
    return fn(...args);
  };
}

function fetchConfig(type = 'json') {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: `application/${type}` },
  };
}

/*
 * Shopify Common JS
 *
 */
if (typeof window.Shopify == 'undefined') {
  window.Shopify = {};
}

Shopify.bind = function (fn, scope) {
  return function () {
    return fn.apply(scope, arguments);
  };
};

Shopify.setSelectorByValue = function (selector, value) {
  for (var i = 0, count = selector.options.length; i < count; i++) {
    var option = selector.options[i];
    if (value == option.value || value == option.innerHTML) {
      selector.selectedIndex = i;
      return i;
    }
  }
};

Shopify.addListener = function (target, eventName, callback) {
  target.addEventListener
    ? target.addEventListener(eventName, callback, false)
    : target.attachEvent('on' + eventName, callback);
};

Shopify.postLink = function (path, options) {
  options = options || {};
  var method = options['method'] || 'post';
  var params = options['parameters'] || {};

  var form = document.createElement('form');
  form.setAttribute('method', method);
  form.setAttribute('action', path);

  for (var key in params) {
    var hiddenField = document.createElement('input');
    hiddenField.setAttribute('type', 'hidden');
    hiddenField.setAttribute('name', key);
    hiddenField.setAttribute('value', params[key]);
    form.appendChild(hiddenField);
  }
  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
};

Shopify.CountryProvinceSelector = function (country_domid, province_domid, options) {
  this.countryEl = document.getElementById(country_domid);
  this.provinceEl = document.getElementById(province_domid);
  this.provinceContainer = document.getElementById(options['hideElement'] || province_domid);

  Shopify.addListener(this.countryEl, 'change', Shopify.bind(this.countryHandler, this));

  this.initCountry();
  this.initProvince();
};

Shopify.CountryProvinceSelector.prototype = {
  initCountry: function () {
    var value = this.countryEl.getAttribute('data-default');
    Shopify.setSelectorByValue(this.countryEl, value);
    this.countryHandler();
  },

  initProvince: function () {
    var value = this.provinceEl.getAttribute('data-default');
    if (value && this.provinceEl.options.length > 0) {
      Shopify.setSelectorByValue(this.provinceEl, value);
    }
  },

  countryHandler: function (e) {
    var opt = this.countryEl.options[this.countryEl.selectedIndex];
    var raw = opt.getAttribute('data-provinces');
    var provinces = JSON.parse(raw);

    this.clearOptions(this.provinceEl);
    if (provinces && provinces.length == 0) {
      this.provinceContainer.style.display = 'none';
    } else {
      for (var i = 0; i < provinces.length; i++) {
        var opt = document.createElement('option');
        opt.value = provinces[i][0];
        opt.innerHTML = provinces[i][1];
        this.provinceEl.appendChild(opt);
      }

      this.provinceContainer.style.display = '';
    }
  },

  clearOptions: function (selector) {
    while (selector.firstChild) {
      selector.removeChild(selector.firstChild);
    }
  },

  setOptions: function (selector, values) {
    for (var i = 0, count = values.length; i < values.length; i++) {
      var opt = document.createElement('option');
      opt.value = values[i];
      opt.innerHTML = values[i];
      selector.appendChild(opt);
    }
  },
};

class MenuDrawer extends HTMLElement {
  constructor() {
    super();

    this.mainDetailsToggle = this.querySelector('details');

    this.addEventListener('keyup', this.onKeyUp.bind(this));
    this.addEventListener('focusout', this.onFocusOut.bind(this));

    document.addEventListener('shopify:section:load', () => {
      this.mainDetailsToggle.classList.remove('menu-opening');
      document.body.classList.remove(`overflow-hidden`);
    });

    this.bindEvents();
  }

  bindEvents() {
    this.querySelectorAll('summary').forEach((summary) =>
      summary.addEventListener('click', this.onSummaryClick.bind(this))
    );
  }

  onKeyUp(event) {
    if (event.code.toUpperCase() !== 'ESCAPE') return;

    const openDetailsElement = event.target.closest('details[open]');
    if (!openDetailsElement) return;

    openDetailsElement === this.mainDetailsToggle
      ? this.closeMenuDrawer(event, this.mainDetailsToggle.querySelector('summary'))
      : this.closeSubmenu(openDetailsElement);
  }

  onSummaryClick(event) {
    const summaryElement = event.currentTarget;
    const detailsElement = summaryElement.parentNode;
    const parentMenuElement = detailsElement.closest('.has-submenu');
    const isOpen = detailsElement.hasAttribute('open');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function addTrapFocus() {
      const menuDrawer = summaryElement.closest('#menu-drawer');
      if (menuDrawer) {
        // Designate the very last 'summary' element within the last <li> to be the last element. This should trigger focus to wrap round to the beginning again
        const lastLi = summaryElement.nextElementSibling.querySelector('.menu-drawer__inner-submenu > .menu-drawer__menu > li:last-child');
        trapFocus(summaryElement.nextElementSibling, detailsElement.querySelector('button'), lastLi?.querySelector('summary'));
      }

      summaryElement.nextElementSibling.removeEventListener('transitionend', addTrapFocus);
    }

    if (detailsElement === this.mainDetailsToggle) {
      if (isOpen) event.preventDefault();
      isOpen ? this.closeMenuDrawer(event, summaryElement) : this.openMenuDrawer(summaryElement);

      if (window.matchMedia('(max-width: 990px)')) {
        document.documentElement.style.setProperty('--viewport-height', `${window.innerHeight}px`);
      }
    } else {
      setTimeout(() => {
        detailsElement.classList.add('menu-opening');
        summaryElement.setAttribute('aria-expanded', true);
        parentMenuElement && parentMenuElement.classList.add('submenu-open');
        !reducedMotion || reducedMotion.matches ? addTrapFocus() : summaryElement.nextElementSibling.addEventListener('transitionend', addTrapFocus);
      }, 100);
    }
  }

  openMenuDrawer(summaryElement) {
    setTimeout(() => {
      this.mainDetailsToggle.classList.add('menu-opening');
    });
    summaryElement.setAttribute('aria-expanded', true);
    trapFocus(this.mainDetailsToggle, summaryElement);
    document.body.classList.add(`overflow-hidden`);
  }

  closeMenuDrawer(event, elementToFocus = false) {
    if (event === undefined) return;

    this.mainDetailsToggle.classList.remove('menu-opening');

    document.body.classList.remove(`overflow-hidden`);
    removeTrapFocus(elementToFocus);
    this.closeAnimation(this.mainDetailsToggle);

    if (event instanceof KeyboardEvent) elementToFocus?.setAttribute('aria-expanded', false);
  }

  onFocusOut() {
    setTimeout(() => {
      if (this.mainDetailsToggle.hasAttribute('open') && !this.mainDetailsToggle.contains(document.activeElement))
        this.closeMenuDrawer();
    });
  }

  onCloseButtonClick(event) {
    const detailsElement = event.currentTarget.closest('details');
    if (detailsElement.classList.contains('menu-drawer-container')) {
      this.mainDetailsToggle.querySelector('summary').click();
    } else {
      this.closeSubmenu(detailsElement);
    }
  }

  closeSubmenu(detailsElement) {
    const parentMenuElement = detailsElement.closest('.submenu-open');
    parentMenuElement && parentMenuElement.classList.remove('submenu-open');
    detailsElement.classList.remove('menu-opening');
    detailsElement.querySelector('summary').setAttribute('aria-expanded', false);
    removeTrapFocus(detailsElement.querySelector('summary'));

    this.closeAnimation(detailsElement);
  }

  closeAnimation(detailsElement) {
    let animationStart;

    const handleAnimation = (time) => {
      if (animationStart === undefined) {
        animationStart = time;
      }

      const elapsedTime = time - animationStart;

      if (elapsedTime < 400) {
        window.requestAnimationFrame(handleAnimation);
      } else {
        detailsElement.removeAttribute('open');
        const closestDetails = detailsElement.closest('details[open]');
        if (closestDetails) {

          if (closestDetails.matches('.js-header-drawer-sub')) {
            // Designate the very last 'summary' element within the last <li> to be the last element. This should trigger focus to wrap round to the beginning again
            const lastLi = closestDetails.querySelector('.menu-drawer__inner-submenu > .menu-drawer__menu > li:last-child');
            trapFocus(closestDetails.querySelector('summary').nextElementSibling, detailsElement.querySelector('summary'), lastLi?.querySelector('summary'));

          } else if (closestDetails.matches('.js-header-drawer-main')) {
            const menuDrawer = document.getElementById('menu-drawer');
            const menuDrawerDisclosure = menuDrawer.querySelector('header-drawer .disclosure__button');
            trapFocus(menuDrawer, detailsElement.querySelector('summary'), menuDrawerDisclosure);

          } else {
            trapFocus(closestDetails, detailsElement.querySelector('summary'));
          }
        }
      }
    };

    window.requestAnimationFrame(handleAnimation);
  }
}

customElements.define('menu-drawer', MenuDrawer);

class HeaderDrawer extends MenuDrawer {
  constructor() {
    super();
  }

  bindEvents() {
    super.bindEvents();
    this.querySelectorAll(
      'button:not(.localization-selector):not(.country-selector__close-button):not(.country-filter__reset-button)'
    ).forEach((button) => button.addEventListener('click', this.onCloseButtonClick.bind(this))
    );
  }

  openMenuDrawer(summaryElement) {
    this.header = this.header || document.querySelector('.section-header');
    this.borderOffset =
      this.borderOffset || this.closest('.header-wrapper').classList.contains('header-wrapper--border-bottom') ? 1 : 0;
    document.documentElement.style.setProperty(
      '--header-bottom-position',
      `${parseInt(this.header.getBoundingClientRect().bottom - this.borderOffset)}px`
    );
    this.header.classList.add('menu-open');

    setTimeout(() => {
      this.mainDetailsToggle.classList.add('menu-opening');
    });

    summaryElement.setAttribute('aria-expanded', true);
    window.addEventListener('resize', this.onResize);
    const menuDrawerDisclosure = this.header.querySelector('header-drawer .disclosure__button')
    trapFocus(document.getElementById('menu-drawer'), summaryElement, menuDrawerDisclosure);
    document.body.classList.add(`overflow-hidden`);
  }

  closeMenuDrawer(event, elementToFocus) {
    if (!elementToFocus) return;
    super.closeMenuDrawer(event, elementToFocus);
    this.header.classList.remove('menu-open');
    window.removeEventListener('resize', this.onResize);
    event.target.setAttribute('aria-expanded', false);
  }

  onResize = () => {
    this.header &&
      document.documentElement.style.setProperty(
        '--header-bottom-position',
        `${parseInt(this.header.getBoundingClientRect().bottom - this.borderOffset)}px`
      );
    document.documentElement.style.setProperty('--viewport-height', `${window.innerHeight}px`);
  };
}

customElements.define('header-drawer', HeaderDrawer);

class CustomNav extends HTMLElement {
  constructor() {
    super();
    if (window.matchMedia('(hover: hover)').matches) {
      this.listMenu = this.querySelector('.list-menu');
      if (this.listMenu) {
        this.mouseLeaveMenuHandler = this.onMouseMenuLeave.bind(this);
        this.listMenu.addEventListener('mouseleave', this.mouseLeaveMenuHandler);
      }
    }
  }

  disconnectedCallback() {
    if (this.listMenu && this.mouseLeaveMenuHandler) {
      this.listMenu.removeEventListener('mouseleave', this.mouseLeaveMenuHandler);
    }
  }

  onMouseMenuLeave() {
    window.menuHoverIntentDelay = 50;
  }
}

customElements.define('custom-nav', CustomNav);

class ModalDialog extends HTMLElement {
  constructor() {
    super();
    const modalClose = this.querySelector('[id^="ModalClose-"]');
    if (modalClose) modalClose.addEventListener('click', this.hide.bind(this, false));

    this.querySelectorAll('[data-modal-close]').forEach(close => {
      close.addEventListener('click', this.hide.bind(this, false));
    });

    if (!this.dataset.preventClose) {
      this.addEventListener('keyup', (event) => {
        if (event.code.toUpperCase() === 'ESCAPE') this.hide();
      });

      if (this.classList.contains('media-modal')) {
        this.addEventListener('pointerup', (event) => {
          if (event.pointerType === 'mouse' && !event.target.closest('deferred-media, product-model')) this.hide();
        });
      } else {
        this.addEventListener('click', (event) => {
          if (event.target === this) this.hide();
        });
      }
    }

    window.addEventListener('browserIsVeryIdle', () => {
      window.loadTemplateContent(this);
    });
  }

  connectedCallback() {
    if (this.moved) return;
    window.requestAnimationFrame(() => {
      const noMove = this.closest('.shopify-section.no-move');
      if (!noMove) {
        this.moved = true;
        document.body.appendChild(this);
      }
    });
  }

  show(opener) {
    window.loadTemplateContent(this);

    if (this.dataset.isAlert) {
      this.setAttribute('open', '');
    } else {
      if (opener) this.openedBy = opener;
      const popup = this.querySelector('.template-popup');
      document.body.classList.add('overflow-hidden');
      this.setAttribute('open', '');
      if (popup) popup.loadContent();
      trapFocus(this, this.querySelector('[role="dialog"]'));
      window.pauseAllMedia();
    }

    if (this.classList.contains('quick-add-modal')) {
      publish('quick-buy-action-complete');
    }
  }

  hide(preventAnimation) {
    const doHide = () => {
      if (!this.dataset.isAlert) {
        this.setAttribute('open', '');
        document.body.classList.remove('overflow-hidden');
        if (this.openedBy) removeTrapFocus(this.openedBy);
        window.pauseAllMedia();
      }

      document.body.dispatchEvent(new CustomEvent('modalClosed'));
      this.removeAttribute('open');
      this.classList.remove('popup-modal--closing');
    }

    if (preventAnimation) {
      doHide();
    } else {
      this.classList.add('popup-modal--closing');
      setTimeout(doHide, 320);
    }
  }
}
customElements.define('modal-dialog', ModalDialog);

class ProductCard extends HTMLElement {
  constructor() {
    super();

    this.mouseEnterHandler = this.mouseEnterHandler || this.handleMouseEnter.bind(this);
    this.showSwatchHandler = this.showSwatchHandler || this.showSwatchImage.bind(this);
    this.hideSwatchHandler = this.hideSwatchHandler || this.hideSwatchImage.bind(this);
    this.hoverButtonHandler = this.hoverButtonHandler || this.clickHoverButton.bind(this);

    this.swatchesPreloaded = false;
    this.hasSwatches = this.querySelector('.swatch[data-variant-media]') !== null;

    this.hoverButton = this.querySelector('.card__hover-button');
  }

  connectedCallback() {
    if (this.hoverButton) {
      this.hoverButton.addEventListener('click', this.hoverButtonHandler);
    }

    if (this.hasSwatches) {
      this.createSwatchHoverImage();
      this.addEventListener('mouseenter', this.mouseEnterHandler, { passive: true });
      this.addEventListener('mouseover', this.showSwatchHandler, { passive: true });
      this.addEventListener('mouseleave', this.hideSwatchHandler, { passive: true });

      // Add focus and blur events for keyboard navigation
      this.addEventListener('focusin', this.showSwatchHandler, { passive: true });
      this.addEventListener('focusout', this.hideSwatchHandler, { passive: true });

      // Add touchstart event for mobile interactions
      this.addEventListener('touchstart', this.showSwatchHandler, { passive: true });
    }
  }

  disconnectedCallback() {
    if (this.hoverButton) {
      this.hoverButton.removeEventListener('click', this.hoverButtonHandler);
    }

    if (this.hasSwatches) {
      this.removeEventListener('mouseenter', this.mouseEnterHandler);
      this.removeEventListener('mouseover', this.showSwatchHandler);
      this.removeEventListener('mouseleave', this.hideSwatchHandler);
      this.removeEventListener('focusin', this.showSwatchHandler);
      this.removeEventListener('focusout', this.hideSwatchHandler);
      this.removeEventListener('touchstart', this.showSwatchHandler);
    }
  }

  clickHoverButton() {
    this.hoverButton.setAttribute('aria-disabled', true);
    this.hoverButton.classList.add('loading');
    this.hoverButton.querySelector('.loading__spinner').classList.remove('hidden');

    document.addEventListener('quick-buy-action-complete', () => {
      this.hoverButton.removeAttribute('aria-disabled');
      this.hoverButton.classList.remove('loading');
      this.hoverButton.querySelector('.loading__spinner').classList.add('hidden');
    }, { once: true });

    const quickAddOpenButton = this.querySelector('modal-opener .quick-add__submit') || this.querySelector('product-form .quick-add__submit') || this.querySelector('quick-add-bulk .quantity__button-increase');
    quickAddOpenButton?.click();
  }

  createSwatchHoverImage() {
    // Create an empty img tag within .card__media div.media
    this.mediaContainer = this.querySelector('.card__media .media');
    if (this.mediaContainer) {
      // Find the first existing img in the container
      const existingImg = this.mediaContainer.querySelector('img');

      // Create a new img tag with the same class as the existing img
      this.swatchHoverImg = document.createElement('img');
      this.swatchHoverImg.className = existingImg ? existingImg.className : '';
      this.swatchHoverImg.style.display = 'none';
      this.swatchHoverImg.classList.add('swatch-hover-image');
      this.swatchHoverImg.alt = existingImg ? existingImg.alt : '';

      this.mediaContainer.appendChild(this.swatchHoverImg);
    }
  }

  handleMouseEnter(event) {
    // Preload swatch images when mouse first enters
    if (!this.swatchesPreloaded) this.preloadSwatchImages();
  }

  hideSwatchImage(event) {
    if (this.swatchHoverImg) {
      this.swatchHoverImg.style.display = 'none';
      this.swatchHoverImg.classList.remove('show-swatch-image');
    }
  }

  showSwatchImage(event) {
    if (event.target.matches('button.swatch[data-variant-media]')) {
      const imageUrl = event.target.dataset.variantMedia;
      if (imageUrl && this.swatchHoverImg) {
        this.swatchHoverImg.src = imageUrl;
        this.swatchHoverImg.style.display = 'block';
        this.swatchHoverImg.classList.add('show-swatch-image');
      }
    }
  }

  preloadSwatchImages() {
    const swatches = this.querySelectorAll('.swatch[data-variant-media]');
    swatches.forEach(swatch => {
      if (swatch.dataset.variantMedia) {
        const img = new Image();
        img.src = swatch.dataset.variantMedia;
      }
    });
    this.swatchesPreloaded = true;
  }
}

customElements.define('product-card', ProductCard);

class CustomPopup extends ModalDialog {
  constructor() {
    super();
    this.delaySeconds = parseInt(this.dataset.delaySeconds);

    if (Shopify.designMode) {
      document.addEventListener('shopify:section:select', (event) => {
        if (event.target === this.closest('.shopify-section')) {
          this.show();
        } else {
          this.hide(true);
        }
      });

      document.addEventListener('shopify:section:load', (event) => {
        if (event.target === this.closest('.shopify-section')) this.show();
      });

      document.addEventListener('shopify:section:deselect', () => {
        this.hide(true);
      });
    } else {
      if ((this.dataset.visibility === "mobile" && window.matchMedia('(max-width: 749px)').matches) ||
        (this.dataset.visibility === "desktop" && window.matchMedia('(min-width: 750px)').matches) ||
        (this.dataset.visibility === "both")) {

        const closedElements = JSON.parse(localStorage.getItem('theme-closed-elements')) || [];
        if (this.dataset.mode === "test" || !closedElements.includes(this.dataset.popupId)) {
          setTimeout(() => {
            this.show();

            if (this.dataset.autoClose && this.dataset.autoClose > 0) {
              setTimeout(() => {
                this.hide();
              }, this.dataset.autoClose * 1000);
            }
          }, this.delaySeconds * 1000);
        }
      }
    }

    // Age verifier 'no' button
    const ageVerifierNoButton = this.querySelector('.age_verifier__no-button');
    if (ageVerifierNoButton) {
      ageVerifierNoButton.addEventListener('click', (event) => {
        event.target.classList.add('no-active');
      });
    }
  }

  hide(preventAnimation) {
    if (!Shopify.designMode) {
      const closedElements = JSON.parse(localStorage.getItem('theme-closed-elements')) || [];
      if (!closedElements.includes(this.dataset.popupId)) {
        closedElements.push(this.dataset.popupId);
      }
      localStorage.setItem('theme-closed-elements', JSON.stringify(closedElements));
    }
    super.hide(preventAnimation);
  }
}

customElements.define('custom-popup', CustomPopup);

class ModalOpener extends HTMLElement {
  constructor() {
    super();

    const button = this.querySelector('button:not(.product__media-toggle-play)');

    if (!button) return;
    button.addEventListener('click', () => {
      const modal = document.querySelector(this.getAttribute('data-modal'));
      if (modal) modal.show(button);
    });
  }
}
customElements.define('modal-opener', ModalOpener);

class ScriptLoader {
  static loadedScripts = {};

  static loadScript(url, onloadCallback) {
    if (ScriptLoader.loadedScripts[url]) {
      return;
    }

    const scriptTag = document.createElement('script');
    scriptTag.src = url;

    if (onloadCallback && typeof onloadCallback === 'function') {
      scriptTag.onload = onloadCallback;
    }

    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(scriptTag, firstScriptTag);

    ScriptLoader.loadedScripts[url] = true;
  }
}

window.onYouTubeIframeAPIReady = () => {
  document.dispatchEvent(new CustomEvent('youtubeApiLoaded'));
}

class CustomVideo extends HTMLElement {
  constructor() {
    super();
    this.video = this.querySelector('.js-video');
    this.contentTimerElem = this.closest('[data-content-timer]');

    if (this.contentTimerElem) {
      if (this.closest('.banner--mobile-bottom') && window.matchMedia('(max-width: 749px)').matches) {
        // Show immediately if we're on mobile and text is below
        this.contentTimerElem.setAttribute('data-content-timer', 'show');
      } else {
        this.playTime = 0;
        this.timerCompleted = false;
        this.contentTimer = parseInt(this.contentTimerElem.dataset.contentTimer);
      }
    }

    if (this.video.classList.contains('js-youtube')) {
      this.type = 'youtube';
      this.aspectRatio = parseFloat(this.video.dataset.aspectRatio);
    } else if (this.video.classList.contains('js-vimeo')) {
      this.type = 'vimeo';
      this.aspectRatio = parseFloat(this.video.dataset.aspectRatio);
    } else {
      this.type = 'html5';
    }

    this.deferredMedia = this.closest('.deferred-media');
    this.playButton = this.closest('.section').querySelector('.deferred-media__poster-button');
    if (this.playButton) {
      this.playButton.addEventListener('click', this.playPause.bind(this));

      if (this.type === 'youtube' && document.body.classList.contains('tab-active')) {
        setTimeout(() => {
          const focusableElements = getFocusableElements(this.closest('.section'));
          if (focusableElements && focusableElements.length > 0) focusableElements[0].focus();
        }, 1000);
      }
    }
  }

  connectedCallback() {
    if (this.type === 'html5') {
      this.bindHtmlVideoListeners();
    } else if (this.type === 'youtube') {
      this.bindYoutubeVideoListeners();
    } else if (this.type === 'vimeo') {
      this.bindVimeoVideoListeners();
    }
  }

  scaleIframe() {
    const width = this.video.clientHeight * this.aspectRatio;
    const divisor = this.video.clientWidth > width ? this.video.clientWidth / width : width / this.video.clientWidth;
    const scale = (Math.ceil(divisor * 100) / 100) + 0.2;
    this.style.setProperty('--scale-factor', scale.toString());
  }

  playbackStarted() {
    this.deferredMedia.setAttribute('data-state', 'loaded');

    if (this.playButton) {
      this.playButton.setAttribute('data-state', 'playing');
    }

    if (this.contentTimer && !this.isTimedContent && !this.timerCompleted) {
      this.logInterval = setInterval(() => {
        if (this.isVideoPlaying) {
          this.playTime++;
          if (this.playTime >= this.contentTimer) {
            this.contentTimerElem.setAttribute('data-content-timer', 'show');
            this.timerCompleted = true;
            clearInterval(this.logInterval);
            this.isTimedContent = false;
          }
        }
      }, 1000);
      this.isTimedContent = true;
      this.isVideoPlaying = true;
    } else {
      this.isVideoPlaying = true;
    }
  }

  playbackPaused() {
    if (this.playButton) this.playButton.setAttribute('data-state', 'paused');
    if (this.contentTimer) this.isVideoPlaying = false;
  }

  playbackEnded() {
    if (this.playButton) this.playButton.setAttribute('data-state', 'ended');

    if (this.dataset.endState === 'pause_and_cover') {
      const stateElem = this.closest('[data-state]');
      if (stateElem) {
        stateElem.setAttribute('data-state', 'ended');
      }

    } else if (this.dataset.endState === 'loop') {
      this.playPause();
    }

    if (this.contentTimer) {
      clearInterval(this.logInterval);
      this.logInterval = null;
      this.isTimedContent = false;
    }
  }

  playPause() {
    if (this.type === 'html5') {
      if (this.video.paused) {
        this.video.play();
      } else {
        this.video.pause();
      }
    } else if (this.type === 'youtube') {
      const playerState = this.player.getPlayerState();
      if (playerState === YT.PlayerState.PLAYING) {
        this.player.pauseVideo();
      } else {
        this.player.playVideo();
      }
    } else if (this.type === 'vimeo') {
      this.player.getPaused().then((paused) => {
        if (paused) {
          this.player.play();
        } else {
          this.player.pause();
        }
      }).catch(function(error) {
        console.error('Error with Vimeo Player:', error);
      });
    }
  }

  bindHtmlVideoListeners() {
    setTimeout(this.playbackStarted.bind(this), 500);
    this.video.addEventListener('play', this.playbackStarted.bind(this));
    this.video.addEventListener('pause', this.playbackPaused.bind(this));
    this.video.addEventListener('ended', this.playbackEnded.bind(this));
  }

  bindYoutubeVideoListeners() {
    const initYoutubePlayer = () => {
      setTimeout(this.playbackStarted.bind(this), 500);

      this.player = new YT.Player(this.dataset.videoId, {
        events: {
          'onStateChange': (event) => {
            switch (event.data) {
              case YT.PlayerState.PLAYING:
                this.playbackStarted();
                break;
              case YT.PlayerState.PAUSED:
                this.playbackPaused();
                break;
              case YT.PlayerState.ENDED:
                this.playbackEnded();
                break;
            }
          }
        }
      });

      this.scaleIframe();
      window.addEventListener('resizeend', this.scaleIframe.bind(this));
    }

    if (typeof YT === 'undefined') {
      document.addEventListener('youtubeApiLoaded', initYoutubePlayer, { once: true });
      ScriptLoader.loadScript("https://www.youtube.com/iframe_api");
    } else {
      initYoutubePlayer();
    }
  }

  bindVimeoVideoListeners() {
    const initVimeoPlayer = () => {
      setTimeout(this.playbackStarted.bind(this), 500);
      this.player = new Vimeo.Player(this.dataset.videoId);
      this.player.on('play', this.playbackStarted.bind(this));
      this.player.on('pause', this.playbackPaused.bind(this));
      this.player.on('ended', this.playbackEnded.bind(this));
      this.scaleIframe();
      window.addEventListener('resizeend', this.scaleIframe.bind(this));
    }

    if (typeof Vimeo === 'undefined') {
      document.addEventListener('vimeoApiLoaded', initVimeoPlayer, { once: true });
      ScriptLoader.loadScript("https://player.vimeo.com/api/player.js", () => {
        document.dispatchEvent(new CustomEvent('vimeoApiLoaded'));
      });
    } else {
      initVimeoPlayer();
    }
  }
}

customElements.define('custom-video', CustomVideo);

class DeferredMedia extends HTMLElement {
  constructor() {
    super();
    const poster = this.querySelector('[id^="Deferred-Poster-"]');
    if (!poster) return;
    poster.addEventListener('click', this.loadContent.bind(this), { once: true });
  }

  loadContent(focus = true) {
    window.pauseAllMedia();
    if (!this.getAttribute('loaded')) {
      let content;

      if (this.tagName === "PRODUCT-MODEL") {
        content = document.createElement('div');
        content.appendChild(this.querySelector('template').content.firstElementChild.cloneNode(true));
      } else {
        content = this.querySelector('template').content.firstElementChild.cloneNode(true);
        this.appendChild(content);
      }

      this.setAttribute('loaded', true);

      const media = content.querySelector('video, model-viewer, iframe');
      if (media) {
        const deferredElement = this.appendChild(media);
        if (focus) deferredElement.focus();
        if (deferredElement.nodeName == 'VIDEO' && deferredElement.getAttribute('autoplay')) {
          // force autoplay for safari
          deferredElement.play();
        }
      }
    }
  }
}

customElements.define('deferred-media', DeferredMedia);

class SliderComponent extends HTMLElement {
  constructor() {
    super();
    this.slider = this.querySelector('[id^="Slider-"]');
    this.sliderItems = this.querySelectorAll('[id^="Slide-"]');
    this.enableSliderLooping = false;
    this.currentPageElement = this.querySelector('.slider-counter--current');
    this.pageTotalElement = this.querySelector('.slider-counter--total');
    this.prevButton = this.querySelector('button[name="previous"]');
    this.nextButton = this.querySelector('button[name="next"]');
    this.isStacked = this.slider.dataset.slideType === 'stacked';

    this.debouncedInitPages = debounce(this.initPages.bind(this), Shopify.designMode ? 200 : 0);

    this.scrollTrack = this.querySelector('.slider-scrollbar__track');
    this.scrollIndicator = this.querySelector('.slider-scrollbar__indicator');

    if (!this.slider) return;

    this.initPages();
    this.resizeObserver = new ResizeObserver(() => this.debouncedInitPages());
    this.resizeObserver.observe(this.slider);

    this.slider.addEventListener('scroll', this.update.bind(this), { passive: true });

    if (this.nextButton && this.prevButton) {
      this.prevButton.addEventListener('click', this.onButtonClick.bind(this));
      this.nextButton.addEventListener('click', this.onButtonClick.bind(this));
    }

    // Track scroll bar progress
    if (this.scrollTrack && this.scrollIndicator) {
      this.sliderScrollHandler = this.onSliderScroll.bind(this);
      this.slider.addEventListener('scroll', this.sliderScrollHandler, { passive: true });
      window.addEventListener('resize', this.sliderScrollHandler);
    }

    // Scroll bits
    if (this.scrollTrack && window.matchMedia('(pointer: fine)').matches) {
      this.sliderLeft = window.innerWidth - this.slider.getBoundingClientRect().right;
      if (!this.sliderLeft) {
        this.sliderLeft = (this.slider.clientWidth - this.slider.clientWidth) / 2;
      }

      this.sliderMousedownHandler = this.onSliderMouseDown.bind(this);
      this.sliderMousemoveHandler = this.onSliderMouseMove.bind(this);
      this.sliderMouseupHandler = this.onSliderMouseUp.bind(this);

      this.slider.addEventListener('mousedown', this.sliderMousedownHandler);
      this.slider.addEventListener('mouseup', this.sliderMouseupHandler);
      this.slider.addEventListener('mouseleave', this.sliderMouseupHandler);
      this.slider.addEventListener('mousemove', this.sliderMousemoveHandler);
      
      if (this.scrollIndicator) {
        this.scrollIndicatorLeft = window.innerWidth - this.scrollIndicator.getBoundingClientRect().right;
        if (!this.scrollIndicatorLeft) {
          this.scrollIndicatorLeft = (this.scrollIndicator.clientWidth - this.scrollIndicator.clientWidth) / 2;
        }

        this.scrollMultiplier = 100 / (100 - (100 / parseInt(this.scrollTrack.dataset.numSlides)));
        this.scrollIndicatorMousedownHandler = this.onScrollIndicatorMouseDown.bind(this);
        this.scrollIndicatorMousemoveHandler = this.onScrollIndicatorMouseMove.bind(this);
        this.scrollIndicatorMouseupHandler = this.onScrollIndicatorMouseUp.bind(this);

        this.scrollIndicator.addEventListener('mousedown', this.scrollIndicatorMousedownHandler);
        document.addEventListener('mouseup', this.scrollIndicatorMouseupHandler);
        document.addEventListener('mousemove', this.scrollIndicatorMousemoveHandler);
      }
    }

    if (this.isStacked) {
      // Bind touch listeners for swiping
      this.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: true} );
      this.addEventListener('touchmove', debounce(this.onTouchMove.bind(this), 200), { passive: true });

      // Watch for size change
      if (this.slider.dataset.slideMobile === 'true') {
        const _this = this;

        const updateMobileSlideSettings = function () {
          const isMobile = window.matchMedia('(max-width: 749px)').matches;
          if (isMobile) {
            if (_this.slider.dataset.slideType !== 'slide') {
              _this.isStacked = false;
              _this.oldSlideAnimation = _this.slider.dataset.slideAnimation;
              _this.oldSlideType = _this.slider.dataset.slideType;
              _this.slider.setAttribute('data-slide-animation', 'slide');
              _this.slider.setAttribute('data-slide-type', 'slide');
              _this.resetPages();
            }
          } else if (_this.slider.dataset.slideType === 'slide') {
            _this.isStacked = true;
            _this.slider.setAttribute('data-slide-animation', _this.oldSlideAnimation);
            _this.slider.setAttribute('data-slide-type', _this.oldSlideType);
            _this.resetPages();
          }
        }

        window.addEventListener('resizeend', updateMobileSlideSettings);
        updateMobileSlideSettings();
      }
    }

    // Load all images after a few seconds
    setTimeout(() => {
      this.querySelectorAll('.slideshow__media.hidden').forEach(media => { media.classList.remove('hidden'); });
    }, 4000);
  }

  disconnectedCallback(){
    if (this.resizeObserver) this.resizeObserver.disconnect();

    if (this.sliderScrollHandler) window.removeEventListener('resize', this.sliderScrollHandler);}

  /**
   * Scroll slider scroll
   */
  onSliderScroll() {
    if (!this.indicatorMousedown) {
      // Update the scroll indicator
      const scrollableWidth = this.slider.scrollWidth - this.slider.clientWidth;
      const scrollPosition = this.slider.scrollLeft;
      const scrollPercentage = scrollableWidth > 0 ? (scrollPosition / scrollableWidth) * 100 : 0;

      const maxLeft = this.scrollTrack.clientWidth -  this.scrollIndicator.clientWidth;
      const leftPosition = (scrollPercentage * maxLeft) / 100;
      this.scrollIndicator.style.left = `${leftPosition}px`;
    }
  }

  /**
   * Mouse down dragging the slider
   * @param event
   */
  onSliderMouseDown(event) {
    this.mousedown = true;
    this.slider.classList.add('drag-active');
    this.sliderScrollLeft = this.slider.scrollLeft;
    this.sliderX = event.pageX - this.sliderLeft;
  }

  /**
   * Mouse up from dragging the slider
   */
  onSliderMouseUp() {
    this.slider.classList.remove('is-dragging');
    this.mousedown = false;
  }

  /**
   * The slider is being dragged
   * @param event
   */
  onSliderMouseMove(event) {
    if (!this.mousedown) return;
    event.preventDefault();
    this.slider.classList.add('is-dragging');
    this.slider.scrollLeft = this.sliderScrollLeft - (event.pageX - this.sliderLeft - this.sliderX);
  }

  /**
   * Mouse down dragging the scroll indicator
   * @param event
   */
  onScrollIndicatorMouseDown(event) {
    document.body.classList.add('body-drag-active');
    this.slider.classList.add('drag-active');
    this.indicatorMousedown = true;
    this.scrollIndicatorScrollLeft = parseInt(this.scrollIndicator.style.left.replace('px', '')) || 0;
    this.scrollIndicatorX = event.pageX - this.scrollIndicatorLeft;
  }

  /**
   * Mouse up from dragging the  scroll indicator
   */
  onScrollIndicatorMouseUp() {
    document.body.classList.remove('body-drag-active');
    this.indicatorMousedown = false;
  }

  /**
   * The scroll indicator is being dragged
   * @param event
   */
  onScrollIndicatorMouseMove(event) {
    if (!this.indicatorMousedown) return;
    event.preventDefault();

    const left = this.scrollIndicatorScrollLeft +  (event.pageX - this.scrollIndicatorLeft - this.scrollIndicatorX);
    let actualLeft;
    if (left <= 0) {
      actualLeft = 0;
    } else if (left > (this.scrollTrack.clientWidth - this.scrollIndicator.clientWidth)) {
      actualLeft = this.scrollTrack.clientWidth - this.scrollIndicator.clientWidth;
    } else {
      actualLeft = left;
    }

    this.scrollIndicator.style.left = `${actualLeft}px`;

    // Get the % scroll complete
    const scrollableWidth = this.scrollTrack.clientWidth;
    const scrollPercentage = ((scrollableWidth > 0 ? (actualLeft / scrollableWidth) * 100 : 0) * this.scrollMultiplier);
    const scrollableSliderWidth = this.slider.scrollWidth - this.slider.clientWidth;
    this.slider.scrollLeft = (scrollableSliderWidth * scrollPercentage) / 100;
  }

  onTouchStart(event) {
    if (this.isStacked) this.touchStart = event.changedTouches[0].screenX;
  }

  onTouchMove(event) {
    if (this.isStacked && this.prevButton && this.nextButton) {
      if (event.changedTouches[0].screenX < this.touchStart - 100) this.nextButton.click();
      if (event.changedTouches[0].screenX > this.touchStart + 100) this.prevButton.click();
    } else {
      this.pause();
    }
  }

  initPages() {
    this.sliderItemsToShow = Array.from(this.sliderItems).filter((element) => element.clientWidth > 0);
    if (this.sliderItemsToShow.length < 2) return;

    if (this.isStacked) {
      this.slidesPerPage = 1;
    } else {
      this.sliderItemOffset = this.sliderItemsToShow[1].offsetLeft - this.sliderItemsToShow[0].offsetLeft;
      this.slidesPerPage = Math.floor(
        (this.slider.clientWidth - this.sliderItemsToShow[0].offsetLeft) / this.sliderItemOffset
      );
    }

    this.totalPages = this.sliderItemsToShow.length - this.slidesPerPage + 1;
    this.update();
  }

  resetPages() {
    this.sliderItems = this.querySelectorAll('[id^="Slide-"]');
    this.initPages();
  }

  update() {
    if (!this.slider) return;

    const previousPage = this.currentPage;

    if (this.isStacked) {
      this.currentPage = parseInt(this.querySelector('.slideshow__slide[aria-hidden="false"]').dataset.slideIndex);
    } else {
      this.currentPage = Math.round(this.slider.scrollLeft / this.sliderItemOffset) + 1;
    }

    if (this.currentPageElement && this.pageTotalElement) {
      this.currentPageElement.textContent = this.currentPage;
      this.pageTotalElement.textContent = this.totalPages;
    }

    if (this.currentPage != previousPage) {
      // Eager load the next set of images
      const currentSlideElem = this.sliderItemsToShow[this.currentPage - 1];
      if (currentSlideElem && currentSlideElem.nextElementSibling) {
        const nextHiddenMedia = currentSlideElem.nextElementSibling.querySelector('.slideshow__media.hidden');
        if (nextHiddenMedia) nextHiddenMedia.classList.remove('hidden');

        // currentSlideElem.nextElementSibling.querySelectorAll('img[loading="lazy"]').forEach(img => {
        //   img.loading = 'eager';
        // });
      }

      this.dispatchEvent(
        new CustomEvent('slideChanged', {
          detail: {
            currentPage: this.currentPage,
            currentElement: currentSlideElem,
          },
        })
      );
    }

    if (this.enableSliderLooping) {
      this.slider.classList.add('slider--scroll-active');
      return;
    }

    let isStillCarousel = false;

    if (this.prevButton && this.nextButton) {
      if (this.isSlideVisible(this.sliderItemsToShow[0]) && this.slider.scrollLeft === 0) {
        this.prevButton.setAttribute('disabled', 'disabled');
      } else {
        this.prevButton.removeAttribute('disabled');
        isStillCarousel = true;
      }

      if (this.isSlideVisible(this.sliderItemsToShow[this.sliderItemsToShow.length - 1])) {
        this.nextButton.setAttribute('disabled', 'disabled');
      } else {
        this.nextButton.removeAttribute('disabled');
        isStillCarousel = true;
      }
    }

    this.slider.classList.toggle('slider--scroll-active', isStillCarousel);

    if (isStillCarousel) {
      this.classList.replace('slider-component-desktop_', 'slider-component-desktop');
      this.slider.classList.replace('slider--desktop_', 'slider--desktop');
    } else {
      this.classList.replace('slider-component-desktop', 'slider-component-desktop_');
      this.slider.classList.replace('slider--desktop', 'slider--desktop_');
    }
  }

  isSlideVisible(element, offset = 0) {
    if (this.isStacked) {
      return element.getAttribute('aria-hidden') === 'false';
    } else {
      if (this.slider.classList.contains('slider--desktop_')){
        // Check if the passed element has wrapped by comparing it to the first carousel item
        return this.sliderItemsToShow[0].offsetTop === element.offsetTop;
      } else {
        const lastVisibleSlide = this.slider.clientWidth + this.slider.scrollLeft - offset;
        return element.offsetLeft + element.clientWidth <= lastVisibleSlide && element.offsetLeft >= this.slider.scrollLeft;
      }
    }
  }

  setSlidePosition(position, nextPageElem) {
    this.slider.classList.remove('drag-active');

    if (this.isStacked && nextPageElem) {
      const previousPageElem = this.sliderItemsToShow[this.currentPage - 1];

      if (this.sliderItemsToShow.length === 2 && this.prevButton && this.nextButton) {
        this.nextButton.classList.add('pointer-events-none');
        this.prevButton.classList.add('pointer-events-none');
      }

      this.slider.classList.add('pause-transition');

      setTimeout(() => {
        this.slider.classList.remove('pause-transition');
      }, 1);

      setTimeout(() => {
        previousPageElem?.classList.add('leaving');
        nextPageElem.classList.remove('leaving');

        previousPageElem?.setAttribute('aria-hidden', 'true');
        nextPageElem.setAttribute('aria-hidden', 'false');

        setTimeout(() => {
          previousPageElem?.classList.remove('leaving');
        }, 700);

        if (this.sliderItemsToShow.length === 2 && this.prevButton && this.nextButton) {
          setTimeout(() => {
            this.nextButton.classList.remove('pointer-events-none');
            this.prevButton.classList.remove('pointer-events-none');
          }, 1000);
        }

        this.update();
      }, 2);
    } else {
      this.slider.scrollTo({
        left: position,
      });
    }

    this.dispatchEvent(
      new CustomEvent('slideChange')
    );
  }

  onButtonClick(event) {
    event.preventDefault();
    this.setSlide(event);
  }

  setSlide(event, isNext) {
    const step = event && event.currentTarget.dataset.step || 1;
    if (this.isStacked) {
      let nextPage;
      if (event && event.currentTarget.name === 'next' || isNext) {
        this.slider.setAttribute('data-slide-direction', 'forwards');
        nextPage =  this.currentPage < this.sliderItemsToShow.length ? this.currentPage + 1 : 1;
      } else {
        this.slider.setAttribute('data-slide-direction', 'backwards');
        nextPage =  this.currentPage > 1 ? this.currentPage - 1 : this.sliderItemsToShow.length;
      }
      const nextPageElem = this.sliderItemsToShow[nextPage - 1];
      this.setSlidePosition(null, nextPageElem);
    } else {
      const isLastSlide = this.currentPage === this.sliderItemsToShow.length;
      if (isLastSlide && (!event || event.currentTarget.name === 'next')) {
        this.slideScrollPosition = 0;
      } else {
        this.slideScrollPosition =
          event && event.currentTarget.name === 'next' || isNext
            ? this.slider.scrollLeft + step * this.sliderItemOffset
            : this.slider.scrollLeft - step * this.sliderItemOffset;
      }

      this.setSlidePosition(this.slideScrollPosition);
    }
  }
}

customElements.define('slider-component', SliderComponent);

class SlideshowComponent extends SliderComponent {
  constructor() {
    super();
    this.sliderControlWrapper = this.querySelector('.slider-buttons');
    this.enableSliderLooping = true;

    if (!this.sliderControlWrapper) return;

    this.sliderFirstItemNode = this.slider.querySelector('.slideshow__slide');
    if (this.sliderItemsToShow.length > 0) this.currentPage = 1;

    this.announcementBarSlider = this.querySelector('.announcement-bar-slider');
    // Value below should match --duration-announcement-bar CSS value
    this.announcerBarAnimationDelay = this.announcementBarSlider ? 250 : 0;

    this.sliderControlLinksArray = Array.from(this.sliderControlWrapper.querySelectorAll('.slider-counter__link'));
    this.sliderControlLinksArray.forEach((link) => link.addEventListener('click', this.linkToSlide.bind(this)));
    this.slider.addEventListener('scroll', this.setSlideVisibility.bind(this), { passive: true });
    this.setSlideVisibility();

    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.reducedMotion.addEventListener('change', () => {
      if (this.slider.getAttribute('data-autoplay') === 'true') this.setAutoPlay();
    });

    if (this.announcementBarSlider) {
      this.announcementBarArrowButtonWasClicked = false;
    }

    if (this.slider.getAttribute('data-autoplay') === 'true') this.setAutoPlay();

    if (Shopify.designMode) {
      document.addEventListener('shopify:block:select', event => {
        if (this.contains(event.target)) {

          // Attempt to not animate the slide
          this.slider.classList.add('pause-transition');
          this.pause();
          this.slider.setAttribute('data-slide-direction', 'forwards');

          setTimeout(() => {
            super.setSlidePosition(event.target.offsetLeft, event.target);
          }, 100);

          // Attempt to reanimate the slide
          setTimeout(() => {
            this.slider.classList.remove('pause-transition');
          }, 300);
        }
      });
    }
  }

  setAutoPlay() {
    this.autoplaySpeed = this.slider.dataset.speed * 1000;
    this.querySelectorAll('.banner__box').forEach(slideContent => slideContent.addEventListener('mouseover', this.focusInHandling.bind(this)));
    this.querySelectorAll('.banner__box').forEach(slideContent => slideContent.addEventListener('mouseleave', this.focusOutHandling.bind(this)));
    this.addEventListener('focusin', this.focusInHandling.bind(this));
    this.addEventListener('focusout', this.focusOutHandling.bind(this));

    if (this.querySelector('.slideshow__autoplay')) {
      this.sliderAutoplayButton = this.querySelector('.slideshow__autoplay');
      this.sliderAutoplayButton.addEventListener('click', this.autoPlayToggle.bind(this));
      this.autoplayButtonIsSetToPlay = true;
      this.play();
    } else {
      this.reducedMotion.matches || this.announcementBarArrowButtonWasClicked
        ? this.pause()
        : this.play();
    }
  }

  onButtonClick(event) {
    super.onButtonClick(event);

    event.target.classList.add('pointer-events-none');
    setTimeout(() => event.target.classList.remove('pointer-events-none'), 1000);

    this.wasClicked = true;

    const isFirstSlide = this.currentPage === 1;
    const isLastSlide = this.currentPage === this.sliderItemsToShow.length;

    if (!isFirstSlide && !isLastSlide) {
      this.applyAnimationToAnnouncementBar(event.currentTarget.name);
      return;
    }

    if (!this.isStacked) {
      if (isFirstSlide && event.currentTarget.name === 'previous') {
        this.slider.setAttribute('data-slide-direction', 'backwards');
        this.slideScrollPosition =
          this.slider.scrollLeft + this.sliderFirstItemNode.clientWidth * this.sliderItemsToShow.length;
      } else if (isLastSlide && event.currentTarget.name === 'next') {
        this.slider.setAttribute('data-slide-direction', 'forwards');
        this.slideScrollPosition = 0;
      }

      this.setSlidePosition(this.slideScrollPosition);
    }

    this.applyAnimationToAnnouncementBar(event.currentTarget.name);
  }

  setSlidePosition(position, nextPageElem) {
    this.slider.classList.remove('drag-active');
    if (nextPageElem) {
     super.setSlidePosition(null, nextPageElem);
    } else {
      if (this.setPositionTimeout) clearTimeout(this.setPositionTimeout);
      this.setPositionTimeout = setTimeout(() => {
        this.slider.scrollTo({
          left: position,
        });
      }, this.announcerBarAnimationDelay);
    }
  }

  update() {
    super.update();
    this.sliderControlButtons = this.querySelectorAll('.slider-counter__link');
    if (this.prevButton) this.prevButton.removeAttribute('disabled');

    if (!this.sliderControlButtons.length) return;

    this.sliderControlButtons.forEach((link) => {
      link.classList.remove('slider-counter__link--active');
      link.removeAttribute('aria-current');
    });
    this.sliderControlButtons[this.currentPage - 1].classList.add('slider-counter__link--active');
    this.sliderControlButtons[this.currentPage - 1].setAttribute('aria-current', true);
  }

  autoPlayToggle() {
    this.togglePlayButtonState(this.autoplayButtonIsSetToPlay);
    this.autoplayButtonIsSetToPlay ? this.pause() : this.play();
    this.autoplayButtonIsSetToPlay = !this.autoplayButtonIsSetToPlay;
  }

  focusOutHandling(event) {
    if (this.sliderAutoplayButton) {
      const focusedOnAutoplayButton =
        event.target === this.sliderAutoplayButton || this.sliderAutoplayButton.contains(event.target);
      if (!this.autoplayButtonIsSetToPlay || focusedOnAutoplayButton) return;
      this.play();
    } else if (
      !this.reducedMotion.matches &&
      !this.announcementBarArrowButtonWasClicked
    ) {
      this.play();
    }
  }

  focusInHandling(event) {
    if (this.sliderAutoplayButton) {
      const focusedOnAutoplayButton =
        event.target === this.sliderAutoplayButton || this.sliderAutoplayButton.contains(event.target);
      if (focusedOnAutoplayButton && this.autoplayButtonIsSetToPlay) {
        // Do nothing
      } else if (this.autoplayButtonIsSetToPlay) {
        this.pause();
      }
    } else if (this.announcementBarSlider && this.announcementBarSlider.contains(event.target)) {
      this.pause();
    }
  }

  play() {
    this.slider.setAttribute('aria-live', 'off');
    this.setAttribute('data-paused', 'false');
    clearInterval(this.autoplay);
    this.autoplay = setInterval(this.autoRotateSlides.bind(this), this.autoplaySpeed);
  }

  pause() {
    this.slider.setAttribute('aria-live', 'polite');
    this.setAttribute('data-paused', 'true');
    clearInterval(this.autoplay);
  }

  togglePlayButtonState(pauseAutoplay) {
    if (pauseAutoplay) {
      this.sliderAutoplayButton.classList.add('slideshow__autoplay--paused');
      this.sliderAutoplayButton.setAttribute('aria-label', window.accessibilityStrings.playSlideshow);
    } else {
      this.sliderAutoplayButton.classList.remove('slideshow__autoplay--paused');
      this.sliderAutoplayButton.setAttribute('aria-label', window.accessibilityStrings.pauseSlideshow);
    }
  }

  autoRotateSlides() {
    this.setSlide(null, true);

    this.applyAnimationToAnnouncementBar();
  }

  setSlideVisibility(event) {
    this.sliderItemsToShow.forEach((item, index) => {
      const linkElements = item.querySelectorAll('a');
      if (index === this.currentPage - 1) {
        if (linkElements.length)
          linkElements.forEach((button) => {
            button.removeAttribute('tabindex');
          });
        item.setAttribute('aria-hidden', 'false');
        item.removeAttribute('tabindex');

        if (this.announcementBarSlider) {
          const announcementBar = this.closest('.utility-bar');
          announcementBar.classList.forEach(className => {
            if (className.startsWith('color-')) {
              announcementBar.classList.remove(className);
              announcementBar.classList.add(item.dataset.colorScheme);
            }
          });
        }
      } else {
        if (linkElements.length)
          linkElements.forEach((button) => {
            button.setAttribute('tabindex', '-1');
          });
        item.setAttribute('aria-hidden', 'true');
        item.setAttribute('tabindex', '-1');
      }
    });
    this.wasClicked = false;
  }

  applyAnimationToAnnouncementBar(button = 'next') {
    if (!this.announcementBarSlider) return;

    const itemsCount = this.sliderItems.length;
    const increment = button === 'next' ? 1 : -1;

    const currentIndex = this.currentPage - 1;
    let nextIndex = (currentIndex + increment) % itemsCount;
    nextIndex = nextIndex === -1 ? itemsCount - 1 : nextIndex;

    const nextSlide = this.sliderItems[nextIndex];
    const currentSlide = this.sliderItems[currentIndex];

    const animationClassIn = 'announcement-bar-slider--fade-in';
    const animationClassOut = 'announcement-bar-slider--fade-out';

    const isFirstSlide = currentIndex === 0;
    const isLastSlide = currentIndex === itemsCount - 1;

    const shouldMoveNext = (button === 'next' && !isLastSlide) || (button === 'previous' && isFirstSlide);
    const direction = shouldMoveNext ? 'next' : 'previous';

    currentSlide.classList.add(`${animationClassOut}-${direction}`);
    nextSlide.classList.add(`${animationClassIn}-${direction}`);

    setTimeout(() => {
      currentSlide.classList.remove(`${animationClassOut}-${direction}`);
      nextSlide.classList.remove(`${animationClassIn}-${direction}`);
    }, this.announcerBarAnimationDelay * 2);
  }

  linkToSlide(event) {
    event.preventDefault();
    if (this.isStacked) {
      const slideIndex = parseInt(event.target.dataset.slideIndexTarget);
      super.setSlidePosition(null, this.sliderItemsToShow[slideIndex - 1]);
    } else {
      const slideScrollPosition =
        this.slider.scrollLeft +
        this.sliderFirstItemNode.clientWidth *
        (this.sliderControlLinksArray.indexOf(event.currentTarget) + 1 - this.currentPage);
      this.slider.scrollTo({
        left: slideScrollPosition,
      });
    }
  }
}

customElements.define('slideshow-component', SlideshowComponent);

class VariantSelects extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('change', this.onVariantChange);
  }

  onVariantChange(event) {
    this.updateOptions();
    this.updateMasterId();
    this.updateSelectedSwatchValue(event);
    this.toggleAddButton(true, '', false);
    this.updatePickupAvailability();
    this.removeErrorMessage();
    this.updateVariantStatuses();
    this.updateVariantDataVisibility();

    if (!this.currentVariant) {
      this.toggleAddButton(true, '', true);
      this.setUnavailable();
    } else {
      this.updateMedia();
      this.updateURL();
      this.updateVariantInput();
      this.renderProductInfo();
      this.updateShareUrl();
    }

    this.updateNiceSelectLabels();
  }

  updateVariantDataVisibility() {
    document.querySelectorAll(`[data-variant-data-product-id='${this.dataset.productId}']`).forEach(dataPiece => {
      dataPiece.classList.toggle('hidden', dataPiece.dataset.variantDataVariantId != this.currentVariant.id);
    });
  }

  updateNiceSelectLabels() {
    // Find all select elements that are descendants of elements with the class .nice-select
    const selectContainers = document.querySelectorAll('.select:has(.nice-select)');

    // Loop through each select element found
    selectContainers.forEach((selectContainer) => {
      // Get the corresponding .nice-list element within the same .nice-select container
      const niceList = selectContainer.querySelector('.nice-list');
      const niceCurrent = selectContainer.querySelector('.current');
      const select = selectContainer.querySelector('select');

      // Check if the .nice-list exists
      if (niceList && select) {
        // Get all li elements within the .nice-list
        const listItems = niceList.querySelectorAll('li');

        // Loop through each option in the select element
        select.querySelectorAll('option').forEach((option, index) => {
          // Check if there's a corresponding li for this option
          if (index < listItems.length) {
            // Set the text of the li to match the text of the option
            const newText = option.innerText.trim();
            listItems[index].innerText = newText;
            listItems[index].setAttribute('data-value', newText);

            if (listItems[index].classList.contains('selected')) {
              niceCurrent.innerHTML = newText;
            }
          }
        });
      }
    });
  }

  updateCtaButton(buttonText, makeDisabled) {
    const stickyCta = document.getElementById('sticky-cta');
    if (stickyCta && !this.closest('.section-featured-product')) {
      if (this.currentVariant) {
        // Update the price
        const productForm = document.querySelector(`#product-form-${this.dataset.section}`);
        const productInfo = productForm.closest('.product__info-wrapper');
        const priceElem = productInfo?.querySelector('.price__container .price-item--last');
        const priceText = priceElem?.textContent.trim();
        if (priceText && priceText.length > 0) {
          const stickyPriceElem = stickyCta.querySelector('.sticky-cta__price');
          if (stickyPriceElem) {
            stickyPriceElem.textContent = priceText;
          }
        }
      }

      // Update the button
      const button = stickyCta.querySelector('.button');
      if (button) {
        if (buttonText) {
          const buttonTextElem = button.querySelector('span');
          if (buttonTextElem) buttonTextElem.textContent = buttonText;
        }

        if (makeDisabled) {
          button.setAttribute('disabled', 'disabled');
        } else {
          button.removeAttribute('disabled');
        }
      }
    }
  }

  updateOptions() {
    this.options = Array.from(this.querySelectorAll('select, fieldset'), (element) => {
      if (element.tagName === 'SELECT') {
        return element.value;
      }
      if (element.tagName === 'FIELDSET') {
        return Array.from(element.querySelectorAll('input')).find((radio) => radio.checked)?.value;
      }
    });
  }

  updateMasterId() {
    this.currentVariant = this.getVariantData().find((variant) => {
      return !variant.options
        .map((option, index) => {
          return this.options[index] === option;
        })
        .includes(false);
    });
  }

  updateSelectedSwatchValue({ target }) {
    const { name, value, tagName } = target;

    if (tagName === 'SELECT' && target.selectedOptions.length) {
      const swatchValue = target.selectedOptions[0].dataset.optionSwatchValue;
      const selectedDropdownSwatchValue = this.querySelector(`[data-selected-dropdown-swatch="${name}"] > .swatch`);
      if (!selectedDropdownSwatchValue) return;
      if (swatchValue) {
        selectedDropdownSwatchValue.style.setProperty('--swatch--background', swatchValue);
        selectedDropdownSwatchValue.classList.remove('swatch--unavailable');
      } else {
        selectedDropdownSwatchValue.style.setProperty('--swatch--background', 'unset');
        selectedDropdownSwatchValue.classList.add('swatch--unavailable');
      }

      selectedDropdownSwatchValue.style.setProperty(
        '--swatch-focal-point',
        target.selectedOptions[0].dataset.optionSwatchFocalPoint || 'unset'
      );
    } else if (tagName === 'INPUT' && target.type === 'radio') {
      const selectedSwatchValue = this.querySelector(`[data-selected-swatch-value="${name}"]`);
      if (selectedSwatchValue) selectedSwatchValue.innerHTML = value;
    }
  }

  updateMedia() {
    if (!this.currentVariant) return;
    if (!this.currentVariant.featured_media) return;

    const mediaGalleries = document.querySelectorAll(`[id^="MediaGallery-${this.dataset.section}"]`);
    mediaGalleries.forEach((mediaGallery) =>
      mediaGallery.setActiveMedia(`${this.dataset.section}-${this.currentVariant.featured_media.id}`)
    );

    const modalContent = document.querySelector(`#ProductModal-${this.dataset.section} .product-media-modal__content`);
    if (!modalContent) return;
    const newMediaModal = modalContent.querySelector(`[data-media-id="${this.currentVariant.featured_media.id}"]`);
    modalContent.prepend(newMediaModal);
  }

  updateURL() {
    if (!this.currentVariant || this.dataset.updateUrl === 'false') return;
    window.history.replaceState({}, '', `${this.dataset.url}?variant=${this.currentVariant.id}`);
  }

  updateShareUrl() {
    const shareButton = document.getElementById(`Share-${this.dataset.section}`);
    if (!shareButton || !shareButton.updateUrl) return;
    shareButton.updateUrl(`${window.shopUrl}${this.dataset.url}?variant=${this.currentVariant.id}`);
  }

  updateVariantInput() {
    const productForms = document.querySelectorAll(
      `#product-form-${this.dataset.section}, #product-form-installment-${this.dataset.section}`
    );
    productForms.forEach((productForm) => {
      const input = productForm.querySelector('input[name="id"]');
      input.value = this.currentVariant.id;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Update any inputs which reference the variant id
    this.closest('.section')?.querySelectorAll('[id^="back-in-stock-variant"],[id^="product-enquiry"]').forEach(variantInput => {
      if (variantInput) variantInput.value = this.currentVariant.id;
    });
  }

  updateVariantStatuses() {
    const selectedOptionOneVariants = this.variantData.filter(
      (variant) => this.querySelector(':checked').value === variant.option1
    );
    const inputWrappers = [...this.querySelectorAll('.product-form__input')];
    inputWrappers.forEach((option, index) => {
      if (index === 0) return;
      const optionInputs = [...option.querySelectorAll('input[type="radio"], option')];
      const previousOptionSelected = inputWrappers[index - 1].querySelector(':checked').value;
      const availableOptionInputsValue = selectedOptionOneVariants
        .filter((variant) => variant.available && variant[`option${index}`] === previousOptionSelected)
        .map((variantOption) => variantOption[`option${index + 1}`]);

      if (this.dataset.showAvailability === 'true') {
        this.setInputAvailability(optionInputs, availableOptionInputsValue);
      }
    });
  }

  setInputAvailability(elementList, availableValuesList) {
    elementList.forEach((element) => {
      const value = element.getAttribute('value');
      const availableElement = availableValuesList.includes(value);

      if (element.tagName === 'INPUT') {
        element.classList.toggle('disabled', !availableElement);
      } else if (element.tagName === 'OPTION') {
        element.innerText = availableElement
          ? value
          : window.variantStrings.unavailable_with_option.replace('[value]', value);
      }
    });
  }

  updatePickupAvailability() {
    const pickUpAvailability = document.querySelector('pickup-availability');
    if (!pickUpAvailability) return;

    if (this.currentVariant && this.currentVariant.available) {
      pickUpAvailability.fetchAvailability(this.currentVariant.id);
    } else {
      pickUpAvailability.removeAttribute('available');
      pickUpAvailability.innerHTML = '';
    }
  }

  removeErrorMessage() {
    const section = this.closest('section');
    if (!section) return;

    const productForm = section.querySelector('product-form');
    if (productForm) productForm.handleErrorMessage();
  }

  renderProductInfo() {
    const requestedVariantId = this.currentVariant.id;
    const sectionId = this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section;

    fetch(
      `${this.dataset.url}?variant=${requestedVariantId}&section_id=${this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section
      }`
    )
      .then((response) => response.text())
      .then((responseText) => {
        // prevent unnecessary ui changes from abandoned selections
        if (this.currentVariant.id !== requestedVariantId) return;

        const html = new DOMParser().parseFromString(responseText, 'text/html');
        const destination = document.getElementById(`price-${this.dataset.section}`);
        const source = html.getElementById(
          `price-${this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section}`
        );
        const skuSource = html.getElementById(
          `Sku-${this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section}`
        );
        const skuDestination = document.getElementById(`Sku-${this.dataset.section}`);
        const inventorySource = html.getElementById(
          `Inventory-${this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section}`
        );
        const inventoryDestination = document.getElementById(`Inventory-${this.dataset.section}`);

        const volumePricingSource = html.getElementById(
          `Volume-${this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section}`
        );

        const pricePerItemDestination = document.getElementById(`Price-Per-Item-${this.dataset.section}`);
        const pricePerItemSource = html.getElementById(`Price-Per-Item-${this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section}`);

        const volumePricingDestination = document.getElementById(`Volume-${this.dataset.section}`);
        const qtyRules = document.getElementById(`Quantity-Rules-${this.dataset.section}`);
        const volumeNote = document.getElementById(`Volume-Note-${this.dataset.section}`);

        if (volumeNote) volumeNote.classList.remove('hidden');
        if (volumePricingDestination) volumePricingDestination.classList.remove('hidden');
        if (qtyRules) qtyRules.classList.remove('hidden');

        if (source && destination) destination.innerHTML = source.innerHTML;
        if (inventorySource && inventoryDestination) inventoryDestination.innerHTML = inventorySource.innerHTML;
        if (skuSource && skuDestination) {
          skuDestination.innerHTML = skuSource.innerHTML;
          skuDestination.classList.toggle('hidden', skuSource.classList.contains('hidden'));
        }

        if (volumePricingSource && volumePricingDestination) {
          volumePricingDestination.innerHTML = volumePricingSource.innerHTML;
        }

        if (pricePerItemSource && pricePerItemDestination) {
          pricePerItemDestination.innerHTML = pricePerItemSource.innerHTML;
          pricePerItemDestination.classList.toggle('hidden', pricePerItemSource.classList.contains('hidden'));
        }

        const price = document.getElementById(`price-${this.dataset.section}`);

        if (price) price.classList.remove('hidden');

        if (inventoryDestination)
          inventoryDestination.classList.toggle('hidden', inventorySource.innerText === '');

        const addButtonUpdated = html.getElementById(`ProductSubmitButton-${sectionId}`);
        this.toggleAddButton(
          addButtonUpdated ? addButtonUpdated.hasAttribute('disabled') : true,
          window.variantStrings.soldOut
        );

        publish(PUB_SUB_EVENTS.variantChange, {
          data: {
            sectionId,
            html,
            variant: this.currentVariant,
          },
        });
      });
  }

  toggleAddButton(disable = true, text, modifyClass = true) {
    const productForm = document.getElementById(`product-form-${this.dataset.section}`);
    if (!productForm) return;
    const addButton = productForm.querySelector('[name="add"]');
    const addButtonText = productForm.querySelector('[name="add"] > span');
    if (!addButton) return;

    let price;
    if (productForm.dataset.showPrice === 'true') {
      const productInfo = productForm.closest('.product__info-wrapper');
      const priceElem = productInfo?.querySelector('.price__container .price-item--last');
      const priceText = priceElem?.textContent.trim();
      if (priceText && priceText.length > 0) price = priceText;
    }

    if (disable) {
      addButton.setAttribute('disabled', 'disabled');
      if (text) addButtonText.textContent = `${text}${price ? ' - ' + price : ''}`;
      this.updateCtaButton(text, true);
    } else {
      addButton.removeAttribute('disabled');
      const buttonText = addButton.dataset.isPreorder ? window.variantStrings.preorder : window.variantStrings.addToCart;
      addButtonText.textContent = `${buttonText}${price ? ' - ' + price : ''}`;
      this.updateCtaButton(window.variantStrings.addToCart, false);
    }

    if (!modifyClass) return;
  }

  setUnavailable() {
    const button = document.getElementById(`product-form-${this.dataset.section}`);
    const addButton = button.querySelector('[name="add"]');
    const addButtonText = button.querySelector('[name="add"] > span');
    const price = document.getElementById(`price-${this.dataset.section}`);
    const inventory = document.getElementById(`Inventory-${this.dataset.section}`);
    const sku = document.getElementById(`Sku-${this.dataset.section}`);
    const pricePerItem = document.getElementById(`Price-Per-Item-${this.dataset.section}`);
    const volumeNote = document.getElementById(`Volume-Note-${this.dataset.section}`);
    const volumeTable = document.getElementById(`Volume-${this.dataset.section}`);
    const qtyRules = document.getElementById(`Quantity-Rules-${this.dataset.section}`);

    if (!addButton) return;
    addButtonText.textContent = window.variantStrings.unavailable;
    this.updateCtaButton(window.variantStrings.unavailable, true);
    if (price) price.classList.add('hidden');
    if (inventory) inventory.classList.add('hidden');
    if (sku) sku.classList.add('hidden');
    if (pricePerItem) pricePerItem.classList.add('hidden');
    if (volumeNote) volumeNote.classList.add('hidden');
    if (volumeTable) volumeTable.classList.add('hidden');
    if (qtyRules) qtyRules.classList.add('hidden');
  }

  getVariantData() {
    this.variantData = this.variantData || JSON.parse(this.querySelector('[type="application/json"]').textContent);
    return this.variantData;
  }
}

customElements.define('variant-selects', VariantSelects);

class ProductRecommendations extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    if (this.closest('.product')) {
      window.addEventListener('DOMContentLoaded', () => {
        setTimeout(this.fetchProductRecommendations.bind(this), 500);
      });
    }

    const handleIntersection = (entries, observer) => {
      if (!entries[0].isIntersecting) return;
      observer.unobserve(this);
      this.fetchProductRecommendations();
    };
    new IntersectionObserver(handleIntersection.bind(this), { rootMargin: '0px 0px 400px 0px' }).observe(this);
  };

  fetchProductRecommendations() {
    if (this.dataset.url) {
      fetch(this.dataset.url)
        .then((response) => response.text())
        .then((text) => {
          const html = document.createElement('div');
          html.innerHTML = text;
          const recommendations = html.querySelector('product-recommendations');

          if (recommendations && recommendations.innerHTML.trim().length) {
            this.innerHTML = recommendations.innerHTML;
          }

          if (!this.querySelector('.has-complementary-products') && this.classList.contains('complementary-products')) {
            this.remove();
          }

          if (html.querySelector('.grid__item')) {
            this.classList.add('product-recommendations--loaded');
          }

          window.loadDesktopOnlyTemplates();
          window.stickersReinit?.();
        })
        .catch((e) => {
          console.error(e);
        });
    }
  }
}

customElements.define('product-recommendations', ProductRecommendations);

class AccountIcon extends HTMLElement {
  constructor() {
    super();

    this.icon = this.querySelector('.icon');
  }

  connectedCallback() {
    document.addEventListener('storefront:signincompleted', this.handleStorefrontSignInCompleted.bind(this));
  }

  handleStorefrontSignInCompleted(event) {
    if (event?.detail?.avatar) {
      this.icon?.replaceWith(event.detail.avatar.cloneNode());
    }
  }
}

customElements.define('account-icon', AccountIcon);

class BulkAdd extends HTMLElement {
  constructor() {
    super();
    this.queue = [];
    this.requestStarted = false;
    this.ids = [];
    this.cart = document.querySelector('cart-drawer');
  }

  startQueue(id, quantity, element) {
    this.queue.push({ id, quantity });
    const interval = setInterval(() => {
      if (this.queue.length > 0) {
        if (!this.requestStarted) {
          this.sendRequest(this.queue, element);
        }
      } else {
        clearInterval(interval);
      }
    }, 250);
  }

  sendRequest(queue, element) {
    this.requestStarted = true;
    const items = {};
    queue.forEach((queueItem) => {
      items[parseInt(queueItem.id)] = queueItem.quantity;
    });
    this.queue = this.queue.filter((queueElement) => !queue.includes(queueElement));
    const quickBulkElement = this.closest('quick-order-list') || this.closest('quick-add-bulk');
    quickBulkElement.updateMultipleQty(items, element);
  }

  resetQuantityInput(id) {
    const input = this.querySelector(`#Quantity-${id}`);
    input.value = input.getAttribute('value');
    this.isEnterPressed = false;
  }

  setValidity(event, index, message) {
    event.target.setCustomValidity(message);
    event.target.reportValidity();
    this.resetQuantityInput(index);
    event.target.select();
  }

  validateQuantity(event) {
    const inputValue = parseInt(event.target.value);
    const index = event.target.dataset.index;

    if (inputValue < event.target.dataset.min) {
      this.setValidity(event, index, window.quickOrderListStrings.min_error.replace('[min]', event.target.dataset.min));
    } else if (inputValue > parseInt(event.target.max)) {
      this.setValidity(event, index, window.quickOrderListStrings.max_error.replace('[max]', event.target.max));
    } else if (inputValue % parseInt(event.target.step) != 0) {
      this.setValidity(event, index, window.quickOrderListStrings.step_error.replace('[step]', event.target.step));
    } else {
      event.target.setCustomValidity('');
      event.target.reportValidity();
      this.startQueue(index, inputValue, event.target);
    }
  }

  getSectionsUrl() {
    if (window.pageNumber) {
      return `${window.location.pathname}?page=${window.pageNumber}`;
    } else if (window.location.href.includes(window.routes.search_url)) {
      // Preserve the search parameters in the url
      return `${window.location.pathname}${window.location.search}`
    } else {
      return window.location.pathname;
    }
  }

  getSectionInnerHTML(html, selector) {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector).innerHTML;
  }
}

if (!customElements.get('bulk-add')) {
  customElements.define('bulk-add', BulkAdd);
}

/* Stat counter component */
if (!customElements.get('stat-counter')) {
  class StatCounter extends HTMLElement {
    constructor() {
      super();
    }

    connectedCallback() {
      if (window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
        this.init();
        document.addEventListener('shopify:section:load', () => {
          this.destroy();
          this.init();
        });
      }
    }

    disconnectedCallback() {
      this.destroy();
    }

    init() {
      if ('IntersectionObserver' in window && this.dataset.statAnimate === 'true') {
        this.observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              this.counterCountUp();
            }
          });
        }, {threshold: 0});

        this.wrapNumbers();
        this.observer.observe(this);
      }
    }

    destroy() {
      if ('IntersectionObserver' in window) {
        this.observer.disconnect();
        this.unwrapNumbers();
      }
    }

    wrapNumbers() {
      if (!this.dataset.statAnimating) {
        this.originalHtml = this.innerHTML;

        const characters = this.textContent.trim().split("");
        characters.forEach((el, i) => {
          if (!isNaN(parseInt(el, 10))) {
            characters[i] = `
        <div class='digit' data-counter-value=${el}>
          <div class='sequence'>
            <span>0</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span><span>8</span><span>9</span>
          </div>
        </div>`;
          }
        });

        this.innerHTML = characters.join("");

        this.setAttribute('data-stat-animating', 'true');
      }
    }

    unwrapNumbers() {
      this.html = this.originalHtml;
    }

    counterCountUp() {
      this.querySelectorAll(".digit").forEach(digit => {
        const sequence = digit.querySelector(".sequence");
        const value = digit.getAttribute("data-counter-value");
        sequence.style.transform = `translate3d(0, ${-(value * 10)}%, 0)`;
      });
    }

    counterReset() {
      this.querySelectorAll(".digit").forEach(digit => {
        const sequence = digit.querySelector(".sequence");
        sequence.style.transform = "translate3d(0, 0%, 0)";
      });
    }
  }

  customElements.define('stat-counter', StatCounter);
}

/* Custom selects */
(function() {
  !function(e,t){"object"==typeof exports&&"object"==typeof module?module.exports=t():"function"==typeof define&&define.amd?define([],t):"object"==typeof exports?exports.NiceSelect=t():e.NiceSelect=t()}(self,(()=>(()=>{"use strict";var e={d:(t,i)=>{for(var s in i)e.o(i,s)&&!e.o(t,s)&&Object.defineProperty(t,s,{enumerable:!0,get:i[s]})},o:(e,t)=>Object.prototype.hasOwnProperty.call(e,t),r:e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})}},t={};function i(e){var t=document.createEvent("MouseEvents");t.initEvent("click",!0,!1),e.dispatchEvent(t)}function s(e){var t=document.createEvent("HTMLEvents");t.initEvent("change",!0,!1),e.dispatchEvent(t)}function o(e){var t=document.createEvent("FocusEvent");t.initEvent("focusin",!0,!1),e.dispatchEvent(t)}function n(e){var t=document.createEvent("FocusEvent");t.initEvent("focusout",!0,!1),e.dispatchEvent(t)}function d(e){var t=document.createEvent("UIEvent");t.initEvent("modalclose",!0,!1),e.dispatchEvent(t)}function l(e,t){"invalid"==t?(c(this.dropdown,"invalid"),h(this.dropdown,"valid")):(c(this.dropdown,"valid"),h(this.dropdown,"invalid"))}function r(e,t){return null!=e[t]?e[t]:e.getAttribute(t)}function a(e,t){return!!e&&e.classList.contains(t)}function c(e,t){if(e)return e.classList.add(t)}function h(e,t){if(e)return e.classList.remove(t)}e.r(t),e.d(t,{bind:()=>f,default:()=>u});var p={data:null,searchable:!1,showSelectedItems:!1};function u(e,t){this.el=e,this.config=Object.assign({},p,t||{}),this.data=this.config.data,this.selectedOptions=[],this.placeholder=r(this.el,"placeholder")||this.config.placeholder||"Select an option",this.searchtext=r(this.el,"searchtext")||this.config.searchtext||"Search",this.selectedtext=r(this.el,"selectedtext")||this.config.selectedtext||"selected",this.dropdown=null,this.multiple=r(this.el,"multiple"),this.disabled=r(this.el,"disabled"),this.create()}function f(e,t){return new u(e,t)}return u.prototype.create=function(){this.el.style.opacity="0",this.el.style.minWidth="0",this.el.setAttribute('tabindex', '-1'),this.el.style.width="0",this.el.style.padding="0",this.el.style.height="0",this.data?this.processData(this.data):this.extractData(),this.renderDropdown(),this.bindEvent()},u.prototype.processData=function(e){var t=[];e.forEach((e=>{t.push({data:e,attributes:{selected:!!e.selected,disabled:!!e.disabled,optgroup:"optgroup"==e.value}})})),this.options=t},u.prototype.extractData=function(){var e=this.el.querySelectorAll("option,optgroup"),t=[],i=[],s=[];e.forEach((e=>{if("OPTGROUP"==e.tagName)var s={text:e.label,value:"optgroup"};else{let t=e.innerText;null!=e.dataset.display&&(t=e.dataset.display),s={text:t,value:e.value,selected:null!=e.getAttribute("selected"),disabled:null!=e.getAttribute("disabled")}}var o={selected:null!=e.getAttribute("selected"),disabled:null!=e.getAttribute("disabled"),optgroup:"OPTGROUP"==e.tagName};t.push(s),i.push({data:s,attributes:o})})),this.data=t,this.options=i,this.options.forEach((e=>{e.attributes.selected&&s.push(e)})),this.selectedOptions=s},u.prototype.renderDropdown=function(){var e=["nice-select",r(this.el,"class")||"",this.disabled?"disabled":"",this.multiple?"has-multiple":""];let t='<div class="nice-select-search-box field">';t+=`<input type="text" class="nice-select-search field__input visible-placeholder" placeholder="${this.searchtext}..." title="search"/>`,t+="</div>";var i=`<div class="${e.join(" ")}" tabindex="${this.disabled?null:0}">`;i+=`<span class="${this.multiple?"multiple-options":"current"}"></span>`,i+='<div class="nice-select-dropdown custom-scrollbar">',i+=`${this.config.searchable?t:""}`,i+='<ul class="nice-list"></ul>',i+="</div>",i+="</div>",this.el.insertAdjacentHTML("afterend",i),this.dropdown=this.el.nextElementSibling,this._renderSelectedItems(),this._renderItems()},u.prototype._renderSelectedItems=function(){if(this.multiple){var e="";this.config.showSelectedItems||this.config.showSelectedItems||"auto"==window.getComputedStyle(this.dropdown).width||this.selectedOptions.length<2?(this.selectedOptions.forEach((function(t){e+=`<span class="current">${t.data.text}</span>`})),e=""==e?this.placeholder:e):e=this.selectedOptions.length+" "+this.selectedtext,this.dropdown.querySelector(".multiple-options").innerHTML=e}else{var t=this.selectedOptions.length>0?this.selectedOptions[0].data.text:this.placeholder;this.dropdown.querySelector(".current").innerHTML=t}},u.prototype._renderItems=function(){var e=this.dropdown.querySelector("ul");this.options.forEach((t=>{e.appendChild(this._renderItem(t))}))},u.prototype._renderItem=function(e){var t=document.createElement("li");if(t.innerHTML=e.data.text,e.attributes.optgroup)c(t,"optgroup");else{t.setAttribute("data-value",e.data.value);var i=["option",e.attributes.selected?"selected":null,e.attributes.disabled?"disabled":null];t.addEventListener("click",this._onItemClicked.bind(this,e)),t.classList.add(...i)}return e.element=t,t},u.prototype.update=function(){if(this.extractData(),this.dropdown){var e=a(this.dropdown,"open");this.dropdown.parentNode.removeChild(this.dropdown),this.create(),e&&i(this.dropdown)}r(this.el,"disabled")?this.disable():this.enable()},u.prototype.disable=function(){this.disabled||(this.disabled=!0,c(this.dropdown,"disabled"))},u.prototype.enable=function(){this.disabled&&(this.disabled=!1,h(this.dropdown,"disabled"))},u.prototype.clear=function(){this.resetSelectValue(),this.selectedOptions=[],this._renderSelectedItems(),this.update(),s(this.el)},u.prototype.destroy=function(){this.dropdown&&(this.dropdown.parentNode.removeChild(this.dropdown),this.el.style.display="")},u.prototype.bindEvent=function(){this.dropdown.addEventListener("click",this._onClicked.bind(this)),this.dropdown.addEventListener("keydown",this._onKeyPressed.bind(this)),this.dropdown.addEventListener("focusin",o.bind(this,this.el)),this.dropdown.addEventListener("focusout",n.bind(this,this.el)),this.el.addEventListener("invalid",l.bind(this,this.el,"invalid")),window.addEventListener("click",this._onClickedOutside.bind(this)),this.config.searchable&&this._bindSearchEvent()},u.prototype._bindSearchEvent=function(){var e=this.dropdown.querySelector(".nice-select-search");e&&e.addEventListener("click",(function(e){return e.stopPropagation(),!1})),e.addEventListener("input",this._onSearchChanged.bind(this))},u.prototype._onClicked=function(e){var t,i;if(e.preventDefault(),a(this.dropdown,"open")?this.multiple||(h(this.dropdown,"open"),d(this.el)):(c(this.dropdown,"open"),t=this.el,(i=document.createEvent("UIEvent")).initEvent("modalopen",!0,!1),t.dispatchEvent(i)),a(this.dropdown,"open")){var s=this.dropdown.querySelector(".nice-select-search");s&&(s.value="",s.focus());var o=this.dropdown.querySelector(".focus");h(o,"focus"),c(o=this.dropdown.querySelector(".selected"),"focus"),this.dropdown.querySelectorAll("ul li").forEach((function(e){e.style.display=""}))}else this.dropdown.focus()},u.prototype._onItemClicked=function(e,t){var i=t.target;a(i,"disabled")||(this.multiple?a(i,"selected")?(h(i,"selected"),this.selectedOptions.splice(this.selectedOptions.indexOf(e),1),this.el.querySelector(`option[value="${i.dataset.value}"]`).removeAttribute("selected")):(c(i,"selected"),this.selectedOptions.push(e)):(this.selectedOptions.forEach((function(e){h(e.element,"selected")})),c(i,"selected"),this.selectedOptions=[e]),this._renderSelectedItems(),this.updateSelectValue())},u.prototype.updateSelectValue=function(){if(this.multiple){var e=this.el;this.selectedOptions.forEach((function(t){var i=e.querySelector(`option[value="${t.data.value}"]`);i&&i.setAttribute("selected",!0)}))}else this.selectedOptions.length>0&&(this.el.value=this.selectedOptions[0].data.value);s(this.el)},u.prototype.resetSelectValue=function(){if(this.multiple){var e=this.el;this.selectedOptions.forEach((function(t){var i=e.querySelector(`option[value="${t.data.value}"]`);i&&i.removeAttribute("selected")}))}else this.selectedOptions.length>0&&(this.el.selectedIndex=-1);s(this.el)},u.prototype._onClickedOutside=function(e){this.dropdown.contains(e.target)||(h(this.dropdown,"open"),d(this.el))},u.prototype._onKeyPressed=function(e){var t=this.dropdown.querySelector(".focus"),s=a(this.dropdown,"open");if(13==e.keyCode)i(s?t:this.dropdown);else if(40==e.keyCode){if(s){var o=this._findNext(t);o&&(h(this.dropdown.querySelector(".focus"),"focus"),c(o,"focus"))}else i(this.dropdown);e.preventDefault()}else if(38==e.keyCode){if(s){var n=this._findPrev(t);n&&(h(this.dropdown.querySelector(".focus"),"focus"),c(n,"focus"))}else i(this.dropdown);e.preventDefault()}else if(27==e.keyCode&&s)i(this.dropdown);else if(32===e.keyCode&&s)return!1;return!1},u.prototype._findNext=function(e){for(e=e?e.nextElementSibling:this.dropdown.querySelector(".list .option");e;){if(!a(e,"disabled")&&"none"!=e.style.display)return e;e=e.nextElementSibling}return null},u.prototype._findPrev=function(e){for(e=e?e.previousElementSibling:this.dropdown.querySelector(".list .option:last-child");e;){if(!a(e,"disabled")&&"none"!=e.style.display)return e;e=e.previousElementSibling}return null},u.prototype._onSearchChanged=function(e){var t=a(this.dropdown,"open"),i=e.target.value;if(""==(i=i.toLowerCase()))this.options.forEach((function(e){e.element.style.display=""}));else if(t){var s=new RegExp(i);this.options.forEach((function(e){var t=e.data.text.toLowerCase(),i=s.test(t);e.element.style.display=i?"":"none"}))}this.dropdown.querySelectorAll(".focus").forEach((function(e){h(e,"focus")})),c(this._findNext(null),"focus")},t})()));

  if (window.matchMedia('(min-width: 750px)').matches) {
    window.renderSelects = function() {
      document.querySelectorAll('select.styled-select').forEach(select => {
        select.classList.remove('styled-select');
        select.classList.add('nice__select');
        NiceSelect.bind(select);
      });
    }

    document.addEventListener('DOMContentLoaded', window.renderSelects);
    if (Shopify.designMode) {
      document.addEventListener('shopify:section:load', window.renderSelects);
    }
  } else {
    window.renderSelects = function() {};
  }
})();

// Tab states
document.addEventListener('keydown', (evt) => {
  if (evt.code === 'Tab') {
    document.body.classList.add('tab-active');
    // setTimeout(() => { console.log(document.activeElement); }, 0);
  }
});

function loadDesktopOnlyTemplates() {
  // Load desktop only template content
  document.querySelectorAll('template.js-load-desktop-only').forEach(template => {
    if (window.innerWidth >= 750) {
      const clone = document.importNode(template.content, true);
      template.parentNode.replaceChild(clone, template);
    }
  });
}

// General dom loaded bits
document.addEventListener('DOMContentLoaded', () => {
  loadDesktopOnlyTemplates();
  if (Shopify.designMode) document.addEventListener('shopify:section:load', window.loadDesktopOnlyTemplates);

  // General utility classes
  document.body.classList.remove('page-is-loading');

  setTimeout(() => {
    document.body.classList.add('page-is-idle');
  }, 1000);

  // Links to other websites
if (window.theme?.settings.externalDomainLinks) {
  document.addEventListener('click', (event) => {
    const target = event.target.tagName !== 'A' ? event.target.closest('a') : event.target;
    const ignorePrefixes = ['mailto:', 'tel:', 'file:', 'javascript:', '#'];
    if (target && target.tagName === 'A' && window.location.hostname !== new URL(target.href).hostname && !ignorePrefixes.some(prefix => target.href.startsWith(prefix)) && ['http:', 'https:'].includes(new URL(target.href).protocol)) {
      target.target = '_blank';
    }
  });
}


  // Browser tab messages
  if (window.theme?.settings.browserTab.length > 0) {
    const originalTitle = document.title;
    let isBlurred = false;

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        isBlurred = true;
        setTimeout(() => {
          if (isBlurred) document.title = window.theme?.settings.browserTab;
        }, 2000);
      } else {
        isBlurred = false;
        document.title = originalTitle;
      }
    });
  }
});

/* Resize end custom event */

/* Utility function to record the tallest elements */
(function() {
  function dispatchResizeEndEvent() {
    const resizeEndEvent = new Event('resizeend');
    window.dispatchEvent(resizeEndEvent);
  }

  window.addEventListener('resize', debounce(dispatchResizeEndEvent, 250));
})();

(function() {
  window.findTallestHeight = function () {
    const elementsWithDataAttr = document.querySelectorAll('[data-find-tallest]');

    elementsWithDataAttr.forEach(element => {
      const selector = element.getAttribute('data-find-tallest');
      const childElements = element.querySelectorAll(selector);

      let tallestHeight = 0;
      childElements.forEach(child => { tallestHeight = Math.max(tallestHeight, child.offsetHeight) });

      // Set CSS variable on the original element with the tallest height
      element.style.setProperty(`--${selector.replace(/\./g, '')}-tallest`, `${tallestHeight}px`);
    });
  }

  document.addEventListener('DOMContentLoaded', window.findTallestHeight);
  window.addEventListener('resizeend', window.findTallestHeight);
  if (Shopify.designMode) document.addEventListener('shopify:section:load', window.findTallestHeight);
})();

if (window.visualViewport) {
  // Attempt to maintain the height of the visible screen (including on-screen keyboard)
  (function () {
    window.updateViewportSize = function () {
      document.documentElement.style.setProperty('--bvh', `${window.visualViewport.height}px`);
    }

    document.addEventListener('DOMContentLoaded', window.updateViewportSize);
    window.addEventListener('orientationchange', window.updateViewportSize);
    window.addEventListener('resizeend', window.updateViewportSize);
  })();
}

(function() {
  function makeTablesResponsive() {
    document.querySelectorAll('.rte table').forEach(table => {
      const scroller = document.createElement('div');
      scroller.className = 'responsive-table';
      table.parentNode.insertBefore(scroller, table);
      scroller.appendChild(table);
    });
  }
  makeTablesResponsive();
  if (Shopify.designMode) document.addEventListener('shopify:section:load', makeTablesResponsive);
})();

// Listen for 'overflow-hidden' being toggled on the body tag
(function() {
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

  // Function to toggle scrollbar compensation
  function adjustBodyPadding(hasOverflowHidden) {
    const body = document.body;
    if (hasOverflowHidden) {
      // If overflow-hidden is applied, add padding to compensate for the scrollbar width
      if (scrollbarWidth > 0 && scrollbarWidth < 25) {
        body.style.paddingRight = `${scrollbarWidth}px`;
        document.body.style.setProperty('--temp-scrollbar-width', `${scrollbarWidth}px`);
      }
    } else {
      // Remove the added padding when overflow-hidden is removed
      body.style.paddingRight = '';
      document.body.style.setProperty('--temp-scrollbar-width', '');
    }
  }

  // Create an observer instance linked to a callback function
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "attributes" && mutation.attributeName === "class") {
        const hasOverflowHidden = document.body.classList.contains('overflow-hidden');
        adjustBodyPadding(hasOverflowHidden);
      }
    });
  });

  // Start observing the body for attribute changes
  observer.observe(document.body, {
    attributes: true
  });
})();

// Observe changes to cart-icon-bubble and animate it when it changes
(function() {
  const bubble = document.getElementById('cart-icon-bubble');
  if (bubble) {
    const callback = function(mutationsList, observer) {
      for (let mutation of mutationsList) {
        if (mutation.type === 'childList') {
          const cartCount = bubble.querySelector('.cart-count-bubble');
          if (cartCount) {
            cartCount.classList.add('animate--pop');
            setTimeout(() => { cartCount.classList.remove('animate--pop') }, 250);
          }
          break;
        }
      }
    };
    const observer = new MutationObserver(callback);
    observer.observe(bubble, { childList: true, subtree: true });
  }
})();

// Anything required to hook into page scrolling
(function() {
  const header = document.querySelector('.section-header');
  if (header) {
    document.documentElement.style.setProperty('--header-start-live', `${header.getBoundingClientRect().top < 0 ? 0 : header.getBoundingClientRect().top}px`);

    window.addEventListener('scroll', () => {
      requestAnimationFrame(() => {
        document.documentElement.style.setProperty('--header-start-live', `${header.getBoundingClientRect().top < 0 ? 0 : header.getBoundingClientRect().top}px`);
      });
    } , { passive: true });
  }
})();

(function () {
  const dispatchIdleEvent = () => {
    window.dispatchEvent(new Event('browserIsIdle'));
    if ('requestIdleCallback' in window) {
      setTimeout(() => {
        window.dispatchEvent(new Event('browserIsVeryIdle'));
      }, 8000);
    }
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => dispatchIdleEvent());
  } else {
    window.setTimeout(() => dispatchIdleEvent(), 8000);
  }
})();

document.addEventListener('keydown', (event) => {
  // Check if the key is "Enter" and the target has the class ".js-prevent-enter-submit"
  if (event.key === 'Enter' && event.target.classList.contains('js-prevent-enter-submit')) {
    event.preventDefault(); // Prevent the default form submission
  }
});

// Smooth anchor scrolling
document.addEventListener('click', function (event) {
  // Check if the clicked element is an anchor link
  const anchor = event.target.closest('a[href^="#"]:not(.no-scroll)');
  if (!anchor) return;

  // Prevent the default anchor behavior
  event.preventDefault();

  // Get the target element from the href attribute
  const targetId = anchor.getAttribute('href').slice(1);
  const targetElement = document.getElementById(targetId);

  // If the target element exists, perform smooth scrolling
  if (targetElement) {
    // Get the header height from the CSS variable, defaulting to 0 if not set
    const headerHeight = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--header-height-live') || '0'
    );

    window.scrollTo({
      top: targetElement.getBoundingClientRect().top + window.scrollY - headerHeight,
      behavior: 'smooth',
    });
  }
});