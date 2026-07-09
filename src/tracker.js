/**
 * MindAR Image Tracker Controller.
 * Handles A-Frame scene initialization, starting tracking, and target events.
 */

export class TrackerController {
  constructor(uiController) {
    this.uiController = uiController;
    this.sceneEl = document.querySelector('a-scene');
    this.targetEl = document.querySelector('[mindar-image-target]');
    this.isInitialized = false;
  }

  /**
   * Initializes the tracker and sets up event listeners.
   */
  init() {
    if (!this.sceneEl || !this.targetEl || this.isInitialized) {
      return;
    }

    // Camera started / System ready event
    this.sceneEl.addEventListener('arReady', () => {
      console.log('✔ Camera Started');
    });

    // Handle MindAR initialization or compatibility errors
    this.sceneEl.addEventListener('arError', (event) => {
      const errorDetail = event.detail?.error;
      const errorMsg = errorDetail?.message || errorDetail || 'Camera access denied or browser incompatible.';
      console.error('✘ MindAR Error:', errorMsg, event);
      this.uiController.showError(`Launch Failed: ${errorMsg}`);
    });

    // Bind event listeners for target tracking state
    this.targetEl.addEventListener('targetFound', () => {
      console.log('✔ Target Found');
      this.uiController.updateStatus('detected');
      
      // Control video playback on target detection
      const videoEl = document.querySelector('#intro-video');
      const videoPlane = document.querySelector('#intro-video-plane');
      if (videoEl && videoPlane) {
        videoPlane.setAttribute('visible', 'true');
        videoEl.currentTime = 0;
        videoEl.play().catch((err) => {
          console.warn('Playback block or error:', err);
        });
      }
    });

    this.targetEl.addEventListener('targetLost', () => {
      console.log('✔ Target Lost');
      this.uiController.updateStatus('lost');
      
      // Stop and reset video playback when target is lost
      const videoEl = document.querySelector('#intro-video');
      const videoPlane = document.querySelector('#intro-video-plane');
      if (videoEl && videoPlane) {
        videoEl.pause();
        videoEl.currentTime = 0;
        videoPlane.setAttribute('visible', 'false');
      }
    });

    this.isInitialized = true;
  }

  /**
   * Programmatically requests camera permission and starts the MindAR system.
   */
  start() {
    // Re-query in case DOM elements were loaded dynamically
    this.sceneEl = document.querySelector('a-scene');
    this.targetEl = document.querySelector('[mindar-image-target]');
    
    // Catch insecure context/local IP address restriction prior to startup
    if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      const secMsg = 'HTTPS required. WebAR cannot access the camera over insecure HTTP connections on remote devices.';
      console.error('✘ MindAR Error:', secMsg);
      this.uiController.showError(`Launch Failed: ${secMsg}`);
      return;
    }

    if (this.sceneEl && this.sceneEl.systems && this.sceneEl.systems['mindar-image-system']) {
      this.uiController.updateStatus('searching');
      // Ensure listener is attached if not already
      this.init();
      this.sceneEl.systems['mindar-image-system'].start();
    } else {
      console.error('MindAR system not ready or not loaded.');
    }
  }
}
