/**
 * Optimized Image Component
 * Provides automatic image optimization, lazy loading, and progressive enhancement
 */

import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import { cn } from '@/utils/cn';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  fill?: boolean;
  sizes?: string;
  style?: React.CSSProperties;
  onLoad?: () => void;
  onError?: () => void;
}

interface ImageSkeletonProps {
  width?: number;
  height?: number;
  className?: string;
}

const ImageSkeleton: React.FC<ImageSkeletonProps> = ({ 
  width, 
  height, 
  className 
}) => (
  <div
    className={cn(
      'animate-pulse bg-gray-200 rounded',
      className
    )}
    style={{ 
      width: width ? `${width}px` : '100%', 
      height: height ? `${height}px` : '100%',
      aspectRatio: width && height ? `${width} / ${height}` : undefined
    }}
  />
);

export const OptimizedImage: React.FC<OptimizedImageProps> = React.memo(({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  quality = 75,
  placeholder = 'empty',
  blurDataURL,
  fill = false,
  sizes,
  style,
  onLoad,
  onError
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  }, [onError]);

  // Generate blur placeholder if not provided
  const getBlurDataURL = useCallback(() => {
    if (blurDataURL) return blurDataURL;
    
    // Generate a simple blur placeholder
    return "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciPjxzdG9wIHN0b3AtY29sb3I9IiNmM2Y0ZjYiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNlNWU3ZWIiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0idXJsKCNnKSIvPjwvc3ZnPg==";
  }, [blurDataURL]);

  if (hasError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-gray-100 text-gray-400 text-sm rounded',
          className
        )}
        style={{
          width: width ? `${width}px` : '100%',
          height: height ? `${height}px` : '100%',
          ...style
        }}
      >
        Failed to load image
      </div>
    );
  }

  const imageProps = {
    src,
    alt,
    quality,
    priority,
    placeholder: placeholder as any,
    onLoad: handleLoad,
    onError: handleError,
    className: cn(
      'transition-opacity duration-300',
      isLoading ? 'opacity-0' : 'opacity-100',
      className
    ),
    style,
    ...(placeholder === 'blur' && { blurDataURL: getBlurDataURL() }),
    ...(sizes && { sizes }),
    ...(fill 
      ? { fill: true } 
      : { width: width || 0, height: height || 0 }
    )
  };

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 z-10">
          <ImageSkeleton width={width} height={height} className={className} />
        </div>
      )}
      <Image {...imageProps} />
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

// Specialized components for common use cases

export const AvatarImage: React.FC<{
  src: string;
  alt: string;
  size?: number;
  className?: string;
}> = React.memo(({ src, alt, size = 40, className }) => (
  <OptimizedImage
    src={src}
    alt={alt}
    width={size}
    height={size}
    className={cn('rounded-full', className)}
    quality={90}
    placeholder="blur"
  />
));

export const LogoImage: React.FC<{
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
}> = React.memo(({ src, alt, width = 120, height = 40, className, priority = true }) => (
  <OptimizedImage
    src={src}
    alt={alt}
    width={width}
    height={height}
    className={className}
    priority={priority}
    quality={100}
  />
));

export const HeroImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}> = React.memo(({ src, alt, className, priority = true }) => (
  <OptimizedImage
    src={src}
    alt={alt}
    fill
    className={className}
    priority={priority}
    quality={85}
    placeholder="blur"
    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
  />
));

export const ThumbnailImage: React.FC<{
  src: string;
  alt: string;
  size?: number;
  className?: string;
}> = React.memo(({ src, alt, size = 80, className }) => (
  <OptimizedImage
    src={src}
    alt={alt}
    width={size}
    height={size}
    className={cn('rounded-lg', className)}
    quality={60}
    placeholder="blur"
  />
));

// Image preloader utility
export const preloadImage = (src: string, options?: {
  priority?: boolean;
  sizes?: string;
}) => {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = src;
  
  if (options?.sizes) {
    link.setAttribute('imagesizes', options.sizes);
  }
  
  document.head.appendChild(link);
};

// Hook for progressive image loading
export const useProgressiveImage = (src: string, placeholderSrc?: string) => {
  const [currentSrc, setCurrentSrc] = useState(placeholderSrc || src);
  const [isLoaded, setIsLoaded] = useState(false);

  React.useEffect(() => {
    const img = new window.Image();
    
    img.onload = () => {
      setCurrentSrc(src);
      setIsLoaded(true);
    };
    
    img.src = src;
    
    return () => {
      img.onload = null;
    };
  }, [src]);

  return { src: currentSrc, isLoaded };
};

// Image optimization utilities
export const generateSrcSet = (src: string, widths: number[]) => {
  return widths
    .map(width => `${src}?w=${width}&q=75 ${width}w`)
    .join(', ');
};

export const generateSizes = (breakpoints: Array<{ 
  condition: string; 
  size: string; 
}>) => {
  return breakpoints
    .map(({ condition, size }) => `${condition} ${size}`)
    .join(', ');
};