import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PlaceDetailClient } from "@/components/places/place-detail-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SITE_NAME } from "@/config/site";
import { getPlaceStore, usingDemoData } from "@/providers";
import { MARKER_STYLES } from "@/components/map/marker-style";

interface PlacePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PlacePageProps): Promise<Metadata> {
  const { slug } = await params;
  const place = await getPlaceStore()
    .getPlaceByIdOrSlug(slug)
    .catch(() => null);
  if (!place) return { title: "Place not found" };
  return {
    title: place.name,
    description:
      place.description ??
      `${place.name} — location, race-day routes and nearby facilities on ${SITE_NAME}.`,
  };
}

export default async function PlacePage({ params }: PlacePageProps) {
  const { slug } = await params;
  const place = await getPlaceStore()
    .getPlaceByIdOrSlug(slug)
    .catch(() => null);
  if (!place) notFound();

  const style = MARKER_STYLES[place.category];
  const isDemo = usingDemoData();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-3">
        <Link href={`/?category=${place.category}&place=${place.slug}`}>
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Open on the map
        </Link>
      </Button>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold leading-tight">{place.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {style.label}
            {place.subcategory && ` · ${place.subcategory.replace(/-/g, " ")}`}
            {place.address && ` · ${place.address}`}
          </p>
        </div>
        {(isDemo || place.isDemo) && (
          <Badge className="shrink-0 bg-amber-500 text-white hover:bg-amber-500">
            Demo data
          </Badge>
        )}
      </div>

      {place.description && <p className="mt-4 text-sm leading-relaxed">{place.description}</p>}

      <PlaceDetailClient place={place} />
    </main>
  );
}
