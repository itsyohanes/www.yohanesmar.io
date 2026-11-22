# yohanesmar.io: static site

A hand-written static rebuild of [yohanesmar.io](https://www.yohanesmar.io/). It has no WordPress, no build step and no dependencies.

## Structure

```
index.html                       Home
about/index.html                 About
portfolio/index.html             Portfolio grid
<case-study>/index.html          ausev, advanced-manufacturing-queensland, hydronics,
                                 ausmv, lookaroo, australian-owned
assets/css/style.css             All styles
assets/js/main.js                Mobile menu + lightbox
assets/fonts/                    Poppins, Roboto Condensed, Roboto Flex (self-hosted)
404.html                         Not-found page (picked up by Netlify, GitHub Pages, Cloudflare Pages)
sitemap.xml, robots.txt
assets/img/                      Logos / favicon
assets/img/og/                   1200×630 social share images, one per page
assets/media/<project>/          Images (WebP/JPG) and video per page
```

URLs match the old WordPress permalinks (`/about/`, `/ausev/`, …), so existing links keep working.

## Run locally

Any static server works:

```
python -m http.server 8080
```

Then open http://localhost:8080.

## Deploy

Upload the folder as-is to any static host, such as Netlify, Cloudflare Pages, GitHub Pages or plain nginx. Asset paths are relative, so the site also works from a sub-path.
