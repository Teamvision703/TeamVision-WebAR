import { UIController } from './ui.js';
import { TrackerController } from './tracker.js';
import { EffectsController } from './effects.js';

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // Verify that A-Frame and MindAR CDN are correctly loaded
  const isAFrameLoaded = typeof window.AFRAME !== 'undefined';
  const isMindARLoaded = isAFrameLoaded && window.AFRAME.systems['mindar-image-system'];

  if (isAFrameLoaded && isMindARLoaded) {
    console.log('✔ MindAR Loaded');
  } else {
    console.warn('✘ MindAR/A-Frame CDN verification failed.');
  }

  // Initialize UI Controller
  const ui = new UIController();

  // Initialize Effects (registers the tv-rotate component)
  const effects = new EffectsController();
  effects.init();

  // Initialize Tracker
  const tracker = new TrackerController(ui);
  tracker.init();

  // Bind the Start AR button callback
  ui.init(() => {
    tracker.start();
  });
});

