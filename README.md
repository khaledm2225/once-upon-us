# Once Upon Us

A pop-up book in virtual reality that tells the love story of an elderly couple.

Grandchildren make it as a gift: they type their grandparents' names and a dedication, add up to 10 family photos with their dates, and send the link. The grandparents sit at a table in VR, open the book with their own hands, and turn the pages. On each of the 5 story pages, one of the family photos stands up from the fold as a printed photo, like a real pop-up book, and the words appear line by line. After the story, a photo album shows the family photos one by one. Each photo rises, its date writes itself across it in warm letters, and it glides into place with a soft musical swell. Then a slow film-like camera move drifts from photo to photo.

The demo couple, Grace and Henry, is fictional. The demo album photos are AI-generated images of these fictional people.

## In VR

- **Hands only, seated.** Pinch a page corner and turn it like paper, or poke the big paper arrows to turn one page at a time. Either hand works.
- **The first minute.** The closed cover lifts softly every few seconds, and a small paper hand shows the pinch. Both stop after the first pinch.
- **Reading settings.** Large text, high contrast (darker ink on lighter paper), large page arrows and read aloud. Change them on the start page or with the paper buttons in front of the book. They are saved on the device.
- **Read aloud** appears only where the browser has a voice to read with.
- **Sound.** Sounds are made in code with Web Audio: a lift, a turn, a soft thump when a page lands, quiet rain on the first page, and a soft warm swell as each album photo rises. A Sound switch on the start page turns them off.

Built for the Meta VR Start Developer Competition 2026, Entertainment track, with Meta's Immersive Web SDK (IWSDK) and TypeScript.

Live link: https://once-upon-us-7yf.pages.dev

## What you need

- Node.js 20.19 or later in the 20 line, 22.12 or later in the 22 line, or 24 or later.
- npm, which comes with Node.js.
- A Meta Quest headset is optional: the dev server includes a browser headset emulator.

## Run it on your computer

Install the packages once:

```bash
npm install
```

Start the dev server. It opens a browser window with the headset emulator inside:

```bash
npm run dev
```

Click **Enter VR** on the start page to enter the book.

To try saving family photos on your computer, also run the photo server. It keeps its test database in the local `.wrangler` folder:

```bash
npx wrangler d1 execute once-upon-us-photos --local --file=server/schema.sql
```

```bash
npm run build
```

```bash
npx wrangler pages dev --port 8788
```

The dev server sends every `/api` request to it.

## Build it

```bash
npm run build
```

The finished site goes into the `dist` folder.

## Deploy it

The site is hosted on Cloudflare Pages, free plan. Family photos use Pages Functions (the `functions` folder) and one Cloudflare D1 database (`server/schema.sql`), both on the free plan, which stops at its daily limits and never bills. The database is connected by name in `wrangler.toml`; there are no secret keys in this project. Log in once (the login is stored in the macOS keychain, never in this project):

```bash
npx wrangler login --use-keyring
```

Then build and deploy from the `main` branch:

```bash
npm run build
```

```bash
npx wrangler pages deploy dist --project-name once-upon-us --branch main
```

Before the first deploy, create the database tables once:

```bash
npx wrangler d1 execute once-upon-us-photos --remote --file=server/schema.sql
```

The daily photo cleanup is a separate small Worker in `workers/cleanup` (Pages can't run on a schedule). Deploy it once, and again whenever it changes:

```bash
npx wrangler deploy --config workers/cleanup/wrangler.toml
```

## Family photos and privacy

- Photos are shrunk in the browser before they leave the device, to at most 1024 pixels.
- They are saved only when the family presses **Save photos**.
- A saved set gets a long random id that only the gift link carries. Anyone with the link can see the photos.
- Photos can be added to a set only in the first 30 minutes, and a saved photo never changes.
- Photos are kept for 30 days. After that the site stops showing them, and a small daily job deletes them from the database.

## Credits

All visuals are made in code, except the demo album photos, which are AI-generated. Third party files and their licenses are listed in `CREDITS.md`.
