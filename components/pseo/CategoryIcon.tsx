import {
  Briefcase, Car, Dumbbell, GraduationCap, HeartPulse, Hotel, Landmark, Palette, PartyPopper,
  Scissors, ShoppingBag, Truck, UtensilsCrossed, Building2,
  Coffee, Croissant, Wine, Stethoscope, Pill, Shirt, Gem, Wrench, Scale, Camera, BookOpen, Dog,
  Flower2, Home, Plane, Baby, Glasses, Sofa, Cpu, ShoppingCart, Sparkles,
  type LucideIcon,
} from "lucide-react";
import { TYPE_TO_SECTION } from "@/lib/categories";

/**
 * A line icon per business category, matching the rest of the icon set.
 *
 * Mapped at the section level rather than per place type: there are around five hundred Google
 * place types and hand-picking an icon for each would rot the moment Google adds one. The highest
 * volume types get something more specific on top, because a single "Food & Drink" glyph covering
 * both a bakery and a bar reads as generic on a page whose whole point is specificity.
 *
 * Emoji did this job before, and rendered as an empty box wherever the platform lacked the glyph.
 */
const SECTION_ICON: Record<string, LucideIcon> = {
  Automotive: Car,
  "Business & B2B": Briefcase,
  "Culture & Creative": Palette,
  Education: GraduationCap,
  "Entertainment & Recreation": PartyPopper,
  Finance: Landmark,
  "Food & Drink": UtensilsCrossed,
  "Health & Wellness": HeartPulse,
  "Hotels & Accommodation": Hotel,
  "Professional Services": Briefcase,
  "Personal Care & Local Services": Scissors,
  "Shopping & Retail": ShoppingBag,
  "Sports & Fitness": Dumbbell,
  "Transportation Services": Truck,
};

const TYPE_ICON: Record<string, LucideIcon> = {
  cafe: Coffee, coffee_shop: Coffee, bakery: Croissant, cake_shop: Croissant,
  bar: Wine, cocktail_bar: Wine, brewery: Wine,
  beauty_salon: Sparkles, hair_salon: Scissors, barber_shop: Scissors, spa: Sparkles, nail_salon: Sparkles,
  gym: Dumbbell, fitness_center: Dumbbell, yoga_studio: Dumbbell,
  doctor: Stethoscope, dentist: Stethoscope, hospital: HeartPulse, veterinary_care: Dog, pharmacy: Pill,
  clothing_store: Shirt, womens_clothing_store: Shirt, mens_clothing_store: Shirt,
  jewelry_store: Gem, shoe_store: ShoppingBag, furniture_store: Sofa,
  electronics_store: Cpu, hardware_store: Wrench, book_store: BookOpen, florist: Flower2, pet_store: Dog,
  grocery_store: ShoppingCart, supermarket: ShoppingCart, general_store: ShoppingCart, convenience_store: ShoppingCart,
  car_repair: Wrench, car_wash: Car, car_dealer: Car, tire_shop: Car,
  real_estate_agency: Home, apartment_building: Building2,
  lawyer: Scale, accounting: Scale, insurance_agency: Scale,
  travel_agency: Plane, hotel: Hotel,
  school: GraduationCap, preschool: Baby, educational_institution: GraduationCap,
  photographer: Camera, optician: Glasses, bank: Landmark,
};

export function categoryIconFor(category: string | null): LucideIcon {
  if (!category) return Building2;
  const specific = TYPE_ICON[category];
  if (specific) return specific;
  const section = TYPE_TO_SECTION[category];
  return (section && SECTION_ICON[section]) || Building2;
}

export function CategoryIcon({
  category,
  size = 14,
  color = "var(--g-gray-500)",
}: {
  category: string | null;
  size?: number;
  color?: string;
}) {
  const Icon = categoryIconFor(category);
  return <Icon size={size} color={color} strokeWidth={2} absoluteStrokeWidth aria-hidden="true" />;
}
