Popup assets (GIFs / images) for the dashboard popup system — `lib/popups.ts`.

Drop the file in here exactly as it came: the renderer serves it untouched (plain `<img>`, not
next/image, because the optimizer would flatten an animated GIF to its first frame), and displays
it with `object-fit: contain`, so nothing is ever cropped.

  welcome/  — pool both greetings draw from at random ("Welcome to Mantis", "Welcome back")
  shock/    — the 500-credits popup

Reference them from a POPUPS entry as `/popups/<folder>/<filename>`. A `media` array with more than
one entry becomes a random draw plus a shuffle button; a single entry is a fixed image.

Note on weight: these are full-size Friends GIFs (up to 3.4 MB). Only the drawn one is fetched, and
a shuffle fetches one more — but a pool of ten large assets is a real bandwidth cost worth
compressing before it grows.
