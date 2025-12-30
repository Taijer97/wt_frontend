import React from 'react';

interface BrandLogoProps {
  className?: string;
  alt?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ className, alt }) => {
  return (
    <img
      src="/WT_logo2.png"
      alt={alt || 'Logo'}
      className={className || 'w-6 h-6'}
      draggable={false}
    />
  );
}

