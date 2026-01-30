import { Helmet } from 'react-helmet-async'

export default function ImprintPage() {
  return (
    <>
      <Helmet>
        <title>Imprint - Actually Relevant</title>
        <meta
          name="description"
          content="Imprint and contact information for Actually Relevant."
        />
        <meta property="og:title" content="Imprint - Actually Relevant" />
        <meta property="og:description" content="Imprint and contact information for Actually Relevant." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://actuallyrelevant.news/imprint" />
        <meta property="og:image" content="https://actuallyrelevant.news/images/logo-text-square.jpg" />
      </Helmet>

      <div className="page-section">
        <h1 className="page-title">Imprint</h1>
        <p className="page-intro">
          Questions, feedback, or source suggestions? We'd love to hear from you.
        </p>

        <div className="prose max-w-none">
          <h2 className="section-heading mt-8">Get In Touch</h2>
          <p>
            Email:{' '}
            <a href="mailto:contact@actuallyrelevant.news" className="text-brand-700 hover:text-brand-800">
              contact@actuallyrelevant.news
            </a>
          </p>

          <h2 className="section-heading mt-8">Suggest a Source</h2>
          <p>
            Know a reliable news source that covers existential threats, climate,
            human development, or science and technology? We're always looking to
            expand our coverage. Send us an email with the source name and URL.
          </p>

          <hr className="my-10 border-neutral-200" />

          {/* Imprint — English */}
          <section>
            <h2 className="section-heading">Imprint</h2>
            <h3 className="text-lg font-medium mt-4 mb-2">
              Information According to &sect; 5 TMG
            </h3>
            <address className="not-italic text-neutral-600 leading-relaxed">
              Odin M&uuml;hlenbein<br />
              Sonnenallee 50<br />
              12045 Berlin
            </address>
            <p className="mt-2">
              Email:{' '}
              <a href="mailto:contact@actuallyrelevant.news" className="text-brand-700 hover:text-brand-800">
                contact@actuallyrelevant.news
              </a>
            </p>

            <h3 className="text-lg font-medium mt-6 mb-2">Editorially Responsible</h3>
            <address className="not-italic text-neutral-600 leading-relaxed">
              Odin M&uuml;hlenbein<br />
              Sonnenallee 50<br />
              12045 Berlin
            </address>
          </section>

          <hr className="my-10 border-neutral-200" />

          {/* Impressum — German */}
          <section lang="de">
            <h2 className="section-heading">Impressum</h2>
            <h3 className="text-lg font-medium mt-4 mb-2">
              Informationen gem&auml;&szlig; &sect; 5 TMG
            </h3>
            <address className="not-italic text-neutral-600 leading-relaxed">
              Odin M&uuml;hlenbein<br />
              Sonnenallee 50<br />
              12045 Berlin
            </address>
            <p className="mt-2">
              E-Mail:{' '}
              <a href="mailto:contact@actuallyrelevant.news" className="text-brand-700 hover:text-brand-800">
                contact@actuallyrelevant.news
              </a>
            </p>

            <h3 className="text-lg font-medium mt-6 mb-2">Redaktionell Verantwortlich</h3>
            <address className="not-italic text-neutral-600 leading-relaxed">
              Odin M&uuml;hlenbein<br />
              Sonnenallee 50<br />
              12045 Berlin
            </address>
          </section>
        </div>
      </div>
    </>
  )
}
