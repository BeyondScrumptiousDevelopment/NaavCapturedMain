# naavcaptured.com

The naavcaptured studio website, plus a separate link page for the Instagram bio. It's a plain static site with no build step, hosted free on Cloudflare.

| Address | What it is | Files |
| --- | --- | --- |
| `/` | Studio home: services (UGC & content shoots, social media management, branding, websites), live Instagram work, how it works, contact form | `index.html` |
| `/links` | Link page for the Instagram bio: logo intro, link buttons, Instagram feed | `links/index.html`, `app.js`, `links.json` |
| `/websites` | Website builds: packages, FAQ, enquiry form | `websites/index.html` |
| `/thanks`, `/websites/thanks` | Shown after a form is sent | `thanks.html`, `websites/thanks.html` |
| `/privacy` | Privacy page | `privacy.html` |
| `/api/instagram` | Latest Instagram posts, used by `/` and `/links` | `functions/api/instagram.js` |

Shared files: `styles.css` (tokens, wordmark, link page), `site.css` and `site.js` (studio pages and both forms), `assets/` (logos, video, screenshots), `_headers` (caching).

**Instagram bio:** use `naavcaptured.com/links`.

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
2. **App:** at developers.facebook.com, choose **Create app** and pick the use case **Manage messaging & content on Instagram**.
3. **Token:** open **Use cases → Customize** on that use case. Newer apps only offer **API setup with Unified login**; older ones offer **API setup with Instagram login**. Either works. Find **Generate access tokens**, add @naavcaptured and copy the token.
   - A token starting `IG` is an Instagram login token (expires after 60 days, see step 5).
   - A token starting `EAA` is a Unified login (Facebook) token. The site finds the Instagram account from it. If `/api/instagram` says it can't, also add a variable `INSTAGRAM_USER_ID` with the account's numeric ID.
4. **Cloudflare:** in your Pages project go to **Settings → Variables and Secrets**, add a secret named `INSTAGRAM_TOKEN` and paste the token. Then **Deployments → Retry deployment**.
5. **Instagram login tokens only:** go to **Storage & Databases → KV**, create a namespace (e.g. `naavcaptured-ig`), then in the Pages project **Settings → Bindings → KV namespace**, bind it as `IG`. The token then renews itself weekly. Without it, repeat steps 3–4 every 60 days.

Check it's working at `https://naavcaptured.com/api/instagram`: it lists your posts, or says in plain words what Meta rejected. Until it's set up, Recent work shows the backup tiles from `links.json`.

## Websites page

`naavcaptured.com/websites` sells website builds: hero, intro, recent work, packages, how it works, FAQ and an enquiry form. The home page links to it under the tagline, and the footer has a "websites" link. The copy comes from the "naavcaptured.com — Websites section & forms" doc.

**Connecting the forms (Formspree, free).** The contact form on `/` and the enquiry form on `/websites` work the same way, and can share one Formspree form or use one each:

1. Create a free account at formspree.io with your business email, then add a form called "websites enquiry".
2. Copy the form's endpoint, e.g. `https://formspree.io/f/abcdwxyz`.
3. Replace `FORM_ID` in `action="https://formspree.io/f/FORM_ID"` with your ID, in `index.html` (contact form) and `websites/index.html` (websites form).
4. Send a test enquiry from your phone and check the email arrives.

Until the ID is in, each form shows a friendly "please try again, or message us on Instagram" message instead of sending. Spam protection is Formspree's own filter plus a hidden `_gotcha` field. The free plan covers 50 enquiries a month.

**Swapping a recent-work placeholder:** put a 16:10 screenshot (about 1200×750) in `assets/websites/`, then in `websites/index.html` replace that card's `<span class="shot shot-ph">` with an `<img class="shot" ...>` and change its `<div class="site-card">` to an `<a href="...">` with the site's link. The naavcaptured card shows how.

**Changing prices or copy:** edit the text directly in `websites/index.html`. Prices also appear in the form's package options.

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
