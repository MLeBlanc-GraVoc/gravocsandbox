if (!customElements.get('product-form')) {
  customElements.define(
    'product-form',
    class ProductForm extends HTMLElement {
      constructor() {
        super();

        this.form = this.querySelector('form');
        this.form.querySelector('[name=id]').disabled = false;
        this.form.addEventListener('submit', this.onSubmitHandler.bind(this));
        this.cartDrawer = document.querySelector('cart-drawer');
        this.cartItems = document.querySelector('cart-items');
        this.cartNotification = document.querySelector('cart-notification');
        this.submitButton = this.querySelector('[type="submit"]');
        this.ctaButton = !this.closest('.section-featured-product') ?
          this.closest('.section')?.querySelector('.sticky-cta .button') : null;

        if (document.querySelector('cart-drawer')) this.submitButton.setAttribute('aria-haspopup', 'dialog');

        this.hideErrors = this.dataset.hideErrors === 'true';

        if (this.ctaButton) {
          this.ctaButtonListener = this.ctaButtonListener || this.ctaButtonClickHandler.bind(this);
          this.ctaButton.addEventListener('click', this.ctaButtonListener);
        }
      }

      disconnectedCallback() {
        if (this.ctaButton) {
          this.ctaButton.removeEventListener('click', this.ctaButtonListener);
        }
      }

      ctaButtonClickHandler() {
        if (this.submitButton && this.submitButton.classList.contains('product-form__submit')) {
          this.submitButton.click();
        }
      }

      onSubmitHandler(evt) {
        evt.preventDefault();
        if (this.submitButton.getAttribute('aria-disabled') === 'true') return;

        this.handleErrorMessage();

        this.submitButton.setAttribute('aria-disabled', true);
        this.submitButton.classList.add('loading');
        this.querySelector('.loading__spinner')?.classList.remove('hidden');

        if (this.ctaButton) {
          this.ctaButton.setAttribute('aria-disabled', true);
          this.ctaButton.querySelector('.loading__spinner')?.classList.remove('hidden');
          this.ctaButton.classList.add('loading');
        }

        const config = fetchConfig('javascript');
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
        delete config.headers['Content-Type'];

        const formData = new FormData(this.form);

        // Get all the sections that need to be re-rendered
        let sections = [];
        if (this.cartDrawer) {
          sections = this.cartDrawer.getSectionsToRender().map((section) => section.id);
        }
        if (this.cartNotification) {
          const cartNotificationSections = this.cartNotification.getSectionsToRender().map((section) => section.id);
          sections = [...sections, ...cartNotificationSections];
        }
        if (this.cartItems) {
          const cartItemsSections = this.cartItems.getSectionsToRender().map((section) => section.section);
          sections = [...sections, ...cartItemsSections];
        }

        if (sections.length > 0) {
          formData.append('sections', [...new Set(sections)]);
          formData.append('sections_url', window.location.pathname);

          if (theme.settings.cartDrawer.atcAction === 'drawer' && this.cartDrawer) {
           this.cartDrawer.setActiveElement(document.activeElement);
          } else if (theme.settings.cartDrawer.atcAction === 'notification' && this.cartNotification) {
            this.cartNotification.setActiveElement(document.activeElement);
          }
        }

        config.body = formData;
        fetch(`${routes.cart_add_url}`, config)
          .then((response) => response.json())
          .then((response) => {
            if (response.status) {
              publish(PUB_SUB_EVENTS.cartError, {
                source: 'product-form',
                productVariantId: formData.get('id'),
                errors: response.errors || response.description,
                message: response.message,
              });
              this.handleErrorMessage(response.description);

              if (this.cartDrawer) this.cartDrawer.reload();

              const soldOutMessage = this.submitButton.querySelector('.sold-out-message');
              if (!soldOutMessage) return;
              this.submitButton.setAttribute('aria-disabled', true);
              this.submitButton.querySelector('span').classList.add('hidden');
              if (this.ctaButton) {
                this.ctaButton.setAttribute('aria-disabled', true);
                this.ctaButton.querySelector('span').classList.add('hidden');
              }
              soldOutMessage.classList.remove('hidden');
              this.error = true;
              return;
            } else if (theme.settings.cartDrawer.atcAction === 'page') {
              window.location = window.routes.cart_url;
              return;
            }

            if (response.sections === null && document.querySelector('.section-main-cart')) {
              window.location.reload();
            }

            if (!this.error)
              publish(PUB_SUB_EVENTS.cartUpdate, {
                source: 'product-form',
                productVariantId: formData.get('id'),
                cartData: response,
              });
            this.error = false;
            const quickAddModal = this.closest('quick-add-modal');
            if (quickAddModal) {
              document.body.addEventListener(
                'modalClosed',
                () => {
                  setTimeout(() => {
                    if (this.cartDrawer) this.cartDrawer.renderContents(response);
                    if (this.cartItems) this.cartItems.renderContents(response);
                    if (this.cartNotification) this.cartNotification.renderContents(response);
                  });
                },
                { once: true }
              );
              quickAddModal.hide(true);
            } else {
              if (this.cartDrawer) this.cartDrawer.renderContents(response);
              if (this.cartItems) this.cartItems.renderContents(response);
              if (this.cartNotification) this.cartNotification.renderContents(response);
            }
          })
          .catch((e) => {
            console.error(e);
          })
          .finally(() => {
            this.submitButton.classList.remove('loading');
            if (this.cartDrawer && this.cartDrawer.classList.contains('is-empty')) this.cartDrawer.classList.remove('is-empty');
            if (this.cartNotification && this.cartNotification.classList.contains('is-empty')) this.cartNotification.classList.remove('is-empty');
            if (!this.error) this.submitButton.removeAttribute('aria-disabled');

            if (this.ctaButton) {
              this.ctaButton.classList.remove('loading');
              if (!this.error) this.ctaButton.removeAttribute('aria-disabled');
              this.ctaButton.querySelector('.loading__spinner')?.classList.add('hidden');
            }
            this.querySelector('.loading__spinner')?.classList.add('hidden');

            publish('quick-buy-action-complete');
          });
      }

      handleErrorMessage(errorMessage = false) {
        if (this.hideErrors) return;

        this.errorMessageWrapper =
          this.errorMessageWrapper || this.querySelector('.product-form__error-message-wrapper');
        if (!this.errorMessageWrapper) return;
        this.errorMessage = this.errorMessage || this.errorMessageWrapper.querySelector('.product-form__error-message');

        this.errorMessageWrapper.toggleAttribute('hidden', !errorMessage);

        if (errorMessage) {
          this.errorMessage.textContent = errorMessage;

          // Scroll to the error if needed
          const elementRect = this.errorMessage.getBoundingClientRect();
          const isVisible = elementRect.top >= 0 && elementRect.bottom <= window.innerHeight && elementRect.top >= 100;

          // If the element is not visible or if the top of the element is closer than 100px to the top of the viewport
          if (!isVisible) {
            const topPosition = elementRect.top + window.pageYOffset - 150; // Calculate position with 150px padding

            window.scrollTo({
              top: topPosition,
              behavior: 'smooth'
            });
          }
        }
      }
    }
  );
}
