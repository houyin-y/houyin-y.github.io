# 📅 Paper Craft Weekly Timetable

A hand-drawn, paper-craft-styled weekly planner built with plain HTML, CSS, and JavaScript. Create sticky notes for classes, study sessions, work shifts, fitness, or personal tasks, then drag them around a 24-hour weekly grid. Everything is saved automatically in the browser.

---

## ✨ Features

- **7-day × 24-hour timetable** with a sticky note per activity.
- **Create notes** with a title, day, start time, duration (1–4 hours), category, and one of six sticky-note colors.
- **Drag and drop** notes between time slots, into the scratchpad, or onto the trash zone to delete them. The editor also includes a **Delete Note** action for keyboard and touch users.
- **Touch and pen dragging** in addition to standard mouse drag-and-drop.
- **Edit notes** in a modal to change the title, category, color, day, start time, or duration. Notes can also be moved back to the scratchpad from the editor.
- **Keyboard accessible editing:** focus a note and press `Enter` or `Space`, or use the pencil button. `Escape` closes the editor.
- **Overlap handling:** notes that share the same time are displayed in separate vertical lanes instead of covering each other.
- **Category filter** for Class, Study, Work, Fitness, and Personal activities. The scratchpad count follows the active filter.
- **Scratchpad** for notes that have not been placed on the timetable yet.
- **Automatic saving** to `localStorage`; notes persist after a page reload.
- **Layout toggle** to force desktop or mobile view, plus automatic responsive switching.
- **Today indicator** in the board header.
- **Print view** that fits all 24 hours onto a landscape page.
- **Validation and recovery:** malformed saved data falls back to safe example notes, and notes cannot run past 24:00.

On the first visit, a small set of example notes is loaded so the timetable is not empty. Use **Clear** to remove them.

---

## 📁 File Structure

```text
├── index.html   # Page structure, Tailwind CDN setup, and theme configuration
├── styles.css   # Paper textures, sketch borders, sticky notes, print layout
├── main.js      # App state, rendering, dragging, editing, and localStorage
└── readme.md    # Project documentation
```

The Tailwind configuration remains inline in `index.html` because it configures the Tailwind Play CDN before the page renders. All custom styles and application logic live in `styles.css` and `main.js`.

---

## 🚀 Getting Started

No build step or installation is required.

```bash
# From the project directory, start any static file server:
python3 -m http.server 8000
```

Then open <http://localhost:8000> in a modern browser.

You can also open `index.html` directly, although serving it over HTTP is recommended so that browser storage behaves consistently.

The site is ready to deploy to GitHub Pages or any static hosting service as-is.

---

## 🖱️ Usage

1. **Add a note:** Fill in the form in the left sidebar and click **Add to Timetable**.
2. **Move a note:** Drag it from one hour/day cell to another. Mouse, touch, and pen input are supported.
3. **Park a note:** Drag it to the **Scratchpad** to keep it for later.
4. **Delete a note:** Drag it to **Drag Note Here to Delete**, or open the editor and click **Delete Note**.
5. **Edit a note:** Click the pencil icon, or focus the note and press `Enter`/`Space`. Change its title, category, color, day, start time, or duration, then save.
6. **Filter:** Choose a category from the header dropdown; select **All Categories** to show everything again.
7. **Change layout:** Use **View: Auto Responsive** to cycle through automatic, forced desktop, and forced mobile layouts.
8. **Print:** Click **Print** for a paper copy of the timetable. Landscape orientation is selected automatically where supported.
9. **Clear everything:** Use **Clear** and confirm the prompt. This cannot be undone.

Overlapping notes are arranged in vertical lanes within their day row, so each activity remains visible.

---

## 🗂️ How Data Is Stored

Notes are stored in `localStorage` under the key `paper_timetable_events`. Each note has this shape:

```json
{
  "id": "def-1",
  "title": "Calculus II",
  "day": 0,
  "startHour": 9,
  "duration": 2,
  "color": "yellow",
  "category": "Class"
}
```

- `day`: `0` = Monday through `6` = Sunday; `null` means the note is in the scratchpad.
- `startHour`: `0`–`23`, or `null` for scratchpad notes.
- `duration`: `1`–`4` hours.
- `color`: `yellow`, `pink`, `blue`, `mint`, `purple`, or `orange`.
- `category`: `Class`, `Study`, `Work`, `Fitness`, or `Personal`.

Saved entries are validated when the page loads. Invalid entries are discarded and duplicate IDs are regenerated. If the saved value is corrupt or contains only invalid entries, the app falls back to the example notes; an intentionally empty board stays empty. Notes must end by 24:00.

Data is browser-specific, so clearing site data or using another browser starts with a fresh set of example notes. The app does not send data to a server.

---

## 🧱 Tech Stack

| Technology | Purpose |
| --- | --- |
| HTML5 | Semantic page structure |
| CSS3 | Custom paper textures, sketch borders, sticky notes, drag feedback, print styles |
| Vanilla JavaScript (ES6+) | State management, dynamic grid/note rendering, mouse/touch dragging, modal editing, local storage |
| [Tailwind CSS Play CDN](https://tailwindcss.com/docs/installation/play-cdn) | Utility classes and responsive layout helpers |
| [Google Fonts](https://fonts.google.com/) | Fredoka, Patrick Hand, and Architects Daughter |
| [Font Awesome 6.4](https://fontawesome.com/) | UI icons |

---

## 📱 Responsive Behavior

- **Desktop:** days are rows and the 24 hours scroll horizontally.
- **Mobile:** the same day-per-row layout with narrower day and hour columns for touch screens.
- The automatic mode switches at a viewport width of `768px`. The header button can override the breakpoint and force either layout.

Changing the layout or resizing the window does not rebuild or remove notes.

---

## 📝 Notes & Limitations

- Tailwind, the fonts, and the icon font are loaded from CDNs, so an internet connection is needed for the intended styling.
- Data is stored only in the current browser; there is no account or server-side sync, and multiple tabs can overwrite each other.
- Notes can end at 24:00 at the latest. Attempting to create or move a note beyond that shows an error and keeps the previous placement.
- Dense overlapping schedules can make individual notes short; the lane layout remains readable but may be cramped.
- The print layout fits the full week on landscape paper, but browsers may still require “fit to page” or background graphics for the best result.
- Clearing the board is permanent, and there is no undo history.
