/** A picture in its shipped forms: AVIF and WebP srcsets, a JPEG fallback, and the master's dimensions. */
export interface ResponsiveImage {
  avif: string;
  webp: string;
  fallback: string;
  width: number;
  height: number;
}

export type SectionId = 
  | 'home'
  | 'stay'
  | 'bride'
  | 'story'
  | 'zichron'
  | 'gallery'
  | 'booking'
  | 'faq';

export interface Amenity {
  id: string;
  name: string;
  category: 'comfort' | 'kitchen' | 'outdoor' | 'general';
  icon: string;
  description?: string;
}

export interface BridePackage {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  highlights: string[];
  recommendedFor: string;
  badge?: string;
}

export interface LocalPlace {
  id: string;
  name: string;
  category: 'coffee' | 'food' | 'wine' | 'trails';
  categoryLabel: string;
  description: string;
  recommendationBy: 'שרי' | 'יואב';
  tip: string;
  distance: string;
}

export interface GalleryItem {
  id: string;
  title: string;
  category: 'house' | 'details' | 'courtyard' | 'bride';
  categoryLabel: string;
  image: ResponsiveImage;
  description: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface BookingFormState {
  stayType: 'couple' | 'bride_day' | 'bride_night_day' | 'wedding_night';
  checkInDate: string;
  checkOutDate: string;
  guestsCount: number;
  fullName: string;
  phone: string;
  notes: string;
}
