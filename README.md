# The Tsonani Times

Portfolio of Nyiko Evidence Tsonani, Computer Systems Engineer. Plain HTML, CSS and JavaScript, bundled with [Vite](https://vite.dev).

## Commands

```bash
npm install       # first time only
npm run dev       # local dev server with hot reload (opens the browser)
npm run build     # production build into dist/
npm run preview   # serve the dist/ build locally to check it
```

`dist/` is what you deploy (GitHub Pages, Netlify, Vercel…). The build uses relative paths, so it also works from a sub-folder. Open it through `npm run preview` or a web server, not by double-clicking `dist/index.html`.

## Where things live

| Path | What |
| --- | --- |
| `index.html` | All page content and sections |
| `src/css/styles.css` | Styles (colour tokens at the top) |
| `src/js/main.js` | Intro lens, nav, scroll reveal, lightbox, contact form |
| `public/assets/images/` | Photos `nyiko-01.jpg` … `nyiko-13.jpg` |
| `public/assets/projects/` | Project screenshots `arms.png`, `unify-tech.png`, `eduaccess.png`, `tshwane-bus.png` |
| `public/assets/cv/` | `Nyiko-Tsonani-CV.pdf` |

Files in `public/` are copied into the build unchanged, so `assets/...` paths in the HTML keep working.

## To do

Search the project for `TODO`: project descriptions, tags and links, certificate links, LinkedIn URL, Formspree form ID and the live site URL for the Open Graph tags.
