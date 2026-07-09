/**
 * Effects and Animations Controller for Team Vision WebAR application.
 * Manages video playback, custom shaders, and AR visual adjustments.
 */

export class EffectsController {
  constructor() {
    this.videoEl = null;
    this.planeEl = null;
  }

  /**
   * Initializes the effects controller.
   * Registers A-Frame components and custom shaders.
   */
  init() {
    const self = this;

    // Register black keying shader to transparency-key solid black backgrounds
    if (window.AFRAME && !window.AFRAME.shaders['blackkey']) {
      window.AFRAME.registerShader('blackkey', {
        schema: {
          src: { type: 'map', is: 'uniform' },
          threshold: { type: 'number', default: 0.15, is: 'uniform' }
        },
        raw: false,
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec2 vUv;
          uniform sampler2D src;
          uniform float threshold;
          void main() {
            vec4 texColor = texture2D(src, vUv);
            // Calculate brightness using standard relative luminance formula
            float brightness = 0.2126 * texColor.r + 0.7152 * texColor.g + 0.0722 * texColor.b;
            if (brightness < threshold) {
              discard; // Transparent cutout for black background
            } else {
              gl_FragColor = texColor;
            }
          }
        `
      });
    }

    // Register custom A-Frame component to handle video auto-sizing and shader selection
    if (window.AFRAME && !window.AFRAME.components['video-handler']) {
      window.AFRAME.registerComponent('video-handler', {
        init: function () {
          const el = this.el;
          const video = document.querySelector('#intro-video');
          if (!video) return;

          const adjustAspectRatio = () => {
            const width = 1.0; // Normalise to image target width
            const height = video.videoHeight / video.videoWidth;
            
            el.setAttribute('geometry', {
              primitive: 'plane',
              width: width,
              height: height
            });

            // Adjust position so it floats naturally slightly in front of marker (Z-offset to prevent z-fighting)
            el.setAttribute('position', `0 0 0.02`);
            
            console.log(`✔ Video loaded: Resolution=${video.videoWidth}x${video.videoHeight}, Aspect Ratio=${(video.videoWidth/video.videoHeight).toFixed(2)}`);
          };

          // Detect if video background is black to apply chromakey
          const detectBackground = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 50;
            canvas.height = 50;
            const ctx = canvas.getContext('2d');
            
            try {
              ctx.drawImage(video, 0, 0, 50, 50);
              const imgData = ctx.getImageData(0, 0, 50, 50).data;
              let darkPixels = 0;
              const totalPixels = imgData.length / 4;

              for (let i = 0; i < imgData.length; i += 4) {
                const r = imgData[i];
                const g = imgData[i + 1];
                const b = imgData[i + 2];
                // Check if pixel is very close to black
                if (r < 25 && g < 25 && b < 25) {
                  darkPixels++;
                }
              }

              const isBlackBg = (darkPixels / totalPixels) > 0.4;
              if (isBlackBg) {
                console.log('✔ Black background detected. Applying transparency key shader.');
                el.setAttribute('material', {
                  shader: 'blackkey',
                  src: '#intro-video',
                  threshold: 0.12
                });
              } else {
                console.log('✔ Non-black background detected. Using standard flat shader.');
                el.setAttribute('material', {
                  shader: 'flat',
                  src: '#intro-video'
                });
              }
            } catch (e) {
              // Fallback to flat shader if canvas is tainted/cross-origin issue
              el.setAttribute('material', {
                shader: 'flat',
                src: '#intro-video'
              });
            }
          };

          if (video.readyState >= 2) {
            adjustAspectRatio();
            detectBackground();
          } else {
            video.addEventListener('loadeddata', () => {
              adjustAspectRatio();
              detectBackground();
            });
          }
        }
      });
    }
  }
}
