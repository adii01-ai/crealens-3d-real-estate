# Crealens — 3D Real Estate Website

A scroll-driven 3D website for **Crealens**, a real estate agency for homes and commercial property.

As visitors scroll, the camera walks up the garden path, through the front door, and tours a fully furnished
modern villa — living room, kitchen, staircase, master suite and roof terrace — before moving on to the
residential and commercial listings, the agency's story and the contact form.

## Features

- Real-time 3D villa built with **Three.js**: real PBR textures, sky-photo lighting, sun shadows through the glass
- Furnished interior using CC0 3D models from [Poly Haven](https://polyhaven.com)
- Scroll-driven camera path with doors that open as you approach, room captions and a tour progress indicator
- Smooth scrolling (**Lenis**) and reveal animations (**GSAP**)
- Residential and commercial listing cards, stats, services, About section and enquiry form
- Responsive layout, reduced-motion support and a static fallback if WebGL is unavailable

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
```

The 3D models, textures and sky HDRI live in `public/assets`. To re-download them from Poly Haven:

```bash
npm run assets
```

Build for production (outputs to `dist/`, ready for any static host such as Netlify or Vercel):

```bash
npm run build
```

## Customising

| What | Where |
| --- | --- |
| Brand colours and fonts | CSS variables at the top of `src/style.css` |
| Page text (hero, about, stats, services) | `index.html` |
| Property listings and photos | `src/data/listings.js` and `public/images/` |
| Tour captions | `#tour` section in `index.html` |
| Camera path through the house | `PATH` in `src/scroll.js` |
| House layout and furniture | `src/scene/house.js` |
| Garden, pool, street and skyline | `src/scene/site.js` |

The contact form currently only shows a confirmation message; connect it to an email service
(e.g. Formspree or EmailJS) in `src/ui.js` before going live.

## Credits

- 3D models, textures and HDRI: [Poly Haven](https://polyhaven.com) (CC0)
- Listing photos: [Unsplash](https://unsplash.com) (Unsplash License)
