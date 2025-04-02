/**
 * EngageIQ Chrome Extension - Accordion Controller Module (accordion-controller.js)
 *
 * This module handles the accordion UI behavior in the extension.
 * It is responsible for:
 *  - Toggling accordion items (both with Bootstrap and with a fallback)
 *  - Managing event listeners for accordion items
 *  - Providing a clean interface for accordion operations
 */

// Log module load confirmation - Compliant with user preference
console.log('EngageIQ: Accordion Controller Module Loaded');

/**
 * Initializes a Bootstrap accordion with fallback behavior
 * @param {HTMLElement} accordionElement - The accordion container element
 * @param {Object} [options] - Optional configuration options
 * @param {string} [options.toggleSelector='[data-bs-toggle="collapse"]'] - Selector for toggle buttons
 * @param {string} [options.collapseSelector='.accordion-collapse'] - Selector for collapsible elements
 * @returns {Object} Controller object with methods to manipulate the accordion
 */
export function initAccordion(accordionElement, options = {}) {
  if (!accordionElement) {
    console.warn('EngageIQ: Cannot initialize accordion - element not provided');
    return null;
  }
  
  const config = {
    toggleSelector: options.toggleSelector || '[data-bs-toggle="collapse"]',
    collapseSelector: options.collapseSelector || '.accordion-collapse',
    onToggle: options.onToggle || null
  };
  
  console.log('EngageIQ: Initializing accordion controller');
  
  // Add click listeners to all toggle buttons
  const toggleButtons = accordionElement.querySelectorAll(config.toggleSelector);
  toggleButtons.forEach(button => {
    // Remove any existing listeners to prevent duplicates
    button.removeEventListener('click', handleToggleClick);
    
    // Add the event listener
    button.addEventListener('click', handleToggleClick);
  });
  
  // Try to initialize Bootstrap's Collapse for each collapsible element
  if (window.bootstrap && window.bootstrap.Collapse) {
    try {
      const collapseElements = accordionElement.querySelectorAll(config.collapseSelector);
      collapseElements.forEach(element => {
        new window.bootstrap.Collapse(element, {
          toggle: false
        });
        console.log(`EngageIQ: Initialized Bootstrap collapse for #${element.id}`);
      });
    } catch (error) {
      console.error('EngageIQ: Error initializing Bootstrap:', error);
    }
  }
  
  /**
   * Toggle handler for accordion items
   * @param {Event} event - Click event
   */
  function handleToggleClick(event) {
    event.preventDefault(); // Prevent default behavior
    
    const button = event.currentTarget;
    const targetId = button.getAttribute('data-bs-target');
    
    if (!targetId) return;
    
    toggleAccordionItem(button, targetId);
    
    // Call onToggle callback if provided
    if (config.onToggle && typeof config.onToggle === 'function') {
      config.onToggle(button, button.getAttribute('aria-expanded') === 'true');
    }
  }
  
  /**
   * Public API for the accordion controller
   */
  return {
    /**
     * Toggle a specific accordion item
     * @param {string} itemId - The ID of the accordion item to toggle (with or without #)
     * @param {boolean} [expand] - Optional, force expand (true) or collapse (false)
     */
    toggle: function(itemId, expand) {
      const id = itemId.startsWith('#') ? itemId : `#${itemId}`;
      const button = accordionElement.querySelector(`[data-bs-target="${id}"]`);
      
      if (button) {
        toggleAccordionItem(button, id, expand);
      } else {
        console.warn(`EngageIQ: Could not find accordion button for ${id}`);
      }
    },
    
    /**
     * Close all accordion items
     */
    closeAll: function() {
      const openItems = accordionElement.querySelectorAll(`${config.collapseSelector}.show`);
      openItems.forEach(item => {
        const id = `#${item.id}`;
        const button = accordionElement.querySelector(`[data-bs-target="${id}"]`);
        
        if (button) {
          toggleAccordionItem(button, id, false);
        }
      });
    },
    
    /**
     * Get the currently expanded accordion item
     * @returns {string|null} ID of the expanded item or null if none
     */
    getExpandedItem: function() {
      const openItem = accordionElement.querySelector(`${config.collapseSelector}.show`);
      return openItem ? openItem.id : null;
    },
    
    /**
     * Add a custom event listener to the accordion
     * @param {string} eventType - Event type to listen for (e.g., 'click')
     * @param {string} selector - CSS selector for delegate
     * @param {Function} handler - Event handler function
     */
    on: function(eventType, selector, handler) {
      // Use event delegation
      accordionElement.addEventListener(eventType, event => {
        const target = event.target.closest(selector);
        if (target && accordionElement.contains(target)) {
          handler(event, target);
        }
      });
    }
  };
}

/**
 * Toggle an accordion item with Bootstrap or fallback behavior
 * @param {HTMLElement} button - The toggle button element
 * @param {string} targetId - The target collapse element ID selector (e.g., '#collapseOne')
 * @param {boolean} [forceState] - Optional, force a specific state (true=expand, false=collapse)
 */
export function toggleAccordionItem(button, targetId, forceState) {
  if (!button || !targetId) {
    console.warn('EngageIQ: Cannot toggle accordion - missing required parameters');
    return;
  }

  const collapseElement = document.querySelector(targetId);
  if (!collapseElement) {
    console.warn(`EngageIQ: Could not find accordion element ${targetId}`);
    return;
  }

  // Check if Bootstrap's Collapse is available
  if (window.bootstrap && window.bootstrap.Collapse) {
    // Try to use Bootstrap
    try {
      const bsCollapse = window.bootstrap.Collapse.getInstance(collapseElement);
      if (bsCollapse) {
        if (forceState === true) {
          bsCollapse.show();
        } else if (forceState === false) {
          bsCollapse.hide();
        } else {
          bsCollapse.toggle();
        }
      } else {
        // Initialize and toggle if not already initialized
        const newCollapse = new window.bootstrap.Collapse(collapseElement, {
          toggle: false
        });
        if (forceState === true) {
          newCollapse.show();
        } else if (forceState === false) {
          newCollapse.hide();
        } else {
          newCollapse.toggle();
        }
      }
      return;
    } catch (error) {
      console.warn(
        'EngageIQ: Bootstrap Collapse error, using manual toggle:',
        error
      );
    }
  }

  // Manual toggle as fallback
  const isCurrentlyExpanded = button.getAttribute('aria-expanded') === 'true';
  
  // Determine whether to expand or collapse
  const shouldExpand = forceState !== undefined ? forceState : !isCurrentlyExpanded;
  
  // For accordion behavior: close all other items first
  if (shouldExpand) {
    const accordion = collapseElement.closest('.accordion');
    if (accordion) {
      document.querySelectorAll(`${accordion.id} .accordion-collapse.show`).forEach((item) => {
        // Skip if this is our target
        if (item.id === collapseElement.id) return;

        // Close this item
        item.classList.remove('show');
        const headerButton = document.querySelector(
          `[data-bs-target="#${item.id}"]`
        );
        if (headerButton) {
          headerButton.classList.add('collapsed');
          headerButton.setAttribute('aria-expanded', 'false');
        }
      });
    }
  }

  // Now set our target to the desired state
  if (shouldExpand) {
    collapseElement.classList.add('show');
    button.classList.remove('collapsed');
    button.setAttribute('aria-expanded', 'true');
  } else {
    collapseElement.classList.remove('show');
    button.classList.add('collapsed');
    button.setAttribute('aria-expanded', 'false');
  }

  console.log(`EngageIQ: Manually ${shouldExpand ? 'expanded' : 'collapsed'} accordion for ${button.textContent}`);
}
