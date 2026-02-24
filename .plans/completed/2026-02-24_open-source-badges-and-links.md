# Add Open-Source / GitHub Links to Website

## Goal
Add GitHub repo link and AGPL open-source status to five locations on the public website, plus a license flexibility note on the stewardship page.

## Changes

### 0. Shared config (`client/src/config.ts`)
- Added `GITHUB_REPO_URL` and `GITHUB_LICENSE_URL` constants to avoid URL duplication

### 1. Footer — GitHub icon in social links (`PublicLayout.tsx`)
- Added GitHub icon (inline SVG) after Mastodon link, matching existing social icon style
- Uses shared `GITHUB_REPO_URL` constant

### 2. About page — "Open Source" subsection (`AboutPage.tsx`)
- Added "Open Source" h2 section after "Stewardship" section
- Links to LICENSE file and GitHub repo

### 3. Stewardship page — license note under cards (`StewardshipPage.tsx`)
- Added paragraph after the 2x2 cards grid mentioning AGPL v3 + license flexibility for stewards
- Links to LICENSE file and GitHub repo

### 4. Thank You page — self-reference (`ThankYouPage.tsx`)
- Added "open source on GitHub" link in intro paragraph

### 5. Imprint page — license note (`ImprintPage.tsx`)
- Added paragraph after privacy policy link noting AGPL v3 license and GitHub link
