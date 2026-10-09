import type { Metadata } from "next";
import { GuestPageClosingActions } from "@/components/guest-page-closing-actions";
import { GuestTopbar } from "@/components/guest-topbar";
import { PropertyLocation } from "@/components/property-location";
import { SiteFooter } from "@/components/site-footer";
import { buildHomePageDescription, buildLocationPageJsonLd } from "@/lib/home-seo";
import { buildGuestPageMetadata, getMetadataBase } from "@/lib/site-metadata";
import { getPropertySettings } from "@/lib/property-settings";
import { getPublicRooms } from "@/lib/rooms";
import {
  buildThaPhaeLocationDescription,
  buildThaPhaeLocationFaq,
  GUESTHOUSE_GEO,
  GUESTHOUSE_MAPS_URL,
  GUESTHOUSE_THAI_ADDRESS,
  GUESTHOUSE_THAI_NAME,
  isThaPhaeSeoContext,
  THA_PHAE_LOCATION_H1,
  THA_PHAE_LOCATION_TITLE,
  THA_PHAE_NEARBY_PLACES,
  THA_PHAE_THAI_FAQ,
} from "@/lib/tha-phae-seo";
import { getGuesthouseLocationLabel } from "@/lib/home-hero-copy";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPropertySettings();
  const locationLabel = getGuesthouseLocationLabel(
    settings.addressLine,
    settings.propertyName,
  );
  const nearThaPhae = isThaPhaeSeoContext(locationLabel, settings.addressLine);

  if (!nearThaPhae) {
    return buildGuestPageMetadata({
      settings,
      path: "/location",
      title: "Location",
      description: buildHomePageDescription(settings),
    });
  }

  return buildGuestPageMetadata({
    settings,
    path: "/location",
    title: THA_PHAE_LOCATION_TITLE,
    description: buildThaPhaeLocationDescription(settings.propertyName),
    absoluteTitle: true,
  });
}

export default async function LocationPage() {
  const settings = await getPropertySettings();
  const locationLabel = getGuesthouseLocationLabel(
    settings.addressLine,
    settings.propertyName,
  );
  const nearThaPhae = isThaPhaeSeoContext(locationLabel, settings.addressLine);

  if (!nearThaPhae) {
    return (
      <main className="guest-site site-shell guest-page location-page">
        <GuestTopbar current="location" settings={settings} tone="on-dark" />
        <div className="guest-page__intro location-page__intro">
          <p className="section-note">Location</p>
          <h1>{`Find ${settings.propertyName}`}</h1>
          <p>{`Visit ${settings.propertyName} in ${locationLabel}.`}</p>
        </div>
        <section className="location-page__details" aria-labelledby="location-details-title">
          <h2 id="location-details-title">How to find us</h2>
          <PropertyLocation addressLine={settings.addressLine} contactPhone={settings.contactPhone} />
        </section>
        <GuestPageClosingActions />
        <SiteFooter settings={settings} />
      </main>
    );
  }

  const faq = buildThaPhaeLocationFaq(settings);
  const rooms = await getPublicRooms();
  const jsonLd = buildLocationPageJsonLd(settings, rooms, getMetadataBase()?.origin ?? null);

  return (
    <main className="guest-site site-shell guest-page location-page">
      {jsonLd.map((graph, index) => (
        <script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
          key={index}
          type="application/ld+json"
        />
      ))}
      <GuestTopbar current="location" settings={settings} tone="on-dark" />

      <div className="guest-page__intro location-page__intro">
        <p className="section-note">Location</p>
        <h1>{THA_PHAE_LOCATION_H1}</h1>
        <p>
          {settings.propertyName} is a family-run, Thai traditional style guesthouse on Tha Phae
          Road Soi 6, 100 metres from Tha Phae Gate at the edge of Chiang Mai Old City. The Sunday
          Walking Street starts two minutes from the door, and the Night Bazaar is a 12-minute walk.
        </p>
      </div>

      <section className="location-page__details" aria-labelledby="location-details-title">
        <h2 id="location-details-title">How to find us</h2>
        <PropertyLocation
          addressLine={settings.addressLine}
          contactPhone={settings.contactPhone}
          coordinates={GUESTHOUSE_GEO}
          mapsUrl={GUESTHOUSE_MAPS_URL}
          showMap
        />
      </section>

      <section className="location-page__nearby" aria-labelledby="location-nearby-title">
        <h2 id="location-nearby-title">What&apos;s nearby</h2>
        <p>Distances from the guesthouse door. Road routes run a little longer.</p>
        <table className="location-page__distances">
          <thead>
            <tr>
              <th scope="col">Place</th>
              <th scope="col">Distance</th>
              <th scope="col">Getting there</th>
            </tr>
          </thead>
          <tbody>
            {THA_PHAE_NEARBY_PLACES.map((place) => (
              <tr key={place.name}>
                <th scope="row">{place.name}</th>
                <td>{place.distance}</td>
                <td>{place.travel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="location-page__arrive" aria-labelledby="location-arrive-title">
        <h2 id="location-arrive-title">Getting here</h2>
        <dl className="location-page__routes">
          <div>
            <dt>From Chiang Mai Airport</dt>
            <dd>About 5 km. A taxi from the airport rank or a Grab takes 15 to 20 minutes.</dd>
          </div>
          <div>
            <dt>From the railway station</dt>
            <dd>About 2.5 km. Around 10 minutes by Grab, taxi or red songthaew.</dd>
          </div>
          <div>
            <dt>From Arcade Bus Terminal</dt>
            <dd>About 3 km. Around 15 minutes by Grab, taxi or red songthaew.</dd>
          </div>
        </dl>
        <div className="location-page__driver">
          <p>Show your driver this address:</p>
          <p className="location-page__driver-address" lang="th">
            <strong>{GUESTHOUSE_THAI_NAME}</strong>
            <br />
            {GUESTHOUSE_THAI_ADDRESS}
          </p>
          <p>
            Or say &ldquo;Tha Phae Road Soi 6, near Tha Phae Gate&rdquo; and open the{" "}
            <a href={GUESTHOUSE_MAPS_URL} rel="noopener noreferrer" target="_blank">
              Google Maps pin
            </a>
            .
          </p>
        </div>
      </section>

      <section className="location-page__area" aria-labelledby="location-area-title">
        <h2 id="location-area-title">Is Tha Phae a good area to stay?</h2>
        <p>
          For most first visits, yes. Tha Phae Gate is where the Old City meets the busier streets
          running east to the river, so you can walk to the temples inside the moat in one
          direction and to the markets in the other.
        </p>
        <p>
          Tha Phae Road is lined with cafés, restaurants and massage shops. Warorot Market is the
          place for local food and snacks, the Night Bazaar fills Chang Klan Road every evening,
          and on Sundays the Walking Street market runs from the gate deep into the Old City.
        </p>
      </section>

      <section className="location-page__faq" aria-labelledby="location-faq-title">
        <h2 id="location-faq-title">Common questions</h2>
        <dl className="location-page__faq-list">
          {faq.map((item) => (
            <div key={item.question}>
              <dt>{item.question}</dt>
              <dd>{item.answer}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="location-page__faq" aria-labelledby="location-thai-title" lang="th">
        <h2 id="location-thai-title">ที่พักใกล้ประตูท่าแพ เชียงใหม่</h2>
        <p>
          {GUESTHOUSE_THAI_NAME} เกสท์เฮาส์สไตล์ไทยดั้งเดิม ตั้งอยู่ที่{" "}
          {GUESTHOUSE_THAI_ADDRESS} ห่างจากประตูท่าแพประมาณ 100 เมตร ใกล้ถนนคนเดินท่าแพและไนท์บาซาร์
        </p>
        <dl className="location-page__faq-list">
          {THA_PHAE_THAI_FAQ.map((item) => (
            <div key={item.question}>
              <dt>{item.question}</dt>
              <dd>{item.answer}</dd>
            </div>
          ))}
        </dl>
      </section>

      <GuestPageClosingActions />

      <SiteFooter settings={settings} />
    </main>
  );
}
