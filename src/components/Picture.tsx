import type { ResponsiveImage } from '../types';

interface PictureProps {
  image: ResponsiveImage;
  alt: string;
  /** Classes for the <img> itself, exactly as if it were written inline. */
  className?: string;
  /** How wide the picture renders, so the browser can pick a variant before layout. */
  sizes?: string;
  /** The hero: fetched eagerly and early instead of lazily. Use it for above-the-fold images only. */
  priority?: boolean;
}

/**
 * An <img> that ships AVIF and WebP with a JPEG fallback, lazily and at a size the viewport needs.
 * The master's dimensions go on the <img> so the space is reserved before the file arrives.
 */
export default function Picture({ image, alt, className, sizes = '100vw', priority = false }: PictureProps) {
  return (
    // `contents` keeps <picture> out of the box tree, so the layout matches a bare <img>.
    <picture className="contents">
      <source type="image/avif" srcSet={image.avif} sizes={sizes} />
      <source type="image/webp" srcSet={image.webp} sizes={sizes} />
      <img
        src={image.fallback}
        alt={alt}
        className={className}
        width={image.width}
        height={image.height}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        fetchPriority={priority ? 'high' : 'auto'}
        referrerPolicy="no-referrer"
      />
    </picture>
  );
}
