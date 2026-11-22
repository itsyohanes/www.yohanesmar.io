(() => {
  "use strict";

  /* ---------- Full-screen menu ---------- */
  const menu = document.getElementById("menu");
  const openBtn = document.querySelector(".menu-toggle");
  const closeBtn = menu && menu.querySelector(".menu__close");
  let lastFocus = null;

  const setMenu = (open) => {
    if (!menu) return;
    menu.classList.toggle("is-open", open);
    menu.setAttribute("aria-hidden", String(!open));
    openBtn && openBtn.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("menu-open", open);
    if (open) {
      lastFocus = document.activeElement;
      closeBtn && closeBtn.focus();
    } else if (lastFocus) {
      lastFocus.focus();
    }
  };

  openBtn && openBtn.addEventListener("click", () => setMenu(true));
  closeBtn && closeBtn.addEventListener("click", () => setMenu(false));

  /* ---------- Lightbox ---------- */
  const items = [...document.querySelectorAll("[data-lightbox]")];
  let box = null;
  let index = 0;

  const icon = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;

  const buildBox = () => {
    box = document.createElement("div");
    box.className = "lightbox";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", "Image viewer");
    box.innerHTML = `
      <div class="lightbox__stage"></div>
      <button class="lightbox__close" type="button" aria-label="Close">${icon("M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z")}</button>
      <button class="lightbox__prev" type="button" aria-label="Previous">${icon("M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z")}</button>
      <button class="lightbox__next" type="button" aria-label="Next">${icon("M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z")}</button>`;
    document.body.appendChild(box);
    box.querySelector(".lightbox__close").addEventListener("click", closeBox);
    box.querySelector(".lightbox__prev").addEventListener("click", () => show(index - 1));
    box.querySelector(".lightbox__next").addEventListener("click", () => show(index + 1));
    box.addEventListener("click", (e) => { if (e.target === box) closeBox(); });
  };

  const show = (i) => {
    index = (i + items.length) % items.length;
    const el = items[index];
    const src = el.getAttribute("data-lightbox");
    const caption = el.getAttribute("data-caption") || "";
    const stage = box.querySelector(".lightbox__stage");
    const media = el.getAttribute("data-type") === "video"
      ? Object.assign(document.createElement("video"), { src, controls: true, autoplay: true, playsInline: true })
      : Object.assign(document.createElement("img"), { src, alt: caption });
    stage.replaceChildren(media);
    if (caption) {
      const cap = document.createElement("p");
      cap.className = "lightbox__caption";
      cap.textContent = caption;
      stage.appendChild(cap);
    }
    const multi = items.length > 1;
    box.querySelector(".lightbox__prev").hidden = !multi;
    box.querySelector(".lightbox__next").hidden = !multi;
  };

  const openBox = (i) => {
    if (!box) buildBox();
    lastFocus = document.activeElement;
    show(i);
    box.classList.add("is-open");
    document.body.classList.add("menu-open");
    box.querySelector(".lightbox__close").focus();
  };

  function closeBox() {
    if (!box) return;
    box.classList.remove("is-open");
    document.body.classList.remove("menu-open");
    box.querySelector(".lightbox__stage").replaceChildren();
    lastFocus && lastFocus.focus();
  }

  items.forEach((el, i) => el.addEventListener("click", (e) => { e.preventDefault(); openBox(i); }));

  /* ---------- Keyboard ---------- */
  document.addEventListener("keydown", (e) => {
    const boxOpen = box && box.classList.contains("is-open");
    if (e.key === "Escape") {
      if (boxOpen) closeBox();
      else if (menu && menu.classList.contains("is-open")) setMenu(false);
    }
    if (boxOpen && e.key === "ArrowLeft") show(index - 1);
    if (boxOpen && e.key === "ArrowRight") show(index + 1);
  });

  /* ---------- Respect reduced motion for autoplaying video ---------- */
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.querySelectorAll("video[autoplay]").forEach((v) => { v.pause(); v.controls = true; });
  }
})();
