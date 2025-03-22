# Reddit Mobile

A modern, mobile-optimized Reddit client built with Next.js, featuring a beautiful UI and enhanced user experience.

## Features

- **Modern UI**: Clean, responsive design optimized for mobile devices
- **Authentication**: Secure OAuth integration with Reddit
- **Content Browsing**: View posts, comments, subreddits, and user profiles
- **NSFW Content Control**: Toggle NSFW content visibility
- **Media Support**: Seamless viewing for images, videos, and galleries
- **Infinite Scrolling**: Load more content as you scroll
- **Dark Mode**: Toggle between light and dark themes
- **Graceful Error Handling**: User-friendly error messages with recovery options

## Authentication

The application uses Next-Auth with Reddit OAuth for authentication:

- **Public Browsing**: Users can browse without authentication (limited features)
- **Authentication Flow**: 
  1. User clicks "Sign In" button
  2. Reddit OAuth authentication process begins
  3. User authorizes the application on Reddit
  4. Redirected back with access token and refresh token
  5. Tokens stored securely in HTTP-only cookies

- **Token Refreshing**: Automatic token refresh when expired
- **Error Handling**: Comprehensive error pages for various authentication errors
- **Protected Routes**: Middleware protection for authenticated-only features

## Error Handling

The application includes robust error handling:

- **Authentication Errors**: Dedicated `/auth/error` page with helpful messages
- **Network Errors**: Retry mechanisms with clear user feedback
- **Content Loading Errors**: Graceful fallbacks with retry options
- **Navigation**: Always showing navigation elements even during errors
- **NSFW Content**: Clear warnings and messaging for NSFW content filtering
- **User-Friendly Messages**: Actionable error messages with next steps for users

## Development

### Prerequisites

- Node.js 18 or higher
- npm or pnpm

### Environment Variables

Create a `.env.local` file with the following variables:

```
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_CLIENT_SECRET=your_reddit_client_secret
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret
```

### Installation

```bash
# Install dependencies
npm install
# or
pnpm install

# Run development server
npm run dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Building for Production

```bash
# Build the application
npm run build
# or
pnpm build

# Start the production server
npm start
# or
pnpm start
```

## Architecture

The application follows a modern Next.js architecture:

- **API Routes**: Server-side API endpoints for Reddit interaction
- **App Router**: Next.js App Router with React Server Components
- **Client Components**: Interactive UI components with React hooks
- **Caching**: Optimized data fetching with caching for performance
- **Error Boundaries**: Component-level error isolation
- **Responsive Design**: Mobile-first UI approach with Tailwind CSS

## Recent Improvements

- **Enhanced Authentication Flow**: Better handling of unauthenticated users
- **Consistent Navigation**: Navbar always visible for easier authentication
- **Improved Error Pages**: Dedicated error components with clear instructions
- **NSFW Toggle**: Comprehensive filtering of NSFW content
- **Reddit API Integration**: Updated to support both authenticated and public endpoints
- **Performance Optimizations**: Reduced API calls with better caching
- **Mobile Experience**: Enhanced UI for small screens 