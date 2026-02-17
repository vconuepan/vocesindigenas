import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { SEO, CommonOgTags } from "../lib/seo";
import StructuredData from "../components/StructuredData";
import { buildBreadcrumbSchema } from "../lib/structured-data";
import ProfileCard from "../components/ProfileCard";
import SupportButton from "../components/SupportButton";

export default function AboutPage() {
  return (
    <>
      <Helmet>
        <title>About - {SEO.siteName}</title>
        <meta
          name="description"
          content="Actually Relevant is a non-commercial, AI-curated news platform focused on what truly matters for humanity. Learn the story behind the project."
        />
        <meta property="og:title" content={`About - ${SEO.siteName}`} />
        <meta
          property="og:description"
          content="Actually Relevant is a non-commercial, AI-curated news platform focused on what truly matters for humanity."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${SEO.siteUrl}/about`} />
        {CommonOgTags({})}
      </Helmet>
      <StructuredData
        data={[
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: `About - ${SEO.siteName}`,
            description:
              "Actually Relevant is a non-commercial, AI-curated news platform focused on what truly matters for humanity.",
            url: `${SEO.siteUrl}/about`,
            isPartOf: {
              "@type": "WebSite",
              name: SEO.siteName,
              url: SEO.siteUrl,
            },
          },
          buildBreadcrumbSchema([
            { name: "Home", url: SEO.siteUrl },
            { name: "About" },
          ]),
        ]}
      />

      <div className="page-section">
        <h1 className="page-title">About Actually Relevant</h1>
        <p className="page-intro">
          A side-project to make the news worth reading again
        </p>

        <div className="prose max-w-none">
          <h2 className="section-heading mt-8">The Story</h2>
          <p>
            I wanted news that told me what actually matters in the world. Not
            celebrity news, sports, and the predictable back-and-forth of
            partisan politics. Climate breakthroughs, global health milestones,
            policy shifts affecting hundreds of millions of people. The stuff
            that gets buried.
          </p>
          <p>
            So I built what I wanted: an AI that reads lots of news sources
            across multiple languages and surfaces only the stories that
            genuinely matter to humanity. No ads, no tracking, no
            personalization bubbles. When assessing relevance, every human
            counts the same, no matter where they live. A policy change that
            affects the entire elderly care system in China is more important
            than most policy debates in Washington.
          </p>

          {/* Profile card — floated before h2 so it top-aligns with the section title */}
          <ProfileCard className="float-right ml-6 mb-4 mt-2" />

          <h2 className="section-heading mt-8">Who's Behind This</h2>

          <p>
            I'm Odin Mühlenbein, Co-Founder of the AI Lab at Ashoka. Actually
            Relevant started as a side project, a way to scratch my own itch for
            better news. It's not a media company, not a startup, and not backed
            by investors. I like building things on the side, like social
            ventures and tools that people can use for free. This is one of
            those projects.
          </p>

          <h2 className="section-heading mt-8">Stewardship</h2>

          <p>
            Do you know an organization that could take this project further
            than one person can? I'm willing to hand it over.{" "}
            <Link
              to="/stewardship"
              className="text-brand-700 hover:text-brand-800 underline focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
            >
              Learn more about stewardship
            </Link>
            .
          </p>
        </div>

        {/* Support section */}
        <SupportButton className="mt-2 pt-8" />

        <div className="prose max-w-none mt-12 pt-8 border-t border-neutral-200">
          <h2 className="section-heading">Explore</h2>
          <ul className="space-y-2 my-4">
            <li>
              <Link
                to="/methodology"
                className="text-brand-700 hover:text-brand-800 font-normal"
              >
                Methodology
              </Link>{" "}
              &mdash; How we select stories, from source to publication
            </li>
            <li>
              <Link
                to="/compare"
                className="text-brand-700 hover:text-brand-800 font-normal"
              >
                Compare
              </Link>{" "}
              &mdash; Side-by-side comparison with Google News, Flipboard, and
              others
            </li>
            <li>
              <Link
                to="/news-fatigue"
                className="text-brand-700 hover:text-brand-800 font-normal"
              >
                News Fatigue
              </Link>{" "}
              &mdash; Why people avoid the news and how we help
            </li>
            <li>
              <Link
                to="/no-ads-no-tracking"
                className="text-brand-700 hover:text-brand-800 font-normal"
              >
                No Ads, No Tracking
              </Link>{" "}
              &mdash; Our commitment to privacy and independence
            </li>
            <li>
              <Link
                to="/free-api"
                className="text-brand-700 hover:text-brand-800 font-normal"
              >
                Free API
              </Link>{" "}
              &mdash; Build with our curated news data, no key required
            </li>
            <li>
              <Link
                to="/stewardship"
                className="text-brand-700 hover:text-brand-800 font-normal"
              >
                Stewardship
              </Link>{" "}
              &mdash; Help this project find a long-term home
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}
