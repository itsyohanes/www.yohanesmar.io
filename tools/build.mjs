// Page generator for the static site.
//
// Usage (from the repo root, Node 18+, no dependencies):
//   node tools/build.mjs
//
// It rewrites every page (index.html, about/, portfolio/, the six case
// studies, 404.html) plus sitemap.xml and robots.txt from the content below.
// Edit content and shared markup HERE, then re-run; hand edits to the
// generated HTML files are overwritten on the next build.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://www.yohanesmar.io";
const YEAR = new Date().getFullYear();

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* ---------- Image dimensions (read from file headers; PNG, JPEG, WebP) ---------- */
function imageSize(file) {
  const b = fs.readFileSync(file);
  if (b.toString("ascii", 1, 4) === "PNG") return [b.readUInt32BE(16), b.readUInt32BE(20)];
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
      if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  if (b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") {
    const chunk = b.toString("ascii", 12, 16);
    if (chunk === "VP8 ") return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
    if (chunk === "VP8L") { const v = b.readUInt32LE(21); return [(v & 0x3fff) + 1, ((v >> 14) & 0x3fff) + 1]; }
    if (chunk === "VP8X") return [b.readUIntLE(24, 3) + 1, b.readUIntLE(27, 3) + 1];
  }
  throw new Error("Unsupported image format: " + file);
}
const dimsCache = new Map();
const dims = (p) => {
  if (!dimsCache.has(p)) dimsCache.set(p, imageSize(path.join(OUT, "assets", p)));
  const [w, h] = dimsCache.get(p);
  return `width="${w}" height="${h}"`;
};

/* ---------- Icons ---------- */
const ICON = {
  linkedin: '<svg viewBox="0 0 448 512" aria-hidden="true"><path d="M100.28 448H7.4V148.9h92.88zM53.79 108.1C24.09 108.1 0 83.5 0 53.8a53.79 53.79 0 0 1 107.58 0c0 29.7-24.1 54.3-53.79 54.3zM447.9 448h-92.68V302.4c0-34.7-.7-79.2-48.29-79.2-48.29 0-55.69 37.7-55.69 76.7V448h-92.78V148.9h89.08v40.8h1.3c12.4-23.5 42.69-48.3 87.88-48.3 94 0 111.28 61.9 111.28 142.3V448z"/></svg>',
  instagram: '<svg viewBox="0 0 448 512" aria-hidden="true"><path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z"/></svg>',
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 5h18v2.6H3zm0 5.7h18v2.6H3zm0 5.7h18V19H3z"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>',
  zoom: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zM12 10h-2v2H9v-2H7V9h2V7h1v2h2z"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
};

const SOCIAL = [
  ["LinkedIn", "https://www.linkedin.com/in/yohanesmarioaustralia/", ICON.linkedin],
  ["Instagram", "https://www.instagram.com/yohanesmar.io/", ICON.instagram],
];
/* ---------- Structured data (schema.org JSON-LD) ---------- */
const PERSON_ID = `${SITE}/#person`;
const PERSON = {
  "@type": "Person",
  "@id": PERSON_ID,
  name: "Yohanes Mario",
  url: `${SITE}/`,
  jobTitle: "Web Developer & Digital Specialist",
  image: `${SITE}/assets/media/home/portrait.webp`,
  sameAs: SOCIAL.map(([, u]) => u),
};
const PERSON_REF = { "@type": "Person", "@id": PERSON_ID, name: PERSON.name, url: PERSON.url };
const crumbs = (items) => ({
  "@type": "BreadcrumbList",
  itemListElement: items.map(([name, url], i) => ({ "@type": "ListItem", position: i + 1, name, item: url })),
});
const ldScript = (graph) => `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c")}</script>`;

const socialList = () => `<ul class="social">${SOCIAL.map(([n, u, i]) => `<li><a href="${u}" target="_blank" rel="noopener" aria-label="${n}">${i}</a></li>`).join("")}</ul>`;

/* ---------- Projects ---------- */
const PROJECTS = [
  { slug: "ausev", short: "AUSEV", desc: "Website, lead generation and marketing collateral for AUSEV, a premium electric vehicle company. A case study by Yohanes Mario.", label: "EV Manufacturing", name: "Australian EV", title: "AUSEV", card: "media/cards/ausev.jpg", hook: "How do you market the future when the future comes with a six-figure price tag?" },
  { slug: "advanced-manufacturing-queensland", short: "AMQ", desc: "A focused single-page website presenting Advanced Manufacturing Queensland’s defence and aerospace capabilities. A case study by Yohanes Mario.", label: "Defence Engineering", name: "Advanced Manufacturing Queensland", title: "Advanced Manufacturing Queensland", card: "media/cards/amq.jpg", hook: "Presenting complex capabilities with clarity for defence stakeholders." },
  { slug: "hydronics", short: "Hydronics", desc: "A customised Shopify store that sets Hydronics pressure washers apart through presentation, usability and video. A case study by Yohanes Mario.", label: "E-Commerce", name: "Hydronics", title: "Hydronics", card: "media/cards/hydronics.webp", hook: "When the product is a little dry, the customer experience becomes the differentiator." },
  { slug: "ausmv", short: "AUSMV", desc: "A digital showroom for AUSMV with inventory search, vehicle comparisons and an owners hub. A case study by Yohanes Mario.", label: "Truck Dealership", name: "AUSMV", title: "AUSMV", card: "media/cards/ausmv.jpg", hook: "Creating a digital showroom that supports the sales process." },
  { slug: "lookaroo", short: "Lookaroo", desc: "Design and development of Lookaroo, a privacy-first Australian search engine. A case study by Yohanes Mario.", label: "Web Search Engine", name: "Lookaroo", title: "Lookaroo", card: "media/cards/lookaroo.jpg", hook: "When you can’t topple an empire, build for the people it overlooks." },
  { slug: "australian-owned", short: "Australian Owned", desc: "A Next.js and Strapi website helping businesses understand and apply for Australian Owned certification. A case study by Yohanes Mario.", label: "Business Certification", name: "Australian Owned", title: "Australian Owned", card: "media/cards/australian-owned.webp", hook: "Selling national pride while supporting local businesses." },
];

/* ---------- Layout ---------- */
function layout({ depth, slug, title, description, ogImage, ogAlt = "Yohanes Mario", body, current, section, jsonld }) {
  const r = depth ? "../" : "";
  const href = (p) => (p === "" ? (depth ? "../" : "./") : `${r}${p}/`);
  const nav = [["About", "about"], ["Portfolio", "portfolio"]];
  const aria = (k) => (current === k ? ' aria-current="page"' : section === k ? ' aria-current="true"' : "");
  const url = `${SITE}/${slug ? slug + "/" : ""}`;
  return `<!doctype html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:locale" content="en_AU">
<meta property="og:site_name" content="Yohanes Mario">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}/assets/${ogImage}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(ogAlt)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${SITE}/assets/${ogImage}">
<meta name="theme-color" content="#f8f8f8">
<link rel="icon" href="${r}favicon.ico" sizes="48x48">
<link rel="icon" href="${r}assets/img/favicon-32.png" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="${r}assets/img/apple-touch-icon.png">
<link rel="preload" href="${r}assets/fonts/poppins-700.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${r}assets/fonts/roboto-flex.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${r}assets/css/style.css">
${jsonld ? ldScript(jsonld) + "\n" : ""}</head>
<body>
<a class="skip-link" href="#content">Skip to content</a>

<header class="site-header">
  <div class="container">
    <a class="logo" href="${href("")}" aria-label="Yohanes Mario, home"><img src="${r}assets/img/logo.png" ${dims("img/logo.png")} alt=""></a>
    <div class="nav">
      <nav aria-label="Main"><ul>${nav.map(([n, k]) => `<li><a href="${href(k)}"${aria(k)}>${n}</a></li>`).join("")}</ul></nav>
      ${socialList()}
    </div>
    <button class="menu-toggle" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="menu">${ICON.menu}</button>
  </div>
</header>

<div class="menu" id="menu" aria-hidden="true">
  <div class="menu__top">
    <a class="logo" href="${href("")}" aria-label="Yohanes Mario, home"><img src="${r}assets/img/logo-invert.png" ${dims("img/logo-invert.png")} alt=""></a>
    <button class="menu__close" type="button" aria-label="Close menu">${ICON.close}</button>
  </div>
  <nav aria-label="Menu"><ul>
    <li><a href="${href("")}"${aria("home")}>Home</a></li>
    ${nav.map(([n, k]) => `<li><a href="${href(k)}"${aria(k)}>${n}</a></li>`).join("\n    ")}
  </ul></nav>
  ${socialList()}
  <p class="menu__copy">© ${YEAR} Yohanes Mario</p>
</div>

<main id="content">
${body(r, href)}
</main>

<footer class="site-footer">
  <div class="container">
    <p>© ${YEAR} Yohanes Mario</p>
    ${socialList()}
  </div>
</footer>

<script src="${r}assets/js/main.js" defer></script>
</body>
</html>
`;
}

/* ---------- Partials ---------- */
const img = (r, p, alt, extra = "") => `<img src="${r}assets/${p}" ${dims(p)} alt="${esc(alt)}" loading="lazy" decoding="async"${extra}>`;

const card = (r, href, p, { withText = true, eager = false } = {}) => `<a class="card" href="${href(p.slug)}">
      <img class="card__img" src="${r}assets/${p.card}" ${dims(p.card)} alt=""${eager ? "" : ' loading="lazy"'} decoding="async">
      <div class="card__body">
        <span class="card__label">${p.label}</span>
        <h2 class="card__title">${p.name}</h2>
        ${withText ? `<span class="card__text">${p.hook}</span>` : ""}
      </div>
      ${withText ? '<span class="card__cta">Case Study <span aria-hidden="true">→</span></span>' : ""}
    </a>`;

const shot = (r, p, caption, ctx = "") => `<button class="shot" type="button" data-lightbox="${r}assets/${p}" data-caption="${esc(caption)}">
        <span class="shot__frame">${img(r, p, ctx ? `${ctx}: ${caption}` : caption)}</span>
        <span class="shot__caption">${esc(caption)} ${ICON.zoom}</span>
      </button>`;

const videoShot = (r, v, poster, caption, ctx = "") => `<button class="shot" type="button" data-lightbox="${r}assets/${v}" data-type="video" data-caption="${esc(caption)}">
        <span class="shot__frame">${img(r, poster, ctx ? `${ctx}: ${caption}` : caption)}</span>
        <span class="shot__caption">${esc(caption)} ${ICON.play}</span>
      </button>`;

/* Case-study block renderers */
const B = {
  prose: (paras) => () => `<section class="cs-block container"><div class="prose">${paras.map((p) => `<p>${p}</p>`).join("\n        ")}</div></section>`,
  image: (p, alt) => (r) => `<section class="cs-block container"><figure class="media">${img(r, p, alt)}</figure></section>`,
  video: (v, poster, label) => (r) => `<section class="cs-block container"><figure class="media"><video src="${r}assets/${v}" poster="${r}assets/${poster}" controls preload="none" playsinline aria-label="${esc(label)}"></video></figure></section>`,
  shots: (list, { cols = 2, ratio } = {}) => (r, href, proj) => `<section class="cs-block container"><div class="gallery${cols === 3 ? " gallery--3" : ""}"${ratio ? ` style="--shot-ratio: ${ratio}"` : ""}>
      ${list.map(([p, c, kind, poster]) => (kind === "video" ? videoShot(r, p, poster, c, proj.short) : shot(r, p, c, proj.short))).join("\n      ")}
    </div></section>`,
  photos: (list) => (r) => `<section class="cs-block container"><div class="gallery gallery--3 gallery--photos">
      ${list.map(([p, alt]) => `<figure class="media">${img(r, p, alt)}</figure>`).join("\n      ")}
    </div></section>`,
};

/* ---------- Case-study content ---------- */
const STUDIES = {
  ausev: {
    hero: { video: "media/ausev/hero.mp4", poster: "media/ausev/hero-poster.jpg" },
    did: ["Web Design", "Web Development", "Digital Marketing", "Graphic Design", "Photo Editing", "Video Editing", "CRM"],
    used: ["Adobe Photoshop", "Adobe Illustrator", "Adobe InDesign", "LinkedIn Ads", "Meta Ads", "DaVinci Resolve", "HubSpot"],
    tech: ["WordPress", "PHP", "JavaScript", "HTML/CSS"],
    blocks: [
      B.shots([["media/ausev/company-website.jpg", "Company Website"], ["media/ausev/builder.jpg", "F-150 Lightning Builder"]]),
      B.prose([
        "Working with a premium electric vehicle company presented a unique challenge. Rather than selling a low-cost consumer product, the focus was on generating interest and qualified enquiries for commercial vehicles valued between $130,000 and $250,000.",
        "Through a combination of web development, design, and digital marketing, the project consistently attracted prospective customers and delivered a healthy pipeline of leads. It highlighted the reality that effective digital marketing creates opportunities, while purchasing decisions in high-value markets are influenced by a wide range of commercial factors beyond the digital experience itself.",
      ]),
      B.shots([
        ["media/ausev/leaflet-pro-1.jpg", "F-150 Lightning Pro Leaflet: Front"],
        ["media/ausev/leaflet-pro-2.jpg", "F-150 Lightning Pro Leaflet: Back"],
        ["media/ausev/leaflet-1.jpg", "F-150 Lightning Leaflet: Front"],
        ["media/ausev/leaflet-2.jpg", "F-150 Lightning Leaflet: Back"],
      ], { ratio: "297 / 210" }),
      B.video("media/ausev/promo.mp4", "media/ausev/promo-poster.jpg", "Ford F-150 Lightning promo video"),
    ],
  },
  "advanced-manufacturing-queensland": {
    hero: { video: "media/amq/hero.mp4", poster: "media/amq/hero-poster.jpg" },
    did: ["Web Design", "Web Development", "Photo Editing"],
    used: ["Adobe Photoshop"],
    tech: ["WordPress", "PHP", "JavaScript", "HTML/CSS"],
    blocks: [
      B.image("media/amq/feature.jpg", "Advanced Manufacturing Queensland"),
      B.prose([
        "Working across advanced manufacturing, defence, and aerospace sectors, AMQ required a website that helped stakeholders quickly understand the company’s expertise and assess its suitability for their requirements.",
        "Rather than building a traditional multi-page website, the client opted for a streamlined single-page approach. Recognising that defence and aerospace contracts are rarely won through a website alone, the focus was on communicating capability clearly and efficiently, allowing prospective clients to move into the company’s established sales and business development channels. The result was a focused digital experience that prioritised clarity, credibility, and accessibility.",
      ]),
      B.shots([
        ["media/amq/hero-section.webp", "Hero Section"],
        ["media/amq/about-section.webp", "About Section"],
        ["media/amq/expertise.webp", "Expertise Area"],
        ["media/amq/capability.webp", "Capability Section"],
      ]),
    ],
  },
  hydronics: {
    hero: { video: "media/hydronics/hero.mp4", poster: "media/hydronics/hero-poster.jpg" },
    did: ["Web Development", "Web Design"],
    used: ["Shopify"],
    tech: ["JavaScript", "HTML/CSS", "Shopify Liquid"],
    blocks: [
      B.image("media/hydronics/feature.webp", "Washing a car with a Hydronics pressure washer"),
      B.prose([
        "Pressure washers are much like vacuum cleaners. For most customers, the core function is largely the same regardless of brand. The challenge wasn’t explaining what the product did, but creating enough distinction for customers to see it as more than just another option on the shelf.",
        "Rather than relying on specifications or marketing claims alone, the website focused on presentation, usability, and the ownership experience. Through carefully selected imagery, product demonstrations, and short-form video content, visitors could quickly understand how the product fit into everyday use and where its convenience benefits became apparent. By focusing on how the product felt to use rather than simply what it did, the website helped position it as a more premium and desirable option within its category.",
      ]),
      B.shots([
        ["media/hydronics/homepage-hero.webp", "Homepage Hero"],
        ["media/hydronics/pressure-washer.webp", "Pressure Washer"],
        ["media/hydronics/accessory.webp", "Accessory"],
        ["media/hydronics/specifications.webp", "Product Specifications"],
        ["media/hydronics/shop.webp", "Shop Page"],
        ["media/hydronics/help-centre.webp", "Help Centre"],
      ], { cols: 3 }),
      B.video("media/hydronics/demo.mp4", "media/hydronics/demo-poster.jpg", "Hydronics product demonstration"),
      B.prose([
        "Delivering this experience required extensive customisation of the underlying Shopify theme. To meet the client’s requirements, I developed a range of custom Liquid sections and tailored functionality, creating a more flexible and engaging e-commerce experience than the base theme could provide out of the box.",
      ]),
      B.image("media/hydronics/closing.webp", "Cleaning a motorbike with a Hydronics pressure washer"),
    ],
  },
  ausmv: {
    hero: { image: "media/ausmv/hero.jpg", alt: "American pickup truck" },
    did: ["Web Design", "Web Development", "Photo Editing"],
    used: ["Adobe Photoshop"],
    tech: ["WordPress", "PHP", "Python", "Flask", "JavaScript", "HTML/CSS"],
    blocks: [
      B.photos([
        ["media/ausmv/seats.jpg", "Truck seats"],
        ["media/ausmv/interior.jpg", "Truck interior"],
        ["media/ausmv/gallery.jpg", "Truck dashboard"],
        ["media/ausmv/mirror.jpg", "Rear-view mirror detail"],
        ["media/ausmv/narrow.jpg", "Truck detail"],
      ]),
      B.prose([
        "Big American trucks are not an impulse purchase. Buyers spend considerable time comparing models, exploring available options, and understanding the ownership experience before making a decision. The website was designed to support that journey, making it easy for visitors to browse inventory, compare vehicles, filter by key attributes, and explore the customisation options available for each truck.",
      ]),
      B.shots([
        ["media/ausmv/vehicle-range.webp", "Vehicle Range"],
        ["media/ausmv/owners-hub.webp", "Owners Hub"],
        ["media/ausmv/comparisons.webp", "Vehicle Comparisons"],
        ["media/ausmv/inventory.webp", "Vehicle Inventory"],
      ]),
      B.shots([
        ["media/ausmv/homepage-hero.jpg", "Homepage Hero"],
        ["media/ausmv/accessories-shop.jpg", "Accessories Shop"],
        ["media/ausmv/warranty.jpg", "Warranty"],
      ], { cols: 3 }),
      B.prose([
        "Beyond showcasing vehicles, the website helped build confidence in the purchase itself. Detailed information around after-sales support, available upgrades, and ownership benefits addressed common questions early, while carefully selected imagery highlighted the lifestyle and emotional appeal that often drives buying decisions. By combining powerful search tools with persuasive visual storytelling, the website created a clear path from initial interest to direct engagement with the sales team.",
      ]),
      B.image("media/ausmv/closing.jpg", "Pickup truck exterior"),
    ],
  },
  lookaroo: {
    hero: { image: "media/lookaroo/hero.jpg", alt: "Person typing on a laptop" },
    did: ["Web Design", "Web Development", "Graphic Design"],
    used: ["Adobe Photoshop", "Adobe Illustrator", "Visual Studio Code"],
    tech: ["JavaScript", "HTML/CSS", "Node.js", "Express.js", "SQL", "Azure Cognitive Search"],
    blocks: [
      B.shots([
        ["media/lookaroo/web-search.jpg", "Web Search"],
        ["media/lookaroo/search-results.jpg", "Web Search Results"],
        ["media/lookaroo/about.webp", "About"],
        ["media/lookaroo/image-search.jpg", "Image Search"],
      ]),
      B.prose([
        "Launching a new search engine requires more than just technology. It requires earning trust and giving people a compelling reason to consider an alternative to platforms they already use every day. The website was designed to communicate Lookaroo’s privacy-first approach through clear messaging, familiar design patterns, and a straightforward search experience, helping visitors quickly understand what made the platform different.",
        "The goal was never to replace Google, nor would that have been a realistic objective. Instead, Lookaroo focused on serving Australian users seeking a more privacy-conscious search experience. By combining familiar functionality with a clear point of difference and a local focus, the platform grew into a service that powered thousands of unique searches each day, demonstrating that even in markets dominated by global technology giants, there is still room for focused alternatives that understand their audience.",
      ]),
      B.image("media/lookaroo/closing.jpg", "Person using a laptop"),
    ],
  },
  "australian-owned": {
    // 3-minute video with sound: don't autoplay; load only when the visitor presses play.
    hero: { video: "media/australian-owned/hero.mp4", poster: "media/australian-owned/hero-poster.jpg", clickToPlay: true },
    did: ["Web Design", "Web Development", "Graphic Design"],
    used: ["Adobe Illustrator", "Visual Studio Code"],
    tech: ["Next.js", "JavaScript", "HTML/CSS", "Strapi Headless CMS"],
    blocks: [
      B.video("media/australian-owned/ugg.mp4", "media/australian-owned/ugg-poster.jpg", "UGG Since 1974: Australian Owned soundbite"),
      B.prose([
        "Australian Owned certification is not a physical product or service. Its value comes from what it represents: Australian ownership, support for local communities, and a commitment to keeping business local. The challenge was communicating those benefits in a way that felt tangible and worthwhile, helping businesses understand why certification could matter to both their customers and their brand.",
        "Through clear messaging, benefit-focused content, and streamlined application pathways, the website helped connect the certification to the values behind it. Rather than presenting certification as simply a badge or logo, the focus was on helping businesses understand how it could reinforce their identity, communicate their values, and strengthen their connection with customers who actively seek to support Australian-owned businesses.",
      ]),
      B.shots([
        ["media/australian-owned/account.jpg", "Account Management"],
        ["media/australian-owned/login.jpg", "Authentication Page"],
      ]),
      B.image("media/australian-owned/closing.webp", "Bickfords: an Australian Owned business"),
    ],
  },
};

/* ---------- Pages ---------- */
const CHANGED = new Set();
function write(rel, html) {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const old = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  if (old !== html) CHANGED.add(rel);
  fs.writeFileSync(file, html);
  console.log("wrote", rel, html.length);
}

// Home
write("index.html", layout({
  depth: 0, slug: "", current: "home",
  title: "Yohanes Mario | Web Developer & Digital Specialist",
  description: "Hi, I’m Yohanes. I build websites, software, and digital solutions that help businesses grow.",
  ogImage: "img/og/home.jpg",
  jsonld: [
    { "@type": "WebSite", "@id": `${SITE}/#website`, url: `${SITE}/`, name: "Yohanes Mario", inLanguage: "en-AU", publisher: { "@id": PERSON_ID } },
    PERSON,
  ],
  body: (r, href) => `
<section class="hero">
  <div class="container">
    <div class="hero__copy">
      <h1>Developer &amp; Digital Specialist</h1>
      <p>Hi, I’m Yohanes. I build websites, software, and digital solutions that help businesses grow.</p>
      <a class="pill" href="#mywork">See My Work <span class="arrow" aria-hidden="true">↓</span></a>
    </div>
    <div class="hero__portrait">
      <img src="${r}assets/media/home/portrait.webp" ${dims("media/home/portrait.webp")} alt="Yohanes Mario" fetchpriority="high">
    </div>
  </div>
</section>

<section class="work" id="mywork" aria-label="Selected work">
  <div class="container work__list">
    ${PROJECTS.map((p, i) => card(r, href, p, { eager: i === 0 })).join("\n    ")}
  </div>
</section>`,
}));

// Portfolio
write("portfolio/index.html", layout({
  depth: 1, slug: "portfolio", current: "portfolio",
  title: "Portfolio | Yohanes Mario",
  description: "Some past projects: web design, development and digital marketing for EV manufacturing, defence engineering, e-commerce, automotive, search and certification brands.",
  ogImage: "img/og/home.jpg",
  jsonld: [
    {
      "@type": "CollectionPage", url: `${SITE}/portfolio/`, name: "Portfolio", inLanguage: "en-AU",
      author: PERSON_REF,
      hasPart: PROJECTS.map((p) => ({ "@type": "CreativeWork", name: p.name, url: `${SITE}/${p.slug}/` })),
    },
    crumbs([["Home", `${SITE}/`], ["Portfolio", `${SITE}/portfolio/`]]),
  ],
  body: (r, href) => `
<div class="container page-head">
  <span class="page-head__eyebrow">Portfolio</span>
  <h1>Some Past Projects</h1>
</div>
<div class="container grid">
  ${PROJECTS.map((p) => card(r, href, p, { withText: false })).join("\n  ")}
</div>`,
}));

// About
const ABOUT = [
  ["How It Started", [
    "My interest in web and digital began long before it became my career. From the age of 13, I was writing small programs in Basic, modifying video games, and creating personal projects, sparking an interest in technology and problem solving that has stayed with me ever since.",
    "After school, I naturally found my way into web development, where I discovered I enjoyed combining technical problem solving with creative design to build digital experiences that are both functional and engaging.",
  ]],
  ["A Broader Perspective", [
    "While web development has always been my foundation, my career has given me the opportunity to work across graphic design, digital marketing, photography, and promotional video production. Working across these disciplines has helped me develop a broader understanding of how businesses communicate and connect with their audiences.",
    "I enjoy projects where creative thinking and technical problem solving come together to create solutions that are both practical and engaging.",
  ]],
  ["How I Work", [
    "I believe the best outcomes come from understanding the goals behind a project before jumping into the solution, taking the time to ask questions, listen, and work towards a shared objective.",
    "I enjoy being part of collaborative teams where people support one another, share knowledge, and aren’t afraid to have a laugh along the way. I particularly value working with people from different backgrounds, experiences, cultures, and perspectives. In my experience, genuine relationships and a positive team culture create an environment where people communicate openly, challenge ideas respectfully, and produce their best work.",
    "I’ve never been motivated by climbing over others to get ahead. While goals and performance metrics have their place, I believe trust, collaboration, and helping those around you succeed create stronger teams and better long-term outcomes. I’m the kind of person who would rather help a teammate reach the finish line than race ahead on my own.",
    "Whether I’m designing a website, developing new functionality, or creating digital content, my goal is always to deliver work that is thoughtful, reliable, and focused on creating genuine value.",
  ]],
];
write("about/index.html", layout({
  depth: 1, slug: "about", current: "about",
  title: "About | Yohanes Mario",
  description: "Just a guy with a keyboard. Web developer working across design, digital marketing, photography and video, based in Australia.",
  ogImage: "img/og/home.jpg",
  jsonld: [
    { "@type": "ProfilePage", url: `${SITE}/about/`, name: "About Yohanes Mario", inLanguage: "en-AU", mainEntity: PERSON },
    crumbs([["Home", `${SITE}/`], ["About", `${SITE}/about/`]]),
  ],
  body: () => `
<div class="container page-head">
  <span class="page-head__eyebrow">About Me</span>
  <h1>Just a guy with a keyboard</h1>
</div>
<div class="container about">
  ${ABOUT.map(([h, ps]) => `<section class="about__section">
    <h2>${h}</h2>
    <div class="prose">${ps.map((p) => `<p>${p}</p>`).join("\n      ")}</div>
  </section>`).join("\n  ")}
</div>`,
}));

// Case studies
for (const p of PROJECTS) {
  const s = STUDIES[p.slug];
  const list = (label, items) => `<div><h2>${label}</h2><ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul></div>`;
  write(`${p.slug}/index.html`, layout({
    depth: 1, slug: p.slug, current: "", section: "portfolio",
    title: `${p.title} Case Study | Yohanes Mario`,
    description: p.desc,
    ogImage: `img/og/${p.slug}.jpg`, ogAlt: `${p.title} case study`,
    jsonld: [
      {
        "@type": "CreativeWork",
        "@id": `${SITE}/${p.slug}/#work`,
        url: `${SITE}/${p.slug}/`,
        name: `${p.title} case study`,
        headline: p.hook,
        description: p.desc,
        genre: p.label,
        image: `${SITE}/assets/img/og/${p.slug}.jpg`,
        inLanguage: "en-AU",
        author: PERSON_REF,
        keywords: [...s.did, ...s.tech].join(", "),
      },
      crumbs([["Home", `${SITE}/`], ["Portfolio", `${SITE}/portfolio/`], [p.title, `${SITE}/${p.slug}/`]]),
    ],
    body: (r, href) => `
<div class="container page-head">
  <span class="page-head__eyebrow">Case Study</span>
  <h1>${p.title}</h1>
</div>

<div class="container">
  <div class="cs-hero${s.hero.clickToPlay ? " cs-hero--click" : ""}">
    ${s.hero.video && s.hero.clickToPlay
      ? `<video src="${r}assets/${s.hero.video}" poster="${r}assets/${s.hero.poster}" preload="none" playsinline controls aria-label="${esc(p.title)} video"></video>
    <button class="play-btn" type="button" aria-label="Play the ${esc(p.title)} video">${ICON.play}</button>`
      : s.hero.video
      ? `<video src="${r}assets/${s.hero.video}" poster="${r}assets/${s.hero.poster}" autoplay muted loop playsinline controls aria-label="${esc(p.title)} showreel"></video>`
      : `<img src="${r}assets/${s.hero.image}" ${dims(s.hero.image)} alt="${esc(s.hero.alt)}" fetchpriority="high">`}
  </div>
</div>

<section class="container cs-intro">
  <p class="cs-tagline">${p.hook}</p>
  <div class="cs-meta">
    ${list("What I Did", s.did)}
    ${list("What I Used", s.used)}
    ${list("Technologies", s.tech)}
  </div>
</section>

${s.blocks.map((b) => b(r, href, p)).join("\n\n")}

<div class="container cs-back">
  <a class="pill" href="${href("portfolio")}"><span class="arrow" aria-hidden="true">←</span> Case Studies</a>
</div>`,
  }));
}

// 404 page (root-absolute asset paths so it renders correctly at any missing URL)
{
  const html = layout({
    depth: 0, slug: "404.html", current: "",
    title: "Page not found | Yohanes Mario",
    description: "This page doesn’t exist.",
    ogImage: "img/og/home.jpg",
    body: () => `
<div class="container page-head not-found">
  <span class="page-head__eyebrow">404</span>
  <h1>Page not found</h1>
  <p>The page you’re looking for doesn’t exist or has moved.</p>
  <a class="pill" href="/">Back to home <span class="arrow" aria-hidden="true">→</span></a>
</div>`,
  }).replace(/<link rel="canonical"[^>]*>\n/, '<meta name="robots" content="noindex">\n').replace(/(href|src)="assets\//g, '$1="/assets/').replace(/href="\.\/"/g, 'href="/"').replace(/href="(about|portfolio)\/"/g, 'href="/$1/"').replace('href="favicon.ico"', 'href="/favicon.ico"');
  write("404.html", html);
}

// sitemap.xml + robots.txt
{
  const today = new Date().toISOString().slice(0, 10);
  const git = (...args) => { try { return execFileSync("git", args, { cwd: OUT, stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); } catch { return ""; } };
  const lastmod = (rel) => (CHANGED.has(rel) || git("status", "--porcelain", "--", rel) ? today : git("log", "-1", "--format=%cs", "--", rel) || today);
  const urls = ["", "about/", "portfolio/", ...PROJECTS.map((p) => p.slug + "/")];
  fs.writeFileSync(path.join(OUT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${SITE}/${u}</loc><lastmod>${lastmod(u + "index.html")}</lastmod></url>`).join("\n")}
</urlset>
`);
  fs.writeFileSync(path.join(OUT, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
  console.log("wrote sitemap.xml, robots.txt");
}
