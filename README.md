# Terminal vs Desktop

A 21-slide lecture for front-end development students that compares working in the terminal (CMD, PowerShell, Bash) with working on the desktop GUI. It is a small static web app: plain HTML, CSS and JavaScript with no build step and no dependencies.

## Run it

Open `index.html` in a browser. That's it. It also works straight from the file system (`file://`).

To serve it locally instead:

```bash
npx serve .
# or
python -m http.server 8000
```

## Publish on GitHub Pages

1. Create a repository and push this folder to it.
2. On GitHub, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, pick `main` and `/ (root)`, then **Save**.
4. After a minute the deck is live at `https://<your-user>.github.io/<repo-name>/`.

## Controls

| Action | Keys / gestures |
| --- | --- |
| Next slide | `→` `Space` `PageDown`, click the slide, swipe left |
| Previous slide | `←` `PageUp`, click the left edge, swipe right |
| First / last slide | `Home` / `End` |
| Dark / light theme | `T` or the sun/moon button (remembered per browser) |
| Speaker notes | `N` |
| All slides (overview) | `O` |
| Full screen | `F` |
| Answer a quiz | click an option or press `A`–`D` |
| Reset a quiz | `R` |
| Shortcuts | `?` |
| Close panels | `Esc` |

Other features:

- **Deep links:** `index.html#13` opens slide 13. `?theme=light` or `?theme=dark` forces a theme for that visit.
- **Click to copy:** every command on the comparison table, the CMD cheat sheet and the daily commands slide copies itself when clicked.
- **Interactive quiz:** three multiple-choice questions and a true/false round. Each one reveals the answer and an explanation.
- **Trends chart:** hover a row for its numbers, or press **Table** to see the full data.
- **Print / PDF:** press `Ctrl + P` and you get one slide per page.
- When you're presenting, the controls hide after a few seconds without mouse movement. Move the mouse to bring them back.

## Structure

```
index.html          all slides (one <section class="slide"> each) + icon sprite
css/style.css       design tokens for both themes, slide layouts, app chrome
js/app.js           navigation, scaling, theme, notes, overview, quiz, copy
assets/img/         photos
assets/favicon.svg
```

Every slide is designed on a fixed 1920 × 1080 canvas and scaled to fit the screen. That way it looks the same on a projector, a laptop or a phone.

### Editing

- **Add a slide:** copy any `<section class="slide">` block in `index.html`. Page numbers and footers are generated automatically.
- **Speaker notes:** put them in the `<aside class="notes">` inside each slide.
- **Hide the footer** on a slide: add `data-footer="none"`.
- **Colors:** both themes are defined as CSS custom properties at the top of `css/style.css` (`:root` / `[data-theme="dark"]`).

## Sources and credits

- Usage data on the trends slide comes from the Stack Overflow Developer Survey ([2025](https://survey.stackoverflow.co/2025/technology/), [2024](https://survey.stackoverflow.co/2024/technology)). The figures are the share of all respondents who used each language. Respondents could choose several answers.
- Photos are from [Unsplash](https://unsplash.com) and used under the Unsplash License:
  [laptop with code](https://images.unsplash.com/photo-1587620962725-abab7fe55159),
  [white iMac](https://unsplash.com/photos/white-imac-5X5dCf4Pp44),
  [terminal close-up](https://unsplash.com/photos/a-close-up-of-a-computer-screen-with-a-program-on-it-xIk9zUKjekQ),
  [laptop by the wall](https://images.unsplash.com/photo-1484417894907-623942c8ee29).
- The brand logos come from [Simple Icons](https://simpleicons.org) (CC0). The logos themselves remain trademarks of their owners.
- Fonts: Space Grotesk, IBM Plex Sans and JetBrains Mono, served by Google Fonts.
