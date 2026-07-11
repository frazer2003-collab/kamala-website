import { sortAmenitiesByImportance } from "@/lib/amenities";

type RoomAmenitiesListProps = {
  amenities: string[];
  heading?: string;
  label: string;
};

export function RoomAmenitiesList({
  amenities,
  heading = "Included with your stay",
  label,
}: RoomAmenitiesListProps) {
  const orderedAmenities = sortAmenitiesByImportance(amenities);

  if (orderedAmenities.length === 0) {
    return null;
  }

  return (
    <section aria-label={label} className="amenity-offers">
      <h3 className="amenity-offers__title">{heading}</h3>
      <ul className="amenity-plain-list">
        {orderedAmenities.map((amenity) => (
          <li key={amenity}>{amenity}</li>
        ))}
      </ul>
    </section>
  );
}
