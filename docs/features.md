# RepDrill — Platform Features & Logic

> Last updated: 2026-05-16. Reflects state after sharing + annotation persistence work + board controls consistency pass + repertoire viewer overhaul + inline rename.

---

## What RepDrill is

A spaced-repetition chess opening trainer. You build opening repertoires, then drill them until the lines stick. You can also pull recent online games and see exactly where you deviated from your prep.

---

## Core modules

### 1. Courses

**What it is:** A course is a named collection of chapters. Each chapter is a move tree (imported from PGN or built manually). Courses represent a color's opening repertoire — e.g. "White vs 1...e5".

**How it works:**
- Create course → add chapters via PGN import or manual line entry
- Each chapter has a move tree with positions (FEN) and moves (SAN + UCI)
- Positions can have text annotations
- The line viewer shows the current path and branches; clicking a move navigates the tree
- Annotation editing is inline (autosaved)

**Sharing:**
- Owner can share a course via link (view or copy access) or by email invite
- `GET /share/[token]` resolves the token and renders a read-only course viewer
- Scoped sharing: share a full course, a specific chapter, or a single line
- Viewers can copy lines into their own library

---

### 2. Repertoires

**What it is:** A merged view across multiple courses. A repertoire combines the move trees from selected courses into a single navigable tree, with per-position choices for which line to prefer when branches overlap.

**How it works:**
- Create a repertoire, attach courses to it
- The merged tree resolves conflicts by preferred choice per position
- Useful for seeing the full repertoire as one coherent tree

**Side toggle (added 2026-05-16):**

When a repertoire contains courses for both colors, a segmented "○ White / ● Black" control appears above the board. Selecting a side:
- Flips the board to that perspective
- Filters the branches panel to show only moves from courses built for that color (e.g. selecting White hides Grunfeld branches which belong to a black course)
- The toggle is hidden when only one color is present — no phantom options for colors with no prep

Board orientation always defaults to the color of the bound courses (black course → black-POV board by default).

**Arrow colors (updated 2026-05-16):**

Arrows in the merged repertoire viewer now cycle through the same multi-color palette as the single-course viewer: `green → blue → red → yellow → paleGreen → paleBlue → paleRed`. Previously all arrows were a single blue.

**Sharing:**
- Same link-based sharing as courses
- Shared view renders a read-only merged tree viewer

---

### 3. Train

**What it is:** Spaced-repetition drill mode. The app plays the opponent's moves and prompts you to find your move at each position in your repertoire.

**How it works:**
- Pulls due cards from the FSRS scheduler (ts-fsrs)
- Opponent moves play automatically; you enter your move via the board or move input (accepts SAN)
- Correct = card advances; wrong = card regresses
- Works off the full merged repertoire or a selected course (planned: per-repertoire scope toggle)

**Flow per position:**
1. Board shows position after opponent's last move
2. You play your move
3. App confirms correct/wrong, shows the expected move if wrong
4. Card scheduled for next review

---

### 4. Analyze

**What it is:** Post-game deviation finder. Connect your Lichess or Chess.com account, pull recent games, and RepDrill marks every move where you left your repertoire book.

**How it works:**
- Pulls last N games from Lichess or Chess.com API
- For each game, detects deviation: first move where your played move differs from any repertoire line
- Results: `in_book` (all moves matched), `left_book` (deviation found + ply), `no_repertoire_for_color`, `parse_error`
- Click a game to open the DeviationViewer: interactive board with full PGN navigation, deviation highlighted in red
- Per-ply annotations: type notes at any position, autosaved to localStorage + Convex DB

**Deviation viewer features:**
- Full PGN move list (clickable)
- ← / → / ↑ / ↓ keyboard navigation
- "Jump to deviation" shortcut
- Toggle last-move highlight (`h`) and deviation arrows (`v`) — buttons in diagram header row + keyboard
- "Drill this line" link when deviation position is in your repertoire
- Import game to course as a new chapter (PGN → chapter in "Game analysis" course)
- Per-ply annotations (autosaved)

**Tabs on the Analyze page (added 2026-05-16):**

| Tab | What it shows |
|---|---|
| My Analysis | Your most recently pulled games (replaced on every re-pull) |
| Shared With You | Games others shared with you via email invitation |
| You Shared | Games you shared — queried from `shareLinks` by owner, persists across re-pulls |

"You Shared" solves the problem where pulling new games replaced the list and previously analyzed (but shared) games became inaccessible. Now any game you share is stored in Convex (`analyzedGames`) and always accessible via this tab.

**Game storage:**
- Games are stored in `analyzedGames` table when you share them or import them
- Unsaved games live only in localStorage until explicitly stored

---

### 5. Sharing

**What it is:** Link-based and invite-based sharing for courses, repertoires, and analysis games.

**How it works — link sharing:**
- Owner opens Share dialog on any resource
- Sets "General access" to "Anyone with link" + permission level (View / Copy / Collaborate)
- Copies link → `/share/[token]`
- Visitor (authenticated or not) opens the link and sees a read-only view

**How it works — invite sharing:**
- Owner types email addresses in the Share dialog
- Invited users see the resource in their "Shared with you" tab

**Access levels:**
- `view` — read-only
- `copy` — can copy lines/courses into own library
- `collaborate` — (courses) can edit

**What each resource type shows at `/share/[token]`:**
- **Course** — full move tree, read-only chapter viewer, copy-to-library button
- **Repertoire** — merged tree viewer, read-only
- **Analysis game** — DeviationViewer in read-only mode: board, PGN navigation, deviation info, per-ply annotations (owner's annotations are persisted to Convex and visible to all viewers)

**Annotations on shared analysis (added 2026-05-16):**
- Owner annotates positions in the Analyze tab → saves to localStorage + `analyzedGames.annotations` in Convex
- When the share link is opened (including incognito / by other users), annotations are loaded from Convex and displayed read-only
- Viewers cannot edit the owner's annotations

**Auth behavior:**
- `/share/[token]` is publicly accessible (no login required)
- PGN parsing for move navigation does not require auth
- Write actions (import, store game, annotate) require auth

---

### 6. Inline Renaming (added 2026-05-16)

Courses and repertoires can be renamed in two places:

**From the detail page:**
- Click the title — a pencil icon fades in on hover as a visual affordance (`title="Click to rename"`)
- Title becomes an inline `<input>` (same font/size, transparent background, border-bottom focus indicator)
- Enter saves, Escape cancels, Save/Cancel buttons appear in the action area (replacing Import/Share)
- Mutations: `api.courses.rename` / `api.repertoires.rename`

**From the list page (without navigating into the item):**
- A pencil icon button (`Pencil` from lucide-react, 14px) appears on row hover in the action column
- Clicking it replaces the title text with an inline input on the same row
- Enter/Save saves; Escape/Cancel restores the title
- Only available for owned resources (`tab === 'mine'` on repertoires list; always on courses list)
- Rename and Delete can coexist in the action column — clicking rename clears any pending delete confirmation

---

### 7. Settings

- Connect Lichess username (used for game fetch + color detection)
- Connect Chess.com username
- Theme toggle (light/dark, "Morning" label)
- Language preference (persisted)

---

## Data model (Convex tables)

| Table | What it stores |
|---|---|
| `users` | Auth profile, Lichess/Chess.com usernames, last sync timestamps |
| `courses` | Named course with color, description, userId |
| `chapters` | Named chapter belonging to a course |
| `moves` | Individual moves in a chapter's tree (parent/child positions, SAN, UCI) |
| `positions` | Board positions (FEN) with optional annotation text |
| `reviewCards` | FSRS card state per move (due date, stability, difficulty, state) |
| `reviewLogs` | Timestamped log of each drill attempt |
| `analyzedGames` | Stored game analysis rows (PGN, deviation data, annotations JSON) |
| `shareLinks` | Token-based share links (resource type + id, access level, token) |
| `shareInvitations` | Email-based invitations (resource type + id, email, access level) |
| `repertoires` | Named merged repertoires with description |
| `repertoireCourses` | Junction rows binding a course to a repertoire (with sortOrder) |
| `repertoireChoices` | Per-position preferred move choices within a repertoire |

---

## URL structure

| Path | Description |
|---|---|
| `/` | Home / workspace |
| `/courses` | Course library |
| `/courses/[id]` | Course detail + chapter line viewer |
| `/train` | Drill queue |
| `/analyze` | Game analysis + deviation finder |
| `/analyze?game=[source:id]&ply=[n]` | Opens specific game in DeviationViewer |
| `/share/[token]` | Public shared resource (course, repertoire, or analysis) |
| `/settings` | User settings |
| `/login` | Auth page |

---

## What does NOT require login

- `/share/[token]` — any share link is publicly accessible
- PGN parsing / move navigation on shared analysis

## What requires login

- All write operations (create/edit course, train, annotate)
- Fetching games from Lichess/Chess.com
- All Convex mutations

---

## Board controls (all viewers)

Every board view — Course chapter viewer, Repertoire merged viewer, Analyze DeviationViewer — has two toggleable controls shown in the diagram header row (right side, same row as ply count):

| Control | Keyboard | What it does |
|---|---|---|
| **Hints on/off** | `h` | Course/Repertoire: shows/hides green square marks on pieces that have a continuation in the tree. Analyze: shows/hides last-move highlight. |
| **Arrows on/off** | `v` | Shows/hides colored arrows for alternative moves from the current position. |

**Visual style:** underlined monospace text in header; active = margin-red with red underline; inactive = faint ink. Clicking toggles; keyboard shortcuts `v`/`h` work globally (ignored when focus is in an input/textarea).

**Per-viewer behavior:**
- **Course viewer** (`RepertoireViewer`): Hints = source-square marks for movable pieces. Shown on user's turn (any # of options) or opponent's turn if only one forced reply. Arrows = colored arrows for all next moves (shown when >1 option).
- **Repertoire viewer** (`MergedRepertoireViewer`): Hints = green destination-square marks for repertoire moves at current position. Arrows = move arrows for all grouped branches.
- **Analyze DeviationViewer**: Hints = last-move highlight (the orange/red square). Arrows = deviation arrow overlay.

---

## Notable technical details

- **FSRS scheduling** — ts-fsrs library, fully server-side state in Convex
- **PGN import** — custom parser in `src/lib/chess/pgn-parser.ts`; accepts SAN including short-form after normalization
- **Deviation detection** — `src/lib/games/deviation.ts`; compares game PGN against user book (currently empty book — TODO: wire to actual Convex repertoire)
- **Annotation persistence** — per-ply annotations stored as JSON string in `analyzedGames.annotations`; synced to Convex with 220ms debounce after localStorage write
- **Share token** — 20-char UUID fragment generated in `convex/sharing.ts`; looked up via `shareLinks.by_token` index

---

## Sharing behavior details (latest)

### Share dialog UX model

- Single custom select system (no native browser selects) used across:
- link access level
- invite access level
- language + other settings selects
- Dropdown menus are portal-rendered and auto-positioned (open upward when needed) so they are not clipped by modal bounds.
- Share modal outside-click logic ignores select menus, so changing role/access in a dropdown does not close the modal.

### Access model

- Link access:
- `Limited access` (no public link access)
- `Anyone with link` + role (`View`, `Copy`, `Collaborate`)
- Email invites always remain direct grants and can be independently set per invited user.
- Effective access is the strongest of:
- share-link access
- invite access (for the same scope/resource)

### Course sharing scopes

When sharing from the **course tab**, owner can scope sharing to:

- `Whole course`
- `This chapter` (currently selected chapter, or first chapter if none selected)
- `That chapter` entries (one per chapter in the course)
- `List of lines` (manual code input)

For `List of lines`:

- Input format: `prefix-lineNumber`, single or comma-separated (e.g. `qgg-1` or `qgg-1,qgg-3`)
- Prefix is a lowercase 2-3 letter chapter shorthand derived from chapter name.
- Invites apply to all valid line codes entered.
- Link/general-access controls use the first valid entered line code.
- Scope actions are disabled until at least one valid line code is entered.

### Line code display in viewers

- Course viewer line header shows current line code after `Line` (e.g. `Line qgg-1`) when available.
- Code format is tied to chapter shorthand + line ordinal within that chapter.

### Repertoire sharing scopes

- Repertoire share can target:
- entire repertoire
- specific bound course from that repertoire
- Sharing a repertoire-scoped course opens a course-style shared view and appears under `Courses -> Shared with you`.

### Shared tabs behavior

- `Courses`, `Repertoires`, and `Analyze` pages each have `Shared with you`.
- Analyze also has `You shared`, so shared analysis entries remain discoverable even after refresh/re-pull.

### Email invitations via Resend

- Invite flow supports comma-separated emails.
- Optional invitation email is sent via Resend when enabled.
- Resend key is expected in environment as `RESEND_API_KEY`.
