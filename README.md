# naavcaptured.com

Version 1 of the naavcaptured website: the logo intro plays, then the page settles into a branded link page. It replaces linktr.ee/naavcaptured in the Instagram bio. It's a plain static site with no build step, hosted free on Cloudflare.

| Path | What it is |
| --- | --- |
| `index.html`, `styles.css`, `app.js` | The link page and intro |
| `links.json` | **Edit this** to change the links, tagline and recent work |
| `privacy.html` | Privacy page linked from the footer |
| `brand/` | The brand kit page (naavcaptured.com/brand, not linked from the site) |
| `assets/logo/` | Logo files and icons |
| `assets/social/` | Share preview image, social post reference |
| `assets/video/` | Web versions of the intro animation (made by `scripts/make-intro.sh`) |
| `_headers` | Cloudflare caching rules |

## Changing links

Open `links.json` on GitHub, click the pencil, edit, then click **Commit changes**. Cloudflare redeploys in about a minute.

- Set `"show": false` to hide a link, or `true` to show it.
- Anything marked `_todo` is a placeholder. The WhatsApp number and email address still need confirming.
- **Recent work:** add a 4:5 portrait image (about 800×1000px, JPG) to `assets/work/`, then put its path in `"image"` and the post link in `"href"`. A tile with no image shows its caption as a typeset card.

## The intro

By default the page plays a coded version of the logo animation: *naav* types in, then **captured.**, then EST 2025. The lockup holds, then shrinks into the header. Visitors can skip it, it doesn't play again in the same session, and it's skipped entirely when "reduce motion" is on or the link ends in `#links`.

To use the real animation instead:

1. Install ffmpeg, then run `./scripts/make-intro.sh path/to/Naav_logo_animaiton_2_V2.mov`. This writes portrait and landscape MP4 and WebM files plus a poster frame to `assets/video/`.
2. In `index.html`, change `<div class="intro-stage" id="intro" aria-hidden="true">` to `<div class="intro-stage" id="intro" aria-hidden="true" data-video="assets/video/intro">`.

If the video fails to load, the coded intro plays instead.

The page background is `#ECEAE6`, the colour the animation renders on, so the video has no visible edge. The brand's bone is `#EFEEEA`. If the animation is re-exported on `#EFEEEA`, change `--page` in `styles.css` and `BG` in the script.

## Deploying to Cloudflare (free)

1. In the Cloudflare dashboard, go to **Workers & Pages → Create → Pages → Connect to Git** and pick this repo.
2. Leave the framework preset as **None** and the build command empty. Set the output directory to `/`. Deploy.
3. Open **Custom domains → Set up a domain** and enter `naavcaptured.com`, then add `www.naavcaptured.com` too. If the domain's DNS is already on Cloudflare, this is one click. If not, Cloudflare shows the two nameservers to set at your registrar.
4. Analytics: go to **Web Analytics → Add a site** and copy the token. Paste it into the commented-out script at the bottom of `index.html`, then remove the comment markers.
5. Put `https://naavcaptured.com` in the Instagram bio.

The client portal can later live at `portal.naavcaptured.com` on the same Cloudflare account. Turn on the "Client login" link in `links.json` once it's live.

## Still open

- WhatsApp number and email address for the links
- "Book a date": keep as an email link, or add a short enquiry form (a Cloudflare Worker + Resend)
- Which 3–6 posts go in Recent work
- SVG or transparent PNG exports of the wordmark and lockup
