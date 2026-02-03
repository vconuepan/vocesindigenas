import { Helmet } from 'react-helmet-async'
import ObfuscatedEmail from '../components/ObfuscatedEmail'

export default function PrivacyPage() {
  return (
    <>
      <Helmet>
        <title>Privacy Policy - Actually Relevant</title>
        <meta
          name="description"
          content="Actually Relevant respects your privacy. No cookies, no tracking pixels, no invasive analytics. Learn what minimal data we collect."
        />
        <meta property="og:title" content="Privacy Policy - Actually Relevant" />
        <meta
          property="og:description"
          content="Actually Relevant respects your privacy. No cookies, no tracking pixels, no invasive analytics."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://actuallyrelevant.news/privacy" />
        <meta property="og:image" content="https://actuallyrelevant.news/images/logo-text-square.jpg" />
      </Helmet>

      <div className="page-section">
        <h1 className="page-title">Privacy Policy</h1>
        <p className="page-intro">
          Actually Relevant respects your privacy. This website collects almost no data about you.
        </p>

        <div className="prose max-w-none">
          <p>
            We do not use cookies, tracking pixels, Google Analytics, advertising scripts, or any
            other invasive data collection. When you visit this site as a reader, nothing is stored
            on your device.
          </p>

          <h2 className="section-heading mt-10">What We Collect</h2>

          <h3 className="text-lg font-medium mt-6 mb-2">Website Analytics</h3>
          <p>
            We use{' '}
            <a
              href="https://www.simpleanalytics.com/"
              className="text-brand-700 hover:text-brand-800"
              target="_blank"
              rel="noopener noreferrer"
            >
              Simple Analytics
            </a>
            , a privacy-focused analytics service that:
          </p>
          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li>Does <strong>not</strong> use cookies</li>
            <li>Does <strong>not</strong> track individual visitors</li>
            <li>Does <strong>not</strong> collect personal data</li>
            <li>Does <strong>not</strong> store your IP address</li>
            <li>Respects Do Not Track settings</li>
            <li>Is fully GDPR, CCPA, and PECR compliant</li>
          </ul>
          <p className="mt-3">
            Simple Analytics collects only aggregated, anonymous data such as page views and
            referrer sources. No information is ever tied to you as an individual. You can view
            their privacy policy at{' '}
            <a
              href="https://simpleanalytics.com/privacy"
              className="text-brand-700 hover:text-brand-800"
              target="_blank"
              rel="noopener noreferrer"
            >
              simpleanalytics.com/privacy
            </a>
            .
          </p>

          <h3 className="text-lg font-medium mt-6 mb-2">Newsletter (Optional)</h3>
          <p>If you choose to subscribe to our newsletter, we collect:</p>
          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li>
              Your <strong>email address</strong> (provided voluntarily by you)
            </li>
            <li>
              Your <strong>IP address</strong> (recorded by our newsletter provider,{' '}
              <a
                href="https://emailoctopus.com/"
                className="text-brand-700 hover:text-brand-800"
                target="_blank"
                rel="noopener noreferrer"
              >
                EmailOctopus
              </a>
              , to prevent spam and abuse)
            </li>
          </ul>
          <p className="mt-3">
            This data is used solely to send you updates about Actually Relevant and to prevent
            abuse of the newsletter service. We will never share, sell, or distribute your email
            address to any third party.
          </p>
          <p>
            You can unsubscribe at any time using the unsubscribe link included in every email.
          </p>

          <h3 className="text-lg font-medium mt-6 mb-2">Server Logs</h3>
          <p>
            Our server records basic request metadata (URL path, HTTP status, response time) for
            operational monitoring. These logs are retained for 14 days and then automatically
            deleted. Sensitive information such as authentication headers and cookies is redacted
            from all logs.
          </p>

          <h2 className="section-heading mt-10">What We Store on Your Device</h2>
          <p>
            <strong>Nothing.</strong> We do not set cookies, and we do not use localStorage,
            sessionStorage, IndexedDB, or any other browser storage mechanism for public visitors.
          </p>
          <p>
            The only exception is our administrative interface, which is not accessible to the
            public and uses secure, httpOnly authentication cookies.
          </p>

          <h2 className="section-heading mt-10">Third-Party Services</h2>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th scope="col" className="text-left py-2 pr-4 font-medium">Service</th>
                  <th scope="col" className="text-left py-2 pr-4 font-medium">Purpose</th>
                  <th scope="col" className="text-left py-2 font-medium">Data Shared</th>
                </tr>
              </thead>
              <tbody className="text-neutral-600">
                <tr className="border-b border-neutral-100">
                  <td className="py-2 pr-4">
                    <a
                      href="https://www.simpleanalytics.com/"
                      className="text-brand-700 hover:text-brand-800"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Simple Analytics
                    </a>
                  </td>
                  <td className="py-2 pr-4">Privacy-first analytics</td>
                  <td className="py-2">Anonymous page views only. No cookies, no personal data.</td>
                </tr>
                <tr className="border-b border-neutral-100">
                  <td className="py-2 pr-4">
                    <a
                      href="https://emailoctopus.com/"
                      className="text-brand-700 hover:text-brand-800"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      EmailOctopus
                    </a>
                  </td>
                  <td className="py-2 pr-4">Newsletter delivery</td>
                  <td className="py-2">
                    Email address and IP address (if you subscribe). See their{' '}
                    <a
                      href="https://emailoctopus.com/legal/privacy"
                      className="text-brand-700 hover:text-brand-800"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      privacy policy
                    </a>
                    .
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">
                    <a
                      href="https://render.com/"
                      className="text-brand-700 hover:text-brand-800"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Render
                    </a>
                  </td>
                  <td className="py-2 pr-4">Website hosting</td>
                  <td className="py-2">
                    Standard HTTP data (IP address, user agent) as part of hosting infrastructure.
                    We have no access to Render's infrastructure logs.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-4">
            All fonts used on this site are self-hosted. We do not load fonts, scripts, or other
            resources from external CDNs like Google, meaning your IP address is not shared with
            third parties when you visit.
          </p>

          <h2 className="section-heading mt-10">Your Rights</h2>
          <p>Under GDPR (and similar regulations), you have the right to:</p>
          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li>Request access to any personal data we hold about you</li>
            <li>Request correction or deletion of your data</li>
            <li>Object to data processing</li>
            <li>Lodge a complaint with a supervisory authority</li>
          </ul>
          <p className="mt-3">
            Since we collect almost no personal data, there is typically very little (if anything)
            for us to provide. If you have subscribed to our newsletter, we can delete your email
            address upon request.
          </p>
          <p>
            For any privacy-related questions, contact us at{' '}
            <ObfuscatedEmail className="text-brand-700 hover:text-brand-800" />.
          </p>
        </div>
      </div>
    </>
  )
}
