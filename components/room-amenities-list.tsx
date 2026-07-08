import { AmenityIcon } from "@/components/amenity-icon";
import { sortAmenitiesByImportance } from "@/lib/amenities";

type RoomAmenitiesListProps = {
  amenities: string[];
  heading?: string;
  label: string;
};

export function RoomAmenitiesList({
  amenities,
  heading = "What this place offers",
  label,
}: RoomAmenitiesListProps) {
  const orderedAmenities = sortAmenitiesByImportance(amenities);

  if (orderedAmenities.length === 0) {
    return null;
  }

  return (
    <section aria-label={label} className="amenity-offers">
      <h3 className="amenity-offers__title">{heading}</h3>
      <ul className="amenity-grid">
        {orderedAmenities.map((amenity) => (
          <li className="amenity-grid__item" key={amenity}>
            <AmenityIcon amenity={amenity} className="amenity-grid__icon" />
            <span className="amenity-grid__label">{amenity}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
