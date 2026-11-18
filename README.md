# Once Upon Us

A pop-up book in virtual reality that tells the love story of an elderly couple.

Grandchildren make it as a gift: they type their grandparents' names and a dedication, and send the link. The grandparents sit at a table in VR, open the book with their own hands, and turn the pages. On every page a paper scene unfolds and stands up, like a real pop-up book.

The demo couple, Grace and Henry, is fictional.

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

## Build it

```bash
npm run build
```

The finished site goes into the `dist` folder.

## Deploy it

The site is hosted on Cloudflare Pages, free plan, static files only. Log in once (the login is stored in the macOS keychain, never in this project):

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

## Credits

All visuals are made in code. Third party files and their licenses are listed in `CREDITS.md`.
