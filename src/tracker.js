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

    // Timing and transition state
    this.detectionTimeout = null;
    this.lossTimeout = null;
    this.isTargetFound = false;
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
      this.isTargetFound = true;

      // Flicker protection: If we lost target and found it again within 150ms, cancel fade out
      if (this.lossTimeout) {
        clearTimeout(this.lossTimeout);
        this.lossTimeout = null;
        console.log('✔ Tracking loss hold cancelled (flicker protection)');
        this.uiController.updateStatus('detected');
        return;
      }

      this.uiController.updateStatus('detected');
      
      const videoEl = document.querySelector('#intro-video');
      const videoPlane = document.querySelector('#intro-video-plane');
      const glowPlane = document.querySelector('#ambient-glow-plane');

      if (glowPlane) {
        // Stop any running animations
        if (glowPlane._animationFrameId) {
          cancelAnimationFrame(glowPlane._animationFrameId);
        }
        const glowComp = glowPlane.components['ambient-glow'];
        if (glowComp) glowComp.stopBreathing();

        glowPlane.setAttribute('visible', 'true');
        this.targetEl.setAttribute('visible', 'true');

        // Fade in glow to 0.35 over 300ms
        this.animateOpacity(glowPlane, 0.35, 300, () => {
          if (glowComp && this.isTargetFound) {
            glowComp.startBreathing();
          }
        });
      }

      // Pre-delay of 200ms before starting video fade-in
      this.detectionTimeout = setTimeout(() => {
        if (!this.isTargetFound) return;

        if (videoEl && videoPlane) {
          if (videoPlane._animationFrameId) {
            cancelAnimationFrame(videoPlane._animationFrameId);
          }
          videoPlane.setAttribute('visible', 'true');
          
          // Reset and play
          videoEl.currentTime = 0;
          videoEl.play().catch((err) => {
            console.warn('Playback block or error:', err);
          });

          // Fade video in over 400ms
          this.animateOpacity(videoPlane, 1.0, 400);
        }
      }, 200);
    });

    this.targetEl.addEventListener('targetLost', () => {
      console.log('✔ Target Lost event received');
      this.isTargetFound = false;

      // Cancel detection if it hasn't fired yet
      if (this.detectionTimeout) {
        clearTimeout(this.detectionTimeout);
        this.detectionTimeout = null;
      }

      // Hold current frame for 150ms to prevent visual flickers
      this.lossTimeout = setTimeout(() => {
        this.lossTimeout = null;
        console.log('✔ Hold time elapsed. Fading out entities.');
        this.uiController.updateStatus('lost');
        
        const videoEl = document.querySelector('#intro-video');
        const videoPlane = document.querySelector('#intro-video-plane');
        const glowPlane = document.querySelector('#ambient-glow-plane');

        // Keep parent visible during fade out
        this.targetEl.setAttribute('visible', 'true');

        let fadeOutCount = 0;
        const totalPlanes = (videoPlane ? 1 : 0) + (glowPlane ? 1 : 0);

        const onFadeOutComplete = () => {
          fadeOutCount++;
          if (fadeOutCount >= totalPlanes) {
            if (videoEl) {
              videoEl.pause();
              videoEl.currentTime = 0;
            }
            if (videoPlane) videoPlane.setAttribute('visible', 'false');
            if (glowPlane) glowPlane.setAttribute('visible', 'false');
            
            // Finally hide target completely
            this.targetEl.setAttribute('visible', 'false');
          }
        };

        if (glowPlane) {
          const glowComp = glowPlane.components['ambient-glow'];
          if (glowComp) glowComp.stopBreathing();
          this.animateOpacity(glowPlane, 0.0, 400, onFadeOutComplete);
        }

        if (videoPlane) {
          this.animateOpacity(videoPlane, 0.0, 400, onFadeOutComplete);
        }
      }, 150);
    });

    this.isInitialized = true;
  }

  /**
   * Helper method to animate standard A-Frame material opacity
   */
  animateOpacity(el, targetOpacity, duration, onComplete) {
    if (el._animationFrameId) {
      cancelAnimationFrame(el._animationFrameId);
    }

    const mat = el.getAttribute('material');
    const startOpacity = mat ? (mat.opacity !== undefined ? mat.opacity : 1.0) : 0.0;
    const startTime = performance.now();

    const update = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1.0);
      const currentOpacity = startOpacity + (targetOpacity - startOpacity) * progress;

      el.setAttribute('material', 'opacity', currentOpacity);

      if (progress < 1.0) {
        el._animationFrameId = requestAnimationFrame(update);
      } else {
        el._animationFrameId = null;
        if (onComplete) onComplete();
      }
    };

    el._animationFrameId = requestAnimationFrame(update);
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
