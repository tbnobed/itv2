// Fire TV Browser Scaling and Navigation Fixes
export function applyFireTVFixes() {
  // Force proper scaling on Fire TV browsers
  const forceProperScaling = () => {
    // Reset any browser zoom
    if (document.body) {
      document.body.style.zoom = '1';
      document.body.style.transform = 'scale(1)';
      document.documentElement.style.zoom = '1';
      document.documentElement.style.transform = 'scale(1)';
    }

    // Set proper viewport
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 
        'width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
      );
    }

    // Prevent any dynamic scaling
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('gesturechange', (e) => e.preventDefault());
    document.addEventListener('gestureend', (e) => e.preventDefault());
  };

  // Apply fixes immediately and on DOM ready
  forceProperScaling();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', forceProperScaling);
  }

  // Reapply fixes periodically to combat any dynamic scaling
  setInterval(forceProperScaling, 1000);
}

// TV Remote Navigation Helper
export function setupTVNavigation() {
  // Add global CSS for focus management
  const style = document.createElement('style');
  style.textContent = `
    .tv-focus-ring:focus {
      outline: 4px solid hsl(var(--primary)) !important;
      outline-offset: 2px !important;
      border-radius: 8px !important;
    }
    
    .tv-focus-ring:focus-visible {
      outline: 4px solid hsl(var(--primary)) !important;
      outline-offset: 2px !important;
      border-radius: 8px !important;
    }
    
    /* Hide default focus styles */
    button:focus, 
    a:focus, 
    [tabindex]:focus {
      outline: none !important;
    }
  `;
  document.head.appendChild(style);
}

// Global TV Remote Key Handler
export function setupGlobalTVKeys(callbacks: {
  onNavigateUp?: () => void;
  onNavigateDown?: () => void;
  onNavigateLeft?: () => void;
  onNavigateRight?: () => void;
  onSelect?: () => void;
  onBack?: () => void;
}) {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Prevent default for TV remote keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' ', 'Escape', 'Backspace'].includes(e.key)) {
      // Only prevent default if not in an input field
      const activeElement = document.activeElement;
      const isInput = activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.hasAttribute('contenteditable')
      );
      
      if (!isInput) {
        e.preventDefault();
        e.stopPropagation();
      }
    }

    switch (e.key) {
      case 'ArrowUp':
        callbacks.onNavigateUp?.();
        break;
      case 'ArrowDown':
        callbacks.onNavigateDown?.();
        break;
      case 'ArrowLeft':
        callbacks.onNavigateLeft?.();
        break;
      case 'ArrowRight':
        callbacks.onNavigateRight?.();
        break;
      case 'Enter':
      case ' ':
        callbacks.onSelect?.();
        break;
      case 'Escape':
      case 'Backspace':
        callbacks.onBack?.();
        break;
    }
  };

  document.addEventListener('keydown', handleKeyDown, { capture: true });
  
  return () => {
    document.removeEventListener('keydown', handleKeyDown, { capture: true });
  };
}