if (!customElements.get('quick-add-modal')) {
  customElements.define(
    'quick-add-modal',
    class QuickAddModal extends ModalDialog {
      constructor() {
        super();
        this.modalContent = this.querySelector('[id^="QuickAddInfo-"]');
        this.productCard = this.closest('.product-card');
        this.productUrl = this.productCard.querySelector('a[id^="CardLink"]')?.href;
        this.productTitle = this.productCard.querySelector('a[id^="CardLink"]')?.textContent;
        this.preloadData = null;
        this.isPreloading = false;

        // if (window.matchMedia('(hover: hover)').matches) {
        //   this.productCard.addEventListener('mouseover', () => {
        //     if (!this.preloadData && !this.isPreloading) {
        //       this.isPreloading = true;
        //       this.fetchProductData().then(data => {
        //         this.preloadData = data;
        //         this.isPreloading = false;
        //       });
        //     }
        //   });
        // }
      }

      fetchProductData() {
        return fetch(this.productUrl)
          .then(response => response.text())
          .then(responseText => {
            const responseHTML = new DOMParser().parseFromString(responseText, 'text/html');
            this.productElement = responseHTML.querySelector('div[id^="MainProduct-"]');
            this.productElement.classList.forEach(classApplied => {
              if (classApplied.startsWith('color-') || classApplied === 'gradient')
                this.modalContent.classList.add(classApplied);
            });
            this.preventDuplicatedIDs();
            this.removeDOMElements();
            return this.productElement.innerHTML; // Return the processed HTML as the data to preload
          });
      }

      hide(preventFocus = false) {
        const cartNotification = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
        if (cartNotification) cartNotification.setActiveElement(this.openedBy);
        this.modalContent.innerHTML = '';

        if (preventFocus) this.openedBy = null;
        publish(PUB_SUB_EVENTS.quickViewClose);
        super.hide();
      }

      show(opener) {
        opener.setAttribute('aria-disabled', true);
        opener.classList.add('loading');
        opener.querySelector('.loading__spinner').classList.remove('hidden');

        const finalizeShow = (productHTML) => {
          this.setInnerHTML(this.modalContent, productHTML);

          if (window.Shopify && Shopify.PaymentButton) {
            Shopify.PaymentButton.init();
          }

          if (window.ProductModel) window.ProductModel.loadShopifyXR();

          this.removeGalleryListSemantic();
          this.updateImageSizes();
          this.preventVariantURLSwitching();
          this.prependProductTitle();
          window.renderSelects();
          window.loadDesktopOnlyTemplates();
          super.show(opener);

          opener.removeAttribute('aria-disabled');
          opener.classList.remove('loading');
          opener.querySelector('.loading__spinner').classList.add('hidden');

          publish(PUB_SUB_EVENTS.quickViewOpen);
          publish('quick-buy-action-complete');

          setTimeout(() => {
            if (window.ProductModel) window.ProductModel.loadShopifyXR();
          }, 500);
        };

        if (this.preloadData) {
          finalizeShow(this.preloadData);
        } else {
          this.productUrl = opener.getAttribute('data-product-url');
          this.fetchProductData().then(finalizeShow);
        }
      }

      setInnerHTML(element, html) {
        element.innerHTML = html;

        // Reinjects the script tags to allow execution. By default, scripts are disabled when using element.innerHTML.
        element.querySelectorAll('script').forEach((oldScriptTag) => {
          const newScriptTag = document.createElement('script');
          Array.from(oldScriptTag.attributes).forEach((attribute) => {
            newScriptTag.setAttribute(attribute.name, attribute.value);
          });
          newScriptTag.appendChild(document.createTextNode(oldScriptTag.innerHTML));
          oldScriptTag.parentNode.replaceChild(newScriptTag, oldScriptTag);
        });
      }

      preventVariantURLSwitching() {
        const variantPicker = this.modalContent.querySelector('variant-selects');
        if (!variantPicker) return;

        variantPicker.setAttribute('data-update-url', 'false');
      }

      removeDOMElements() {
        const pickupAvailability = this.productElement.querySelector('pickup-availability');
        if (pickupAvailability) pickupAvailability.remove();

        const productModal = this.productElement.querySelector('product-modal');
        if (productModal) productModal.remove();

        const modalDialog = this.productElement.querySelectorAll('modal-dialog');
        if (modalDialog) modalDialog.forEach((modal) => modal.remove());
      }

      preventDuplicatedIDs() {
        const sectionId = this.productElement.dataset.section;
        this.productElement.innerHTML = this.productElement.innerHTML.replaceAll(sectionId, `quickadd-${sectionId}`);
        this.productElement.querySelectorAll('variant-selects, product-info').forEach((element) => {
          element.dataset.originalSection = sectionId;
        });
      }

      removeGalleryListSemantic() {
        const galleryList = this.modalContent.querySelector('[id^="Slider-Gallery"]');
        if (!galleryList) return;

        galleryList.setAttribute('role', 'presentation');
        galleryList.querySelectorAll('[id^="Slide-"]').forEach((li) => li.setAttribute('role', 'presentation'));
      }

      updateImageSizes() {
        const product = this.modalContent.querySelector('.product');
        const desktopColumns = product.classList.contains('product--columns');
        if (!desktopColumns) return;

        const mediaImages = product.querySelectorAll('.product__media img');
        if (!mediaImages.length) return;

        let mediaImageSizes =
          '(min-width: 1000px) 715px, (min-width: 750px) calc((100vw - 11.5rem) / 2), calc(100vw - 4rem)';

        if (product.classList.contains('product--medium')) {
          mediaImageSizes = mediaImageSizes.replace('715px', '605px');
        } else if (product.classList.contains('product--small')) {
          mediaImageSizes = mediaImageSizes.replace('715px', '495px');
        }

        mediaImages.forEach((img) => img.setAttribute('sizes', mediaImageSizes));
      }

      prependProductTitle() {
        const product = this.modalContent.querySelector('.product');
        if (!product.querySelector('.product__title')) {
          const container = product.querySelector('product-info .product__info-container');
          const productTitleHTML = `
              <div class="product__title">
                <a href="${this.productUrl}" class="link un-underlined-link">
                  <h2 class="h2 mt-0">
                    ${this.productTitle}
                    <span class="product__read-more block underlined-link t4">${window.strings.product.readMore}</span>
                  </h2>
                </a>
              </div>`;
          container.innerHTML = productTitleHTML + container.innerHTML;
        }
      }
    }
  );
}
