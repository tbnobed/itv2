# OBTV Streaming Platform

## Overview

OBTV is a professional streaming interface designed for live broadcast content, studios, and over-the-air feeds. The application provides a Netflix-inspired streaming platform that allows users to browse and view multiple video streams through a modern web interface. It features a content-first design with dark theme optimization, horizontal scrolling content rows, and WebRTC-based video streaming capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend is built with React and TypeScript using Vite as the build tool. The application follows a component-based architecture with:

- **UI Framework**: Radix UI components with shadcn/ui styling system
- **Styling**: Tailwind CSS with custom Netflix-inspired dark theme
- **State Management**: TanStack Query for server state and local React state for UI
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Design System
The application implements a Netflix-inspired design language with:

- **Dark Theme**: Optimized for content viewing with deep charcoal backgrounds
- **Typography**: Inter (primary) and Roboto (secondary) fonts from Google Fonts
- **Layout**: Horizontal scrolling content rows with focus states for TV remote navigation
- **Color Palette**: Blue accent colors (240 100% 50%) with high contrast text
- **Component Library**: Custom UI components built on Radix primitives

### Backend Architecture
Express.js server with TypeScript providing:

- **API Layer**: RESTful endpoints prefixed with `/api`
- **Development Setup**: Vite integration for hot module reloading
- **Data Storage**: In-memory storage implementation with interface for database integration
- **Session Management**: Express session handling with PostgreSQL session store support

### Video Streaming
The application is designed to support multiple video streaming protocols:

- **WebRTC**: Primary streaming protocol for low-latency live video
- **HLS/DASH**: Fallback streaming protocols via included player libraries
- **Player Support**: Integration points for SRS (Simple Realtime Server) WebRTC player
- **Multi-format**: Support for RTMP, WebRTC, HLS, and DASH protocols

### Data Storage
Currently implements in-memory storage with planned PostgreSQL integration:

- **ORM**: Drizzle ORM configured for PostgreSQL with Neon Database support
- **Schema**: User management schema with UUID primary keys
- **Migrations**: Database migration support via Drizzle Kit
- **Interface**: Storage abstraction layer for easy database implementation switching

## External Dependencies

### Core Framework Dependencies
- **React 18**: Frontend framework with TypeScript support
- **Express.js**: Backend web framework
- **Vite**: Build tool and development server
- **Tailwind CSS**: Utility-first CSS framework

### UI and Component Libraries
- **Radix UI**: Accessible component primitives for complex UI patterns
- **shadcn/ui**: Pre-built component library built on Radix
- **Lucide React**: Icon library for consistent iconography
- **TanStack Query**: Server state management and caching

### Database and Storage
- **Drizzle ORM**: Type-safe PostgreSQL ORM with Zod integration
- **Neon Database**: Serverless PostgreSQL database service
- **Connect PG Simple**: PostgreSQL session store for Express

### Video Streaming Libraries
- **Dash.js**: MPEG-DASH video player library
- **HLS.js**: HTTP Live Streaming player library
- **mpegts.js**: MPEG-TS stream player library
- **SRS SDK**: Simple Realtime Server WebRTC integration

### Development and Build Tools
- **TypeScript**: Type safety across frontend and backend
- **ESBuild**: Fast JavaScript bundler for production builds
- **PostCSS**: CSS processing with Autoprefixer
- **Wouter**: Lightweight routing library for React

### Validation and Forms
- **Zod**: Schema validation library
- **React Hook Form**: Form state management and validation
- **Hookform Resolvers**: Integration between React Hook Form and Zod