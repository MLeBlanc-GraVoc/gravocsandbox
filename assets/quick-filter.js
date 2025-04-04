if (!customElements.get('quick-filter')) {
  class QuickFilter extends HTMLElement {

    constructor() {
      super();
      this.select1 = this.querySelector('.js-filter-select-1');
      this.select2 = this.querySelector('.js-filter-select-2');
      this.select3 = this.querySelector('.js-filter-select-3');
      this.button = this.querySelector('.js-filter-submit');
      this.minSearchItems = Number(this.dataset.searchMinItems);
      this.init = debounce(this.doInit.bind(this), 300);

      this.handleSelectChange = this.handleSelectChange.bind(this);
      this.handleSubmit = this.handleSubmit.bind(this);

      document.addEventListener('shopify:section:reorder', (evt) => {
        if (evt.target.contains(this)) {
          setTimeout(() => { this.destroy(); }, 100);
          setTimeout(() => { this.init(); }, 500);
        }
      });
    }

    connectedCallback() {
      if (window.sectionInstances.has(this)) {
        return; // Already initialized, ignore
      }

      window.sectionInstances.set(this, true);
      this.init();
    }

    disconnectedCallback() {
      this.destroy();
    }

    destroy() {
      try { this.niceSelect1?.destroy(); } catch (err) {}
      try { this.niceSelect2?.destroy(); } catch (err) {}
      try { this.niceSelect3?.destroy(); } catch (err) {}

      this.querySelectorAll('.nice-select').forEach(select => select.remove());

      // Remove NiceSelect styles
      this.select1?.removeAttribute('style');
      this.select2?.removeAttribute('style');
      this.select3?.removeAttribute('style');

      // Remove event listeners for change events
      this.select1.removeEventListener('change', this.handleSelectChange);
      this.select2?.removeEventListener('change', this.handleSelectChange);
      this.select3?.removeEventListener('change', this.handleSelectChange);
      this.button.removeEventListener('click', this.handleSubmit);
    }

    doInit() {
      // Add event listeners for change events
      this.select1.addEventListener('change', this.handleSelectChange);
      this.select2?.addEventListener('change', this.handleSelectChange);
      this.select3?.addEventListener('change', this.handleSelectChange);
      this.button.addEventListener('click', this.handleSubmit);

      // Preselect the dropdown values
      if (this.dataset.preselect) {
        let select1Index = 0;
        let select2Index = 0;
        let select3Index = 0;

        function isMatchingUrl(optionUrl) {
          const pageUrl = window.location.href;
          const pageUrlWithoutFirstPath = new URL(window.location.href).href.replace(new URL(window.location.href).origin + '/' + window.location.pathname.split('/')[1], new URL(window.location.href).origin);
          const pageUrlWithoutDomain = window.location.pathname + window.location.search;
          const pageUrlWithoutDomainAndFirstPath = pageUrlWithoutDomain.replace(/^\/[^/]+/, '');

          // Function to decode and normalize URLs (handle spaces and encoded characters)
          const normalizeUrl = (url) => {
            return decodeURIComponent(url)  // Decode any percent-encoded characters
              .replace(/\+/g, ' ')         // Normalize spaces encoded as "+" to " "
              .replace(/%20/g, ' ');       // Replace "%20" (space) with " " for uniformity
          };

          // Normalize all URLs
          const normalizedPageUrl = normalizeUrl(pageUrl);
          const normalizedPageUrlWithoutDomain = normalizeUrl(pageUrlWithoutDomain);
          const normalizedPageUrlWithoutFirstPath = normalizeUrl(pageUrlWithoutFirstPath);
          const normalizedPageUrlWithoutDomainAndFirstPath = normalizeUrl(pageUrlWithoutDomainAndFirstPath);
          const normalizedOptionUrl = normalizeUrl(optionUrl);

          // Compare normalized URLs
          return normalizedOptionUrl === normalizedPageUrl ||
            normalizedOptionUrl === normalizedPageUrlWithoutDomain ||
            normalizedOptionUrl === normalizedPageUrlWithoutFirstPath ||
            normalizedOptionUrl === normalizedPageUrlWithoutDomainAndFirstPath;
        }

        // Check for matches in the third select
        if (this.select3) {
          for (const option of this.select3.options) {
            if (isMatchingUrl(option.dataset.url)) {
              // If there's a match with URL or pathname, prioritize it
              select3Index = option.index;
              break;
            }
          }

          // If no URL/pathname match is found, check for the preselect match
          if (select3Index === 0) {
            for (const option of this.select3.options) {
              if (option.dataset.url === this.dataset.preselect) {
                select3Index = option.index;
                break;
              }
            }
          }
        }

        // Sort out select2
        if (select3Index === 0 && this.select2) {
          // Check for matches in the second select (URL and pathname)
          for (const option of this.select2.options) {
            if (isMatchingUrl(option.dataset.url)) {
              // If a match is found with the URL or pathname, prioritize it
              select2Index = option.index;
              break;
            }
          }

          // If no URL/pathname match is found, check for the preselect match
          if (select2Index === 0) {
            for (const option of this.select2.options) {
              if (option.dataset.url === this.dataset.preselect) {
                select2Index = option.index;
                break;
              }
            }
          }
        } else {
          const parentId = this.select3.options[select3Index].dataset.parentId;
          const option = Array.from(this.select2.options).find(option => option.id === parentId);
          select2Index = option.index;
        }

        // Sort out select1
        if (select2Index === 0) {
          for (const option of this.select1.options) {
            if (option.dataset.url === this.dataset.preselect) {
              select1Index = option.index;
              break;
            }
          }
        } else {
          const parentId = this.select2.options[select2Index].dataset.parentId;
          const option = Array.from(this.select1.options).find(option => option.id === parentId);
          select1Index = option.index;
        }

        // Update the dropdown selections
        const updateSelection = (select, index) => {
          const options = Array.from(select.options);
          options.forEach(option => option.removeAttribute('selected')); // Deselect all options
          if (options[index]) {
            options[index].setAttribute('selected', 'selected'); // Select the correct option
          }
        };

        updateSelection(this.select1, select1Index);
        this.select1.dispatchEvent(new Event('change'));

        if (this.select2) {
          updateSelection(this.select2, select2Index);
          this.select2.dispatchEvent(new Event('change'));
        }

        if (this.select3) {
          updateSelection(this.select3, select3Index);
          this.select3.dispatchEvent(new Event('change'));
        }
      }

      requestAnimationFrame(() => {
        // Initialize NiceSelect
        if (this.select1) {
          this.niceSelect1 = NiceSelect.bind(this.select1, {
            searchable: this.minSearchItems > 0 && this.select1.options.length > this.minSearchItems,
            searchtext: window.accessibilityStrings.search
          });
        }

        if (this.select2) {
          this.niceSelect2 = NiceSelect.bind(this.select2, {
            searchable: this.minSearchItems > 0,
            searchtext: window.accessibilityStrings.search
          });
        }

        if (this.select3) {
          this.niceSelect3 = NiceSelect.bind(this.select3, {
            searchable: this.minSearchItems > 0,
            searchtext: window.accessibilityStrings.search
          });
        }
      });
    }

    handleSubmit() {
      let url = null;

      if (this.select3?.selectedIndex > 0) {
        const selectedOption = this.select3.options[this.select3.selectedIndex];
        if (selectedOption.dataset.url && selectedOption.dataset.url !== '#') {
          url = selectedOption.dataset.url;
        }
      } else if (this.select2?.selectedIndex > 0) {
        const selectedOption = this.select2.options[this.select2.selectedIndex];
        if (selectedOption.dataset.url && selectedOption.dataset.url !== '#') {
          url = selectedOption.dataset.url;
        }
      } else if (this.select1?.selectedIndex > 0) {
        const selectedOption = this.select1.options[this.select1.selectedIndex];
        if (selectedOption.dataset.url && selectedOption.dataset.url !== '#') {
          url = selectedOption.dataset.url;
        }
      }

      if (url) {
        url = this.makeAbsoluteUrl(url);

        // List of Shopify first-level directories to exclude
        const shopifyDirectories = new Set([
          "products", "collections", "pages", "blogs", "cart", "checkout", "account", "search",
          "admin", "apps", "a", "challenge", "community", "discount", "gift_card",
          "s", "cdn", "metaobject", "policies", "orders", "services", "tools", "events", "news", "legal"
        ]);

        // Get the first path segment from the current URL
        const currentFirstPath = window.location.pathname.split('/')[1];

        // Get the first path segment from the given URL
        const urlFirstPath = new URL(url).pathname.split('/')[1];

        // Check if the first path segments are different and the currentFirstPath is not a Shopify directory
        if (currentFirstPath !== urlFirstPath && !shopifyDirectories.has(currentFirstPath)) {
          // Modify the URL by inserting the first path segment of the current URL
          const modifiedUrl = new URL(url);
          modifiedUrl.pathname = `${currentFirstPath}${modifiedUrl.pathname}`;

          // Redirect to the modified URL
          window.location.href = modifiedUrl.href;
        } else {
          // If the first path segments are the same or in the exclusion list, just set the URL
          window.location.href = url;
        }
      }
    }

    makeAbsoluteUrl(url) {
      // Check if the URL contains the domain (i.e., it's already absolute)
      if (url.includes(window.location.origin)) {
        return url; // If it's already absolute, return as is
      }

      // If it's a relative path, prepend the domain
      const domain = window.location.origin;
      return domain + (url.startsWith('/') ? url : '/' + url);
    }

    handleSelectChange(event) {
      const currentSelect = event.target;
      const selectedOption = currentSelect.options[currentSelect.selectedIndex];

      // Enable/disable the submit button.
      if (!selectedOption.dataset.url || selectedOption.dataset.url === '#') {
        this.button.setAttribute('disabled', 'disabled');
      } else {
        this.button.removeAttribute('disabled');
      }

      const nextSelect =
        currentSelect === this.select1 ? this.select2 :
          currentSelect === this.select2 ? this.select3 : null;
      if (!nextSelect) return;

      // Prepare the next select
      const options = Array.from(nextSelect.options);
      let optionsShown = 0;

      // Iterate over each <option> in the next select and toggle visibility
      options.slice(1).forEach(option => {
        if (option.dataset.parentId === selectedOption.id) {
          optionsShown++;
          option.removeAttribute('disabled');
          option.removeAttribute('hidden');
        } else {
          option.setAttribute('hidden', 'hidden');
          option.setAttribute('disabled', 'disabled');
        }
      });

      // Show/hide the search bar
      nextSelect.closest('.quick-filter__select-container').classList.toggle(
        'quick-filter__hide-search', optionsShown < this.minSearchItems);

      // Open the next select
      if (this.dataset.autoOpenNextDropdown) {
        requestAnimationFrame(() => {
          if (nextSelect === this.select2) this.querySelector('.nice-select.js-filter-select-2:has(.option:not(:first-child):not(.disabled))')?.click();
          if (nextSelect === this.select3) this.querySelector('.nice-select.js-filter-select-3:has(.option:not(:first-child):not(.disabled))')?.click();
        });
      }

      // Enable or disable the next select based on visible options
      if (optionsShown > 0) {
        nextSelect.removeAttribute('disabled');
      } else {
        nextSelect.setAttribute('disabled', 'disabled');
      }

      // Reset the selects
      nextSelect.querySelector('option').setAttribute('selected', 'selected');
      if (this.select2 && nextSelect === this.select2) {
        if (this.select3) this.select3.querySelector('option').setAttribute('selected', 'selected');
        this.select3?.setAttribute('disabled', 'disabled');
        this.niceSelect3?.update();
      }

      // Update NiceSelect
      if (this.select2 && nextSelect === this.select2) {
        this.niceSelect2?.update();
      } else if (this.select3 && nextSelect === this.select3) {
        this.niceSelect3?.update();
      }
    }
  }

  customElements.define('quick-filter', QuickFilter);
}