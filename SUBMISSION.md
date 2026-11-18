# Once Upon Us: Devpost submission

Every answer to paste into the Devpost form for the Meta VR Start Developer Competition 2026 sits in its own box below, ready to copy.

Deadline: 18 Nov 2026, 12:00 PM PST (10:00 PM Cairo).

## Project name

```text
Once Upon Us
```

## Tagline

```text
A seated VR pop-up book of a grandparents' love story, made as a gift by their grandchildren and opened with your own hands.
```

Note: 124 characters (limit 140).

## Description

```markdown
Once Upon Us is a pop-up book in VR that tells the love story of an elderly couple. Grandchildren make it as a gift: they type their grandparents' names and a dedication, add up to 10 family photos with their dates, and send the link. The grandparents sit at a table in VR, open the book with their own hands and turn the pages.

## Inspiration

I made it for older people, as a way for their grandchildren to reach them and show their love. A gift like this can lift their mood and their spirits. Everyone knows how to open a book and turn a page, so the book is the whole interface.

## Who it is for

Families who want to give their grandparents a personal gift, and the grandparents who read it. The demo couple, Grace and Henry, is fictional, and the demo album photos are AI generated pictures of them, made with ChatGPT.

## Hands only

It is seated, and no controllers are needed. Pinch a page corner and turn it like paper, or poke the large paper arrow tabs. Either hand works. On each of the 5 story spreads, a paper scene stands up as the page opens and folds flat as it closes: a rainy bus stop, a wedding, a first home, a busy dinner table and a sunset bench. The words fade in line by line. Then a photo album sets the family photos down one by one with a slow film zoom, and the dedication waits on the last page.

There is no tutorial text in VR. While the book is closed, the cover corner lifts softly and a small paper hand shows the pinch.

## Accessibility

Five switches sit on the start page and as paper buttons in front of the book: Large text, High contrast, Large tabs, Read aloud and Sound. High contrast prints bold dark ink on lighter paper and gives the pop-up paper figures thick outlines. Read aloud uses the browser's own speech voice, so it works only where the browser has one, and its switch hides itself otherwise. There is no time pressure, no flashing and no locomotion. The font is Atkinson Hyperlegible Next.

## How I built it

Meta IWSDK 1.1.0 and TypeScript. Pages turn with IWSDK's OneHandGrabbable, following the index fingertip. Tabs and buttons use PokeInteractable. The rest is 10 custom ECS systems. The room, the book, its paper art and its sounds are all made in code with canvas and Web Audio. Names and the dedication live in the link after "#". Photos are shrunk in the browser. They are saved on Cloudflare's free plan, and only when the family presses Save photos. Anyone with the gift link can see them, and they are deleted after 30 days.

## Future plans and launch date

There are no future plans. Once Upon Us was made only for this competition. There is no target launch date: it is free and live now at https://once-upon-us-7yf.pages.dev.
```

Note: 498 words (limit 500). The headings are counted.

## Track

```text
Entertainment
```

## Division

```text
New Experience
```

## Target launch date

Use this only if the form has a separate box for it. The same answer is already in the description.

```text
No target launch date. Once Upon Us was made only for this competition. It is free and live now at https://once-upon-us-7yf.pages.dev.
```

## Future plans

Use this only if the form has a separate box for it. The same answer is already in the description.

```text
There are no future plans. This project was made only for the Meta VR Start Developer Competition 2026.
```

## Special awards it targets

The rules say each entry can win only one prize, the highest one it qualifies for. Special awards are open to both divisions and all tracks. If the form has no box for this, keep it for reference.

```text
Special award: Best Accessibility Forward Experience
Seated and hands only. Large text, High contrast and Large tabs change inside VR with one poke, and so does Read aloud where the browser has a working voice. Big poke tabs turn pages for hands that find the pinch hard.

Special award: Best First Five Minutes
No tutorial text in VR: the cover corner lifts and a small paper hand shows the pinch, and the first pinch opens a rainy bus stop that stands up from the page.

Special award: Boldest Original Concept
A pop-up book needs real depth and real hands: paper scenes stand up at arm's length as the reader's own fingers open each page, and a family's own names, words and photos make it a personal gift.
```

## Link to the project (Try it out)

```text
https://once-upon-us-7yf.pages.dev
```

## Code repository

```text
https://github.com/khaledm2225/once-upon-us
```

## Team

```text
Khaled Mohammed, developer and designer
```

## Testing instructions

```text
1. On a Meta Quest 3 or 3S, open the Meta Quest Browser and go to https://once-upon-us-7yf.pages.dev. There is no install, no account and no sign in.
2. Put the controllers down and use your hands. The experience is seated, so sit at a table or on a chair.
3. Wait until the Enter VR button is active (it shows "Preparing the book…" while the book builds), then press Enter VR.
4. The default book is the story of Grace and Henry, a fictional couple, with a demo album of AI generated photos.
5. Open the cover: pinch near its outer edge and carry it over the spine, or poke the paper arrow tab on the right edge.
6. Turn pages: pinch the near outer corner of a page and carry it past the middle. Let go before halfway and it falls back. Poke the right tab to go forward and the left tab to go back.
7. Reading settings: poke the paper buttons along the front edge of the table: Large text, High contrast, Large tabs, Read aloud and Sound. Read aloud shows only where the browser has a speech voice. If speech does not start, it turns itself off for the visit.
8. Make a gift: leave VR. On the start page, type two names and a dedication, press Add photos, pick up to 10 photos and give each one a year, then press Save photos. No photos at hand? Press Use sample photos to add the 10 demo photos with their dates, then press Save photos. The page address is now the gift link. Copy it from the address bar and open it to see the gift book. Anyone with the link can see the saved photos, and they are deleted after 30 days. To stay on Cloudflare's free plan, the site accepts up to 20 new photo sets in 24 hours for the whole site. If Save photos says the photos could not be saved, try again later. The names and the dedication still work without photos, because the link carries them.
9. The book remembers its page on this device. A finished book reopens at the cover.
10. No headset: on a computer, the live site shows the start page and the gift form, but Enter VR stays off. To try the book there, clone https://github.com/khaledm2225/once-upon-us, run npm install, then npm run dev. A browser window opens with the Meta Quest 3 emulator. Set the emulator to hand input, then press Enter VR. Saving photos there also needs the photo server, as the README shows.
```

## Built with

Devpost allows up to 25 tags. Type each one as a tag.

```text
Meta Immersive Web SDK (IWSDK)
WebXR
TypeScript
Three.js
Vite
HTML Canvas
Web Audio API
Web Speech API
Cloudflare Pages
Cloudflare Pages Functions
Cloudflare D1
Cloudflare Workers
Immersive Web Emulator (IWER)
Atkinson Hyperlegible Next
ChatGPT
```

## Optional: how hand interactions are implemented

This box is optional on the form. The second half of the question, what excites you about the future of VR, is your own opinion, so it is left out here.

```text
Two IWSDK hand interactions carry the whole book. Pinch to turn: an invisible grab box at each page's near outer corner carries OneHandGrabbable with rotate and translate off. A custom PageTurnSystem reacts to IWSDK's Grabbed tag and makes the page follow the index fingertip around the spine. On release, a page past halfway finishes the turn, otherwise it falls back. Only one page turns at a time, and each frame's movement is capped to soften hand tracking noise. Poke: the paper arrow tabs and the paper settings buttons use PokeInteractable and its Pressed and Hovered tags. A tab works again only after every fingertip moves 6 cm away. This is meant to keep a trembling finger from turning page after page. A settings button counts only when a fingertip really touches it from above. Hand rays are turned off, and every piece of feedback is paper: a page lifts when a hand comes near, and tabs rise on hover and sink on press.
```

## Thumbnail

The file is `submission/thumbnail.png` (738 by 492 pixels, a 3:2 ratio, as Devpost suggests).

## Demo video shot list

Rules for this video:

- Under 3 minutes, in English, uploaded as public on YouTube or Vimeo.
- Recorded in the Immersive Web Emulator (IWER) on the dev server (`npm run dev`), set to Meta Quest 3, with hand input, not controllers, so hands show from the first second.
- The real app only. No AI generated video.
- Hands first and clear within the first 30 seconds.
- No brands, logos or real people. For the gift shot, use the demo album photos from `public/album/`, never real family photos.
- Sound is the app's own paper sounds. No outside music.

Shots:

1. 0:00 to 0:12. The closed book on the table in the warm lamp light. The cover corner lifts and the small paper hand shows the pinch. On screen text: "Once Upon Us. A pop-up book you open with your hands."
2. 0:12 to 0:30. An emulated hand pinches the cover and opens it. The rainy bus stop stands up, paper rain falls, and the two lines fade in.
3. 0:30 to 0:50. Pinch the next page and hold it half open, so the wedding scene stands half way. Let go before halfway so it falls back, then turn it fully. The string lights sway.
4. 0:50 to 1:10. Poke the right arrow tab with a fingertip. The first home opens with its glowing window and steam. Poke again for the busy dinner table.
5. 1:10 to 1:25. The sunset bench scene. Hold on the paper sun lowering behind the hills.
6. 1:25 to 1:45. The photo album: prints set down one by one, then the slow zoom into one photo. On screen text: "Demo photos are AI generated pictures of a fictional couple."
7. 1:45 to 1:58. Turn to the last page: the dedication.
8. 1:58 to 2:20. Poke the paper buttons: Large text, then High contrast, then Large tabs. Show the book reprint each time. Show Read aloud only if the recording browser has a voice and it really speaks. If not, skip it.
9. 2:20 to 2:45. The 2D start page: type two names and a dedication, press Use sample photos, press Save photos, and show the address bar change into the gift link. Enter VR and show the new names on the cover. Run the photo server too, as the README shows, so Save photos works on the dev server. Crop or blur the address bar: on the dev server it shows a local address, not the live link.
10. 2:45 to 2:55. The book closes on the table. On screen text: the live link https://once-upon-us-7yf.pages.dev

## Before you press Submit

- Check you are a confirmed Meta VR Start member: on the Start homepage, press "Apply today". A member page means you are confirmed. A form means you are not yet.
- Read every Step 4 question on the logged in form. They could not be read from outside, so a box may exist here that this file does not cover.
- Make sure the entry shows "Submitted", not "Draft".
- Do not redeploy the site or change the video after the deadline. The rules say changes during judging can put the entry at risk.
- Keep the link and the video public until the winners are announced.
