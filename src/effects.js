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
            // Increase transparent video size by approximately 10-15% (we use 1.13)
            const width = 1.13; 
            const height = (video.videoHeight / video.videoWidth) * width;
            
            el.setAttribute('geometry', {
              primitive: 'plane',
              width: width,
              height: height
            });

            // Keep it perfectly centred, move it upward slightly (Y = 0.05) to align with hoodie artwork
            el.setAttribute('position', `0 0.05 0.08`);
            
            console.log(`✔ Video loaded: Resolution=${video.videoWidth}x${video.videoHeight}, Scaled Width=${width}`);
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

    // Register ring-effects component for rotating rings and orbit circles
    if (window.AFRAME && !window.AFRAME.components['ring-effects']) {
      window.AFRAME.registerComponent('ring-effects', {
        init: function () {
          const el = this.el;

          // Helper to create rotating ring elements
          const createRing = (radius, thetaLength, rotationSpeed, opacity, zOffset) => {
            const ring = document.createElement('a-ring');
            ring.setAttribute('radius-inner', radius - 0.015);
            ring.setAttribute('radius-outer', radius + 0.015);
            ring.setAttribute('theta-length', thetaLength);
            ring.setAttribute('material', {
              color: '#D4AF37', // Metallic Gold
              shader: 'flat',
              transparent: true,
              opacity: opacity
            });
            ring.setAttribute('position', `0 0 ${zOffset}`);
            el.appendChild(ring);

            return { el: ring, speed: rotationSpeed, currentRot: 0 };
          };

          // Helper to create thin full orbit path circles
          const createOrbitPath = (radius, opacity, zOffset) => {
            const ring = document.createElement('a-ring');
            ring.setAttribute('radius-inner', radius - 0.003);
            ring.setAttribute('radius-outer', radius + 0.003);
            ring.setAttribute('material', {
              color: '#D4AF37',
              shader: 'flat',
              transparent: true,
              opacity: opacity
            });
            ring.setAttribute('position', `0 0 ${zOffset}`);
            el.appendChild(ring);
          };

          // Define rings array to animate in tick function
          this.rings = [];

          // Z depth order: rings live between Z=0.04 and Z=0.05
          // Concentric Orbit Circles (very subtle background paths)
          createOrbitPath(0.38, 0.15, 0.04);
          createOrbitPath(0.50, 0.20, 0.041);
          createOrbitPath(0.68, 0.12, 0.042);

          // Rotating Rings: slow movements in opposite directions
          this.rings.push(createRing(0.38, 120, 15, 0.45, 0.045));
          this.rings.push(createRing(0.38, 80, -22, 0.35, 0.046));
          this.rings.push(createRing(0.50, 160, -10, 0.40, 0.047));
          this.rings.push(createRing(0.50, 60, 18, 0.50, 0.048));
          this.rings.push(createRing(0.68, 220, 8, 0.30, 0.049));
          this.rings.push(createRing(0.68, 40, -12, 0.60, 0.05));
        },

        tick: function (time, timeDelta) {
          const deltaSec = timeDelta / 1000;
          this.rings.forEach(ring => {
            ring.currentRot += ring.speed * deltaSec;
            ring.el.setAttribute('rotation', `0 0 ${ring.currentRot}`);
          });
        }
      });
    }

    // Register hud-effects component for Circular Scan Graphics, UI decorations, small boxes, and labels
    if (window.AFRAME && !window.AFRAME.components['hud-effects']) {
      window.AFRAME.registerComponent('hud-effects', {
        init: function () {
          const el = this.el;

          // Generate HUD Canvas Texture (for fine UI lines, target brackets, data metrics)
          const canvas = document.createElement('canvas');
          canvas.width = 512;
          canvas.height = 512;
          const ctx = canvas.getContext('2d');

          // Premium HUD line-art graphics
          ctx.strokeStyle = 'rgba(212, 175, 55, 0.8)';
          ctx.fillStyle = 'rgba(212, 175, 55, 0.8)';
          ctx.lineWidth = 1.5;

          // Draw central crosshairs
          ctx.beginPath();
          ctx.moveTo(256, 180); ctx.lineTo(256, 210);
          ctx.moveTo(256, 302); ctx.lineTo(256, 332);
          ctx.moveTo(180, 256); ctx.lineTo(210, 256);
          ctx.moveTo(302, 256); ctx.lineTo(332, 256);
          ctx.stroke();

          // Draw subtle ticks/circles representing circular scan graphics
          ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)';
          ctx.beginPath();
          ctx.arc(256, 256, 120, 0, Math.PI * 2);
          ctx.stroke();

          // Technical UI decorations: Brackets in the corners
          ctx.strokeStyle = 'rgba(212, 175, 55, 0.9)';
          ctx.lineWidth = 3.0;
          const offset = 40;
          const size = 25;
          // Top Left
          ctx.beginPath();
          ctx.moveTo(offset, offset + size); ctx.lineTo(offset, offset); ctx.lineTo(offset + size, offset);
          // Top Right
          ctx.moveTo(512 - offset, offset + size); ctx.lineTo(512 - offset, offset); ctx.lineTo(512 - offset - size, offset);
          // Bottom Left
          ctx.moveTo(offset, 512 - offset - size); ctx.lineTo(offset, 512 - offset); ctx.lineTo(offset + size, 512 - offset);
          // Bottom Right
          ctx.moveTo(512 - offset, 512 - offset - size); ctx.lineTo(512 - offset, 512 - offset); ctx.lineTo(512 - offset - size, 512 - offset);
          ctx.stroke();

          // Small technical boxes
          ctx.lineWidth = 1.0;
          ctx.fillStyle = 'rgba(212, 175, 55, 0.2)';
          ctx.fillRect(offset + 10, offset + 10, 10, 10);
          ctx.strokeRect(offset + 10, offset + 10, 10, 10);
          ctx.fillRect(512 - offset - 20, offset + 10, 10, 10);
          ctx.strokeRect(512 - offset - 20, offset + 10, 10, 10);

          // Add a plane to host this canvas texture (Z = 0.02)
          const hudPlane = document.createElement('a-plane');
          hudPlane.setAttribute('geometry', {
            primitive: 'plane',
            width: 1.6,
            height: 1.6
          });
          hudPlane.setAttribute('material', {
            shader: 'flat',
            src: canvas,
            transparent: true,
            opacity: 0.6,
            depthWrite: false
          });
          hudPlane.setAttribute('position', '0 0 0.02');
          el.appendChild(hudPlane);

          // Numeric labels / Technical data text
          const dataLabel = document.createElement('a-text');
          dataLabel.setAttribute('value', 'SYS ACTIVE\nSYS.V_092\nTRK_STABLE');
          dataLabel.setAttribute('align', 'left');
          dataLabel.setAttribute('color', '#D4AF37');
          dataLabel.setAttribute('width', 0.9);
          dataLabel.setAttribute('position', '-0.6 0.5 0.03');
          el.appendChild(dataLabel);

          const coordLabel = document.createElement('a-text');
          coordLabel.setAttribute('value', 'LOCK: 34.9082\nALT: 1.05m');
          coordLabel.setAttribute('align', 'right');
          coordLabel.setAttribute('color', '#D4AF37');
          coordLabel.setAttribute('width', 0.9);
          coordLabel.setAttribute('position', '0.6 -0.5 0.03');
          el.appendChild(coordLabel);

          this.hudPlane = hudPlane;
          this.time = 0;
        },

        tick: function (time, timeDelta) {
          this.time += timeDelta;
          // Luxury tech breathing scale & opacity modulation
          const breathe = 1.0 + Math.sin((2 * Math.PI * this.time) / 4000) * 0.015;
          this.hudPlane.setAttribute('scale', `${breathe} ${breathe} 1.0`);
        }
      });
    }

    // Register particle-effects component for drifting particles and sparks
    if (window.AFRAME && !window.AFRAME.components['particle-effects']) {
      window.AFRAME.registerComponent('particle-effects', {
        init: function () {
          const el = this.el;
          this.particles = [];
          const particleCount = 20;

          // Create a pool of small, slow metallic gold circle planes
          for (let i = 0; i < particleCount; i++) {
            const part = document.createElement('a-circle');
            part.setAttribute('radius', 0.004 + Math.random() * 0.008);
            
            // Random distribution over a flat 2D area (X: -0.6 to 0.6, Y: -0.8 to 0.8)
            const x = (Math.random() - 0.5) * 1.2;
            const y = (Math.random() - 0.5) * 1.6;
            const z = 0.06 + Math.random() * 0.01; // Z layer 0.06 to 0.07

            part.setAttribute('position', `${x} ${y} ${z}`);
            part.setAttribute('material', {
              color: '#D4AF37',
              shader: 'flat',
              transparent: true,
              opacity: 0.1 + Math.random() * 0.6,
              depthWrite: false
            });

            el.appendChild(part);

            this.particles.push({
              el: part,
              x: x,
              y: y,
              z: z,
              speed: 0.04 + Math.random() * 0.08, // Slow upward drift
              driftX: (Math.random() - 0.5) * 0.02,
              maxOpacity: 0.2 + Math.random() * 0.6
            });
          }
        },

        tick: function (time, timeDelta) {
          const deltaSec = timeDelta / 1000;
          this.particles.forEach(p => {
            p.y += p.speed * deltaSec;
            p.x += p.driftX * deltaSec;

            // Reset particle when it floats past screen top limit
            if (p.y > 0.8) {
              p.y = -0.8;
              p.x = (Math.random() - 0.5) * 1.2;
            }

            // Pulse opacity slightly based on height position
            const normalizedHeight = (p.y + 0.8) / 1.6; // 0 to 1
            const opacity = Math.sin(normalizedHeight * Math.PI) * p.maxOpacity;

            p.el.setAttribute('position', `${p.x} ${p.y} ${p.z}`);
            p.el.setAttribute('material', 'opacity', opacity);
          });
        }
      });
    }

  }
}

