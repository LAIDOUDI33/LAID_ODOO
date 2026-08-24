import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Output mode for Docker deployment
  output: "standalone",
  
  // Enable React Strict Mode for production
  // This helps catch potential issues and will be the default in future versions
  reactStrictMode: true,
  
  // Enable strict TypeScript checking
  // Type errors should be fixed, not ignored in production
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // Security headers
  poweredByHeader: false,
  
  // Enable compression
  compress: true,
  
  // Image optimization configuration
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  
  // Experimental features that help with production readiness
  experimental: {
    // Optimize package imports for smaller bundle sizes
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
};

export default nextConfig;
