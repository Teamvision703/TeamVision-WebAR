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
          threshold: { type: 'number', default: 0.15, is: 'uniform' },
          opacity: { type: 'number', default: 1.0, is: 'uniform' }
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
          uniform float opacity;
          void main() {
            vec4 texColor = texture2D(src, vUv);
            // Calculate brightness using standard relative luminance formula
            float brightness = 0.2126 * texColor.r + 0.7152 * texColor.g + 0.0722 * texColor.b;
            if (brightness < threshold) {
              discard; // Transparent cutout for black background
            } else {
              gl_FragColor = vec4(texColor.rgb, texColor.a * opacity);
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
                  threshold: 0.12,
                  transparent: true,
                  opacity: 0.0
                });
              } else {
                console.log('✔ Non-black background detected. Using standard flat shader.');
                el.setAttribute('material', {
                  shader: 'flat',
                  src: '#intro-video',
                  transparent: true,
                  opacity: 0.0
                });
              }
            } catch (e) {
              // Fallback to flat shader if canvas is tainted/cross-origin issue
              el.setAttribute('material', {
                shader: 'flat',
                src: '#intro-video',
                transparent: true,
                opacity: 0.0
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

    // Register custom A-Frame component for the premium ambient glow
    if (window.AFRAME && !window.AFRAME.components['ambient-glow']) {
      window.AFRAME.registerComponent('ambient-glow', {
        init: function () {
          const el = this.el;
          
          // Generate high-end radial gradient canvas texture
          const canvas = document.createElement('canvas');
          canvas.width = 512;
          canvas.height = 512;
          const ctx = canvas.getContext('2d');
          
          const grad = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
          // Center: soft metallic gold
          grad.addColorStop(0.0, 'rgba(212, 175, 55, 0.45)');
          // Middle: dark burgundy
          grad.addColorStop(0.25, 'rgba(128, 0, 32, 0.65)');
          // Outer: deep maroon
          grad.addColorStop(0.6, 'rgba(74, 0, 10, 0.85)');
          // Edge: fully transparent
          grad.addColorStop(1.0, 'rgba(74, 0, 10, 0.0)');
          
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, 512, 512);
          
          el.setAttribute('material', {
            shader: 'flat',
            src: canvas,
            transparent: true,
            opacity: 0.0,
            depthWrite: false
          });

          el.setAttribute('geometry', {
            primitive: 'plane',
            width: 2.2,
            height: 2.2
          });
          
          // Position slightly behind the video plane
          el.setAttribute('position', '0 0 0.01');
          
          this.time = 0;
          this.isBreathing = false;
        },
        
        tick: function (time, timeDelta) {
          if (!this.isBreathing) return;
          
          this.time += timeDelta;
          // Breathing cycle: ~2.8 seconds
          const cycle = (2 * Math.PI * this.time) / 2800;
          // Breathing opacity between 0.30 and 0.45
          const breathingOpacity = 0.375 + Math.sin(cycle) * 0.075;
          this.el.setAttribute('material', 'opacity', breathingOpacity);
        },
        
        startBreathing: function () {
          this.isBreathing = true;
          this.time = 0;
        },
        
        stopBreathing: function () {
          this.isBreathing = false;
        }
      });
    }
  }
}

