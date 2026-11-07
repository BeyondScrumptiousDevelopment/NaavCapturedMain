# naavcaptured.com

Version 1 of the naavcaptured website: the logo intro plays, then the page settles into a branded link page. It replaces linktr.ee/naavcaptured in the Instagram bio. It's a plain static site with no build step, hosted free on Cloudflare.

| Path | What it is |
| --- | --- |
| `index.html`, `styles.css`, `app.js` | The link page and intro |
| `links.json` | **Edit this** to change the links, tagline and recent work |
| `privacy.html` | Privacy page linked from the footer |
| `functions/api/instagram.js` | Live Instagram feed for Recent work (runs on Cloudflare) |
| `assets/logo/` | Logo files and icons |
| `assets/social/` | Share preview image, social post reference |
| `assets/video/` | Web versions of the intro animation (made by `scripts/make-intro.sh`) |
| `_headers` | Cloudflare caching rules |

## Changing links

Open `links.json` on GitHub, click the pencil, edit, then click **Commit changes**. Cloudflare redeploys in about a minute.

- Set `"show": false` to hide a link, or `true` to show it.
- Anything marked `_todo` is a placeholder. The WhatsApp number and email address still need confirming.
- **Recent work** fills itself from Instagram (below). The `recentWork` list in `links.json` is only the backup if the feed is off or Instagram is down.

## The intro

The page plays the logo animation (`assets/video/intro-portrait.mp4` / `.webm`, well under 1 MB). On laptops its edges fade softly into the page, so one portrait video works on every screen. When it ends, the wordmark in the video shrinks into the header and the links fade in. Visitors can skip it, it doesn't replay in the same session, and it's skipped entirely when "reduce motion" is on or the link ends in `#links`. If the video can't play, a coded version of the same animation runs instead.

To replace the animation, run `./scripts/make-intro.sh path/to/new.mov` (needs ffmpeg). If the logo sits somewhere else in the new animation, update `VIDEO_MARK` in `app.js`.

The page background is `#EDEBE7`, the colour browsers render the animation's background as, so the video has no visible edge. The brand's bone is `#EFEEEA`.

## Live Instagram feed

Recent work shows the latest 6 posts from @naavcaptured, and each tile opens that post on Instagram. New posts appear on the site within 15 minutes. It uses Instagram's official API through a free Cloudflare function, so it needs a one-time setup:

1. **Account:** @naavcaptured must be a Professional account (Business or Creator). In the Instagram app: Settings → Account type and tools → Switch to professional account.
2. **App:** at developers.facebook.com, choose **Create app** → **Other** → **Business**, then add the **Instagram** product and pick **API setup with Instagram login**.
3. **Token:** under **Generate access tokens**, add @naavcaptured, log in and copy the token. This is a long-lived token (valid 60 days).
4. **Cloudflare:** in your Pages project go to **Settings → Variables and Secrets**, add a secret named `INSTAGRAM_TOKEN` and paste the token. Redeploy.
5. **Keep it alive (recommended):** go to **Storage & Databases → KV**, create a namespace (e.g. `naavcaptured-ig`). Then in the Pages project open **Settings → Bindings → KV namespace** and bind it with the variable name `IG`. The token then renews itself every week. Without this, repeat step 3 and 4 every 60 days.

Check it's working at `https://naavcaptured.com/api/instagram`. Until it's set up, Recent work shows the backup tiles from `links.json`.

## Deploying to Cloudflare (free)

1. In the Cloudflare dashboard, go to **Workers & Pages → Create → Pages → Connect to Git** and pick this repo.
2. Leave the framework preset as **None** and the build command empty. Set the output directory to `/`. Deploy. (The `functions/` folder is picked up automatically.)
3. Open **Custom domains → Set up a domain** and enter `naavcaptured.com`, then add `www.naavcaptured.com` too. If the domain's DNS is already on Cloudflare, this is one click. If not, Cloudflare shows the two nameservers to set at your registrar.
4. Analytics: go to **Web Analytics → Add a site** and copy the token. Paste it into the commented-out script at the bottom of `index.html`, then remove the comment markers.
5. Put `https://naavcaptured.com` in the Instagram bio.

The client portal can later live at `portal.naavcaptured.com` on the same Cloudflare account. Turn on the "Client login" link in `links.json` once it's live.

## Still open

- WhatsApp number and email address for the links
- "Book a date": keep as an email link, or add a short enquiry form (a Cloudflare Worker + Resend)
- Instagram feed setup (steps above)
- SVG or transparent PNG exports of the wordmark and lockup
