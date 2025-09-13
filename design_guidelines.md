# OBTV Streaming Interface Design Guidelines

## Design Approach: Reference-Based (Netflix-Inspired)

**Justification**: This is an experience-focused streaming application requiring visual appeal, content showcase capabilities, and familiar interaction patterns. Netflix's design language perfectly aligns with user expectations for streaming platforms.

**Key Design Principles**: 
- Cinematic dark theme optimized for viewing content
- Content-first hierarchy with minimal UI interference
- TV-remote friendly navigation with large, clear focus states
- Familiar streaming platform patterns for instant usability

## Core Design Elements

### A. Color Palette
**Dark Mode Primary** (Netflix-inspired):
- Background: 0 0% 8% (deep charcoal)
- Surface: 0 0% 12% (slightly lighter panels)
- Cards: 0 0% 15% (tile backgrounds)
- Primary Brand: 240 100% 50% (OBTV blue accent)
- Text Primary: 0 0% 95% (near white)
- Text Secondary: 0 0% 70% (muted gray)
- Focus/Selected: 240 100% 60% (brighter blue for focus states)

### B. Typography
**Google Fonts**: Inter (primary), Roboto (secondary)
- Headers: Inter Bold 24px-32px
- Tile Labels: Inter Medium 14px-16px
- Stream IDs: Inter Regular 12px
- Body Text: Roboto Regular 14px
- All text must maintain high contrast on dark backgrounds

### C. Layout System
**Tailwind Spacing**: Consistent use of 2, 4, 6, 8, 12, 16 units
- Container padding: p-6 to p-8
- Card spacing: gap-4 within rows, gap-8 between sections
- Focus rings: ring-4 for clear TV remote visibility
- Horizontal scroll containers: px-6 for edge spacing

### D. Component Library

**Navigation**:
- OBTV logo (top-left): 48px height, white/brand colored
- Pagination controls (top-right): Large touch targets (48px min)
- Focus states: 4px blue ring with rounded corners

**Content Tiles**:
- Aspect ratio: 16:9 for video thumbnails
- Sizes: Featured (320x180px), Regular (240x135px)
- Hover/focus effects: Scale 1.05, add blue glow
- Stream ID badge: Bottom-right overlay, dark background with white text
- Loading states: Skeleton shimmer animation

**Categories/Rows**:
- Section headers: 24px bold, white text with subtle spacing
- Horizontal scroll: Hidden scrollbars, arrow key navigation
- Smooth scroll behavior with momentum

**Player Modal**:
- Full-screen dark overlay (rgba(0,0,0,0.95))
- Centered video player with minimal controls
- Close button (top-right): 48px touch target with clear icon
- Loading spinner: Centered, brand-colored

**Focus States** (Critical for TV devices):
- 4px solid blue ring around focusable elements
- Rounded corners matching component shape
- High contrast, clearly visible from viewing distance
- Smooth transitions between focus states

### E. TV Device Optimizations
- Minimum touch targets: 48px x 48px
- Font sizes increased 20% from desktop standards
- Reduced motion for performance on limited hardware
- Simplified animations: fade and scale only
- Arrow key navigation with logical flow between sections

### F. Content Organization
**Row Structure**:
1. Favorites (if configured)
2. Featured (hero-sized tiles)
3. Studios (medium tiles)
4. Over The Air (medium tiles)
5. Live Feeds (medium tiles)

**Configurable Elements**:
- Stream names, URLs, and categories via JSON configuration
- Thumbnail URLs with fallback to default OBTV placeholder
- Section visibility and ordering
- Custom branding colors and logo

### G. Performance Considerations
- Lazy loading for thumbnails outside viewport
- Optimized image formats (WebP with JPEG fallback)
- Minimal DOM manipulation for smooth TV browser performance
- Efficient WebRTC connection management
- Progressive enhancement for different device capabilities

## Images Section
- **OBTV Logo**: Clean, modern logo placed in top-left corner
- **Stream Thumbnails**: 16:9 aspect ratio images for each stream, optimized for quick loading
- **Fallback Placeholder**: Generic OBTV-branded placeholder for streams without custom thumbnails
- **No Large Hero Image**: Interface focuses on content tiles rather than a dominant hero section

This design creates a familiar, Netflix-like experience optimized for both traditional browsers and TV devices while maintaining the OBTV brand identity.