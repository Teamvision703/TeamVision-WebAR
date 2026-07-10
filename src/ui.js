/**
 * UI Controller for Team Vision WebAR application.
 * Manages the Welcome Screen, Tracking Status, and Overlay States.
 */

export class UIController {
  constructor() {
    this.welcomeScreen = document.getElementById('welcome-screen');
    this.startBtn = document.getElementById('start-ar-btn');
    this.statusOverlay = document.getElementById('status-overlay');
    this.statusText = document.getElementById('status-text');
    this.fadeTimeout = null;
  }

  /**
   * Initializes UI event listeners.
   * @param {Function} onStartARCallback - Called when user clicks "Start AR".
   */
  init(onStartARCallback) {
    if (this.startBtn) {
      this.startBtn.addEventListener('click', () => {
        this.hideWelcomeScreen();
        this.showStatusOverlay();
        onStartARCallback();
      });
    }
  }

  /**
   * Hides the Welcome Screen.
   */
  hideWelcomeScreen() {
    if (this.welcomeScreen) {
      this.welcomeScreen.classList.add('hidden');
    }
  }

  /**
   * Shows the tracking status overlay.
   */
  showStatusOverlay() {
    if (this.statusOverlay) {
      this.statusOverlay.classList.remove('hidden');
      this.statusOverlay.classList.remove('fade-out');
    }
  }

  /**
   * Updates the displayed tracking status.
   * @param {'searching' | 'detected' | 'lost'} state
   */
  updateStatus(state) {
    if (!this.statusText) return;

    // Reset overlay animations and transitions
    if (this.fadeTimeout) {
      clearTimeout(this.fadeTimeout);
      this.fadeTimeout = null;
    }
    
    if (this.statusOverlay) {
      this.statusOverlay.classList.remove('fade-out');
      this.showStatusOverlay();
    }

    switch (state) {
      case 'searching':
        this.statusText.textContent = 'Searching for Team Vision...';
        this.statusText.className = 'status-searching';
        break;
      case 'detected':
        this.statusText.textContent = 'Artwork Detected';
        this.statusText.className = 'status-detected';
        
        // Remain visible for ~1 second, then fade out completely
        this.fadeTimeout = setTimeout(() => {
          if (this.statusOverlay) {
            this.statusOverlay.classList.add('fade-out');
          }
        }, 1000);
        break;
      case 'lost':
        this.statusText.textContent = 'Tracking Lost';
        this.statusText.className = 'status-lost';
        break;
    }
  }

  /**
   * Shows a specific launch error message.
   * @param {string} message
   */
  showError(message) {
    this.showStatusOverlay();
    if (this.statusText) {
      this.statusText.textContent = message;
      this.statusText.className = 'status-lost';
    }
  }
}

