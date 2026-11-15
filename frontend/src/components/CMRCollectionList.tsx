import { CMRCollection } from "@/lib/api";

type Props = {
  collections: CMRCollection[];
  hindi: boolean;
};

export default function CMRCollectionList({ collections, hindi }: Props) {
  if (collections.length === 0) {
    return (
      <p className="help-note">
        {hindi
          ? "इस खोज में NASA CMR का कोई परिणाम नहीं मिला।"
          : "NASA CMR returned no collections for this search."}
      </p>
    );
  }

  return (
    <div className="cmr-result-list">
      {collections.map((collection) => (
        <article className="cmr-result-card" key={collection.concept_id}>
          <h4>{collection.title ?? (hindi ? "शीर्षक नहीं दिया गया" : "Title not provided")}</h4>
          <dl className="science-details">
            <div><dt>{hindi ? "संक्षिप्त नाम" : "Short name"}</dt><dd>{collection.short_name ?? "—"}</dd></div>
            <div><dt>{hindi ? "संस्करण" : "Version"}</dt><dd>{collection.version ?? "—"}</dd></div>
            <div><dt>{hindi ? "प्रदाता" : "Provider"}</dt><dd>{collection.provider ?? "—"}</dd></div>
            <div><dt>{hindi ? "CMR Concept ID" : "CMR concept ID"}</dt><dd>{collection.concept_id}</dd></div>
            <div><dt>{hindi ? "समय सीमा" : "Temporal coverage"}</dt><dd>{collection.temporal_start ?? "—"} – {collection.temporal_end ?? "—"}</dd></div>
            <div><dt>{hindi ? "स्थानिक सीमा" : "Spatial coverage"}</dt><dd>{collection.spatial_coverage.length ? collection.spatial_coverage.join("; ") : (hindi ? "कैटलॉग में नहीं दिया गया" : "Not provided in catalogue")}</dd></div>
          </dl>
          <p>{collection.abstract || (hindi ? "कैटलॉग में सारांश नहीं दिया गया।" : "No abstract was provided in the catalogue.")}</p>
          <p className="cmr-metadata-notice">{collection.metadata_only_notice}</p>
          <p>{collection.access_note}</p>
          <ul className="provenance-links">
            {collection.official_links.map((link) => (
              <li key={link.href}>
                <a href={link.href} target="_blank" rel="noreferrer">
                  {link.title ?? link.rel ?? (hindi ? "आधिकारिक NASA लिंक" : "Official NASA link")}
                </a>
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}
