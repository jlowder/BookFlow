# BookFlow - Reading Journal Application

## Overview

BookFlow is a full-stack reading journal application built with React/TypeScript frontend and Node.js/Express backend. The application allows users to track their reading progress, manage their book collection, and visualize their reading timeline. It features Google Books API integration for book search and supports both SQLite and PostgreSQL databases.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: Radix UI components with shadcn/ui styling
- **Styling**: Tailwind CSS with custom design tokens
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ESM modules
- **Database**: Dual support for SQLite (development) and PostgreSQL (production)
- **ORM**: Drizzle ORM for type-safe database operations
- **API Integration**: Google Books API for book search functionality
- **Development**: Hot reload with Vite middleware integration

## Key Components

### Database Layer
- **Primary Storage**: SQLite for local development, PostgreSQL for production
- **Schema Management**: Drizzle ORM with migration support
- **Storage Interface**: Abstracted storage layer supporting multiple implementations
- **Data Models**: Books, Reading Sessions with relational structure

### API Layer
- **REST Endpoints**: CRUD operations for books and reading sessions
- **External Integration**: Google Books API search functionality
- **Statistics API**: Reading streaks and progress tracking
- **Validation**: Zod schemas for request/response validation

### User Interface
- **Reading Dashboard**: Overview of current reading progress
- **Book Management**: Add, edit, and track books with cover images
- **Timeline Visualization**: Interactive reading history timeline
- **Statistics Display**: Reading streaks and completion metrics
- **Responsive Design**: Mobile-first approach with adaptive layouts

## Data Flow

1. **User Interaction**: User interacts with React components
2. **State Management**: TanStack Query manages API calls and caching
3. **API Requests**: Frontend sends requests to Express backend
4. **Data Processing**: Backend validates and processes requests
5. **Database Operations**: Drizzle ORM handles database interactions
6. **Response Handling**: Data flows back through the stack to update UI

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database adapter
- **better-sqlite3**: SQLite database driver
- **drizzle-orm**: Type-safe ORM for database operations
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Accessible UI component primitives

### Development Tools
- **Vite**: Build tool and development server
- **TypeScript**: Type safety and development experience
- **Tailwind CSS**: Utility-first CSS framework
- **ESBuild**: Fast JavaScript bundler for production

### External APIs
- **Google Books API**: Book search and metadata retrieval
- **No authentication required**: Public API endpoints used

## Deployment Strategy

### Docker Deployment (Recommended)
- **Multi-stage build**: Optimized production image
- **Data persistence**: External volume mounting for database
- **Health checks**: Built-in container health monitoring
- **Environment configuration**: Production-ready defaults

### Server Deployment Options
- **Systemd service**: Native Linux service integration
- **Process management**: Automatic restart on failure
- **File permissions**: Secure database file handling
- **Port configuration**: Flexible port binding

### Database Configuration
- **Development**: SQLite with local file storage
- **Production**: PostgreSQL with connection pooling
- **Migrations**: Automated schema management
- **Backup considerations**: File-based SQLite, standard PostgreSQL backup

## Changelog

```
Changelog:
- July 3, 2025. Fixed timezone issues with "Read Today" button - now uses local timezone instead of UTC
- June 26, 2025. Fixed timeline date labels to show current date automatically
- June 26, 2025. Enhanced timeline with dynamic updates and proper date range display
- June 26, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```