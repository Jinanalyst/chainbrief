# Chain Brief

Personalized crypto RSS briefing website.

Chain Brief is a compact crypto news briefing feed that pulls from free public RSS sources and helps readers scan important headlines quickly with source, category, and keyword filters.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- React
- rss-parser
- Browser `localStorage` for user preferences

## Run Locally

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Build for production:

```bash
npm run build
```

Run lint:

```bash
npm run lint
```

## Current Features

- Server-side RSS fetching from free public feeds
- RSS sources:
  - CoinDesk
  - Cointelegraph
  - Decrypt
  - Blockworks
- Normalized article API at `/api/briefs`
- 20-minute RSS caching/revalidation
- Compact vertical crypto briefing feed
- Live issues bar with recent headlines
- Category tabs
- Source selection
- Include keyword filtering
- Exclude keyword filtering
- Expandable brief items
- Korean brief summary generated from RSS metadata only
- Original article links
- Settings page with localStorage preferences
- Dark, responsive Chain Brief design

## Future Roadmap

- User accounts and saved preferences
- Database-backed settings and saved articles
- More RSS source management
- Advanced ranking and importance scoring
- Optional AI summaries with proper source attribution
- Email newsletter delivery
- Search and archive pages
- Topic alerts

## Notes

- No login is included yet.
- No database is included yet.
- No paid APIs or API keys are required.
- The app does not scrape full article bodies; it only uses RSS-provided metadata.
