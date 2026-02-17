import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import ObfuscatedAddress from "../components/ObfuscatedAddress";
import ObfuscatedEmail from "../components/ObfuscatedEmail";
import ProfileCard from "../components/ProfileCard";
import { SEO, CommonOgTags } from "../lib/seo";

export default function ImprintPage() {
  return (
    <>
      <Helmet>
        <title>Legal Notice - {SEO.siteName}</title>
        <meta
          name="description"
          content="Legal notice and contact information for Actually Relevant."
        />
        <meta property="og:title" content={`Legal Notice - ${SEO.siteName}`} />
        <meta
          property="og:description"
          content="Legal notice and contact information for Actually Relevant."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${SEO.siteUrl}/imprint`} />
        {CommonOgTags({})}
      </Helmet>

      <div className="page-section">
        <h1 className="page-title">Legal Notice</h1>

        <div className="prose max-w-none">
          <ProfileCard className="float-right ml-6 mb-4" />

          <h2 className="section-heading mt-8">
            Information (German &sect; 5 DDG)
          </h2>
          <ObfuscatedAddress className="not-italic text-neutral-600 leading-relaxed" />
          <p className="mt-2">
            Email:{" "}
            <ObfuscatedEmail className="text-brand-700 hover:text-brand-800" />
          </p>

          <h2 className="section-heading mt-8">
            Editorially Responsible (German § 18 Abs. 2 MStV)
          </h2>
          <ObfuscatedAddress className="not-italic text-neutral-600 leading-relaxed" />

          <hr className="my-10 border-neutral-200" />

          <p>
            For information about data collection and privacy, see our{" "}
            <Link to="/privacy" className="text-brand-700 hover:text-brand-800">
              Privacy Policy
            </Link>
            . (You will be pleasantly surprised.)
          </p>
        </div>

      </div>
    </>
  );
}
