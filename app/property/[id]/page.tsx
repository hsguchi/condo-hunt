import { notFound } from "next/navigation";
import { PropertyDetailView } from "@/components/property/property-detail-view";
import { sampleListings } from "@/lib/sample-data";

export default async function PropertyDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listing = sampleListings.find((entry) => entry.id === id);

  if (!listing) {
    notFound();
  }

  return <PropertyDetailView listingId={id} />;
}
