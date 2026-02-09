# Privacy Page

## Requirements

- Add a `/privacy` page with a privacy policy
- Add two links in the footer: "Privacy" and "No Cookies"
- Reference the privacy page from the Imprint page
- Add route to `routes.ts` for sitemap/prerendering

## Data Audit

### What We Store on the User's Device

| What | Where | Who | Duration | Purpose |
|------|-------|-----|----------|---------|
| **Nothing** | - | Public visitors | - | Public visitors get zero cookies, zero localStorage, zero sessionStorage, zero IndexedDB |
| Refresh token | `refresh_token` httpOnly cookie, path `/api/auth` | Admin users only | 24 hours | Session re-authentication |
| JWT access token | In-memory JS variable (not persisted) | Admin users only | 15 minutes | API authorization |
| TanStack Query cache | In-memory (cleared on page refresh) | Admin users only | Until tab closes | Cache API responses |

**Public visitors have absolutely nothing stored on their device.** No cookies, no localStorage, no sessionStorage, no IndexedDB, no service workers.

### What We Collect About Users

| What | Where | Who | Retention | Purpose |
|------|-------|-----|-----------|---------|
| HTTP request metadata (method, URL, status, response time) | Server log files | All visitors | 14 days (configurable) | Operational monitoring |
| IP address | In-memory only (express-rate-limit) | All visitors | Not persisted | Rate limiting |
| Email address | Database (future newsletter) | Newsletter subscribers | Until unsubscribe | Send newsletter |
| Admin credentials | Database (bcrypt hashed) | Admin users | Indefinite | Authentication |

**Sensitive data is redacted in logs:** Authorization headers and cookies are replaced with `[REDACTED]` in all log entries (`server/src/lib/logger.ts`).

### What We Do NOT Collect

- No cookies for public visitors
- No tracking pixels or fingerprinting
- No Google Analytics or similar invasive analytics
- No third-party advertising scripts
- No social media tracking
- No localStorage/sessionStorage for public visitors
- No user behavior tracking
- No geographic location data
- No device fingerprinting

### Third-Party Services

| Service | Data Shared | Purpose |
|---------|------------|---------|
| **Simple Analytics** (planned) | Anonymous page views, referrer sources. No cookies, no personal data, no IP tracking. | Privacy-first website analytics |
| **Render.com** (hosting) | Standard HTTP request data (IP, user agent) as part of hosting infrastructure. We have no access to Render's infrastructure logs. | Website and API hosting |
| **EmailOctopus** (newsletter) | Email address, IP address (for spam prevention) | Newsletter delivery |

### Fonts

All fonts are **self-hosted** (Nexa Bold, Roboto) from `/fonts/`. No Google Fonts or external font CDNs are used, so no IP addresses leak to font providers.

### Web Manifest

The `site.webmanifest` is a local file with app metadata only (name, icons, theme color). It does not enable push notifications or any data collection.

## Implementation Steps

### 1. Create `PrivacyPage.tsx`

New file: `client/src/pages/PrivacyPage.tsx`

- Static page with Helmet meta tags
- Uses existing page utility classes (`page-section`, `page-title`, `prose`, `section-heading`)
- Content in English only

### 2. Add Route to `routes.ts`

```ts
{ path: '/privacy', priority: 0.5, changefreq: 'yearly' },
```

### 3. Add Route to `App.tsx`

Static import (public page, needed for prerendering):
```tsx
import PrivacyPage from './pages/PrivacyPage'
// ...
<Route path="/privacy" element={<PrivacyPage />} />
```

### 4. Update Footer in `PublicLayout.tsx`

Add "Privacy" and "No Cookies" to the footer Navigate column:

```ts
const FOOTER_NAV = [
  { label: 'All Issues', href: '/issues' },
  { label: 'Methodology', href: '/methodology' },
  { label: 'About', href: '/about' },
  { label: 'Imprint', href: '/imprint' },
  { label: 'Privacy', href: '/privacy' },
  { label: 'No Cookies', href: '/privacy' },
]
```

Both "Privacy" and "No Cookies" link to `/privacy`. "No Cookies" serves as a trust signal.

### 5. Simplify Imprint Page to English Only + Reference Privacy

- Remove the German "Impressum" / "Datenschutz" section entirely
- Add a link to the Privacy page in the English section:

```tsx
<p>
  For information about data collection and privacy, see our{' '}
  <Link to="/privacy" className="text-brand-700 hover:text-brand-800">
    Privacy Policy
  </Link>.
</p>
```

### 6. Build and Verify

- Run `npm run build --prefix client` to verify prerendering includes `/privacy`
- Run `npm run test --prefix client -- --run` to check for regressions

## Proposed Privacy Policy Text

The text below is designed to be honest, specific, and reassuring. It follows the style of the two sample texts but is tailored to Actually Relevant's actual data practices.

---

### Privacy Policy

**Actually Relevant respects your privacy. This website collects almost no data about you.**

We do not use cookies, tracking pixels, Google Analytics, advertising scripts, or any other invasive data collection. When you visit this site as a reader, nothing is stored on your device.

#### What We Collect

**Website Analytics**

We use [Simple Analytics](https://www.simpleanalytics.com/), a privacy-focused analytics service that:

- Does **not** use cookies
- Does **not** track individual visitors
- Does **not** collect personal data
- Does **not** store your IP address
- Respects Do Not Track settings
- Is fully GDPR, CCPA, and PECR compliant

Simple Analytics collects only aggregated, anonymous data such as page views and referrer sources. No information is ever tied to you as an individual. You can view their privacy policy at [simpleanalytics.com/privacy](https://simpleanalytics.com/privacy).

**Newsletter (Optional)**

If you choose to subscribe to our newsletter, we collect:

- Your **email address** (provided voluntarily by you)
- Your **IP address** (recorded by our newsletter provider, [EmailOctopus](https://emailoctopus.com/), to prevent spam and abuse)

This data is used solely to send you updates about Actually Relevant and to prevent abuse of the newsletter service. We will never share, sell, or distribute your email address to any third party.

You can unsubscribe at any time using the unsubscribe link included in every email.

**Server Logs**

Our server records basic request metadata (URL path, HTTP status, response time) for operational monitoring. These logs are retained for 14 days and then automatically deleted. Sensitive information such as authentication headers and cookies is redacted from all logs.

#### What We Store on Your Device

**Nothing.** We do not set cookies, and we do not use localStorage, sessionStorage, IndexedDB, or any other browser storage mechanism for public visitors.

The only exception is our administrative interface, which is not accessible to the public and uses secure, httpOnly authentication cookies.

#### Third-Party Services

| Service | Purpose | Data Shared |
|---------|---------|-------------|
| [Simple Analytics](https://www.simpleanalytics.com/) | Privacy-first analytics | Anonymous page views only. No cookies, no personal data. |
| [EmailOctopus](https://emailoctopus.com/) | Newsletter delivery | Email address and IP address (if you subscribe). See their [privacy policy](https://emailoctopus.com/legal/privacy). |
| [Render](https://render.com/) | Website hosting | Standard HTTP data (IP address, user agent) as part of hosting infrastructure. We have no access to Render's infrastructure logs. |

All fonts used on this site are self-hosted. We do not load fonts, scripts, or other resources from external CDNs like Google, meaning your IP address is not shared with third parties when you visit.

#### Your Rights

Under GDPR (and similar regulations), you have the right to:

- Request access to any personal data we hold about you
- Request correction or deletion of your data
- Object to data processing
- Lodge a complaint with a supervisory authority

Since we collect almost no personal data, there is typically very little (if anything) for us to provide. If you have subscribed to our newsletter, we can delete your email address upon request.

For any privacy-related questions, contact us at [contact@actuallyrelevant.news](mailto:contact@actuallyrelevant.news).

---

## Decisions

- Newsletter provider: **EmailOctopus**
- Simple Analytics dashboard: **Omitted** from privacy page (just link their privacy policy)
- Language: **English only** — also simplify the Imprint page to English only (remove German section)

---

## Reference Samples

<details>
<summary>Sample: rentabrad.com</summary>

Privacy Policy
This static website collects minimal data. We use privacy-focused analytics and optional newsletter signup only.

We do NOT use invasive services like ads, Google Analytics, user tracking, or any other data collection beyond privacy-first analytics and our optional newsletter.

Privacy-First Analytics
Simple Analytics
We use Simple Analytics, a privacy-focused analytics service that:

- Does NOT use cookies
- Does NOT track individual visitors
- Does NOT collect personal data
- Respects Do Not Track settings
- Is GDPR, CCPA, and PECR compliant
Simple Analytics only collects aggregated, anonymous data like page views and referrer sources. You can view their privacy policy at simpleanalytics.com/privacy.

Newsletter Data Collection
What We Collect (Newsletter Only)
- Email address (when you voluntarily sign up for our newsletter)
- IP address (collected by our newsletter provider, Mailjet, to prevent spam and abuse)
Purpose
- Send you updates about Rent a Brad
- Prevent spam and abuse of the newsletter service
What We DON'T Collect
- No cookies or session data
- No invasive analytics or tracking scripts
- No form submissions (besides newsletter signup)
- No user accounts or login data
- No localStorage or sessionStorage usage
- No social media tracking pixels
- No personal data collection
Third-Party Services
Simple Analytics: Our privacy-focused analytics provider that collects only anonymous, aggregated data without cookies or personal information.

Mailjet: Our newsletter service provider. When you sign up for our newsletter, your email address and IP address are processed by Mailjet according to their privacy policy. We chose Mailjet for their compliance with GDPR and other privacy regulations.

Technical Details
This website is a static site hosted on Render. When you visit, your browser requests files directly from the server, but no data about your visit is logged, stored, or processed by us. The hosting provider may have their own logging for infrastructure purposes, but we have no access to or control over that data.

Data Sharing
We do not share, sell, or distribute your email address or any information about our visitors. Your newsletter subscription data is only used to send you updates about this satirical project. This website is satirical in nature and does not operate as a real service.

Your Rights
You can unsubscribe from our newsletter at any time using the unsubscribe link in any email we send you. This will remove your email address from our mailing list.
</details>

<details>
<summary>Sample: odins.website (German)</summary>

Impressum
Verantwortlich fur den Inhalt:
Odin Muhlenbein, Sonnenallee 50, 12045 Berlin, Germany

Datenschutz
Diese Webseite verwendet keine Cookies.

Soweit auf dieser Seite personenbezogene Daten erhoben werden, erfolgt dies auf freiwilliger Basis. Diese Daten werden ohne Ihre ausdruckliche Zustimmung nicht an Dritte weitergegeben.

(Full German legal text omitted for brevity)
</details>
