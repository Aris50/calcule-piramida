# Calcule · Piramide

Generator de exerciții cu piramide regulate (triunghiulară, patrulateră, hexagonală) + portal de submisii pentru elevi.

- **Frontend**: HTML + CSS + JavaScript modulat, fără build (KaTeX prin CDN).
- **Backend**: Supabase (auth + Postgres cu RLS), pe planul gratuit.
- **Hosting**: GitHub Pages.
- **Cost**: 0 lei.

---

## Setup pas cu pas

> Tot ce trebuie să faci tu apare aici. Durează aproximativ 15 minute.

### 1. Creează proiectul Supabase

1. Mergi pe [supabase.com](https://supabase.com), creează cont (gratis).
2. **New project** → alege un nume, parolă pentru DB (notează-o), regiunea cea mai apropiată (Frankfurt e ok).
3. Așteaptă ~1 minut să se inițializeze.

### 2. Rulează schema SQL

1. În Supabase: **SQL Editor** (pictograma cu `>_`).
2. **New query** → lipește tot conținutul din [`sql/schema.sql`](sql/schema.sql) → **Run**.
3. Ar trebui să vezi „Success. No rows returned."

### 3. Dezactivează înscrierile noi

În Supabase: **Authentication → Providers → Email** → dezactivează **„Enable Sign-Ups"** → **Save**.

Acum nimeni nu se mai poate înregistra singur. Doar tu, prin pașii de mai jos, poți crea conturi.

### 4. Configurează aplicația

1. În Supabase: **Project Settings → API**.
2. Copiază **Project URL** și **Project API keys → anon (public)**.
3. Editează [`js/config.js`](js/config.js) și înlocuiește:
   ```js
   export const SUPABASE_URL = 'https://xxxx.supabase.co';
   export const SUPABASE_ANON_KEY = 'eyJhbGc...';
   ```

### 5. Creează contul tău de profesor

În Supabase: **Authentication → Users → Add user → Create new user**:

- **Email**: emailul tău
- **Password**: parola ta
- **Auto confirm user**: ✅ (bifat)
- Dă click pe **„User Metadata"** și pune:
  ```json
  { "full_name": "Numele tău", "role": "teacher" }
  ```
- **Create user**.

### 6. Creează conturile elevilor

#### Varianta A — manual, în panoul Supabase

Repetă pasul 5 pentru fiecare elev, dar cu `"role": "student"` și un `"class_group": "8A"` opțional.

#### Varianta B — în masă, prin script (recomandată pentru clase mari)

1. Instalează dependințele:
   ```bash
   npm install
   ```
2. Pregătește un CSV `elevi.csv` (fără antet):
   ```csv
   maria@scoala.ro,Maria Pop,8A,
   andrei@scoala.ro,Andrei Ionescu,8A,
   ana@scoala.ro,Ana Munteanu,8B,parola123
   ```
   Ultima coloană e parola; dacă o lași goală, scriptul generează una aleatoare.
3. Ia cheia **service_role** din Supabase: **Project Settings → API → service_role**. ⚠️ Această cheie ocolește RLS — păstreaz-o pe laptopul tău, nu o publica.
4. Rulează:
   ```bash
   SUPABASE_URL='https://xxxx.supabase.co' \
   SUPABASE_SERVICE_ROLE_KEY='eyJhbGc...' \
   node tools/add-student.mjs elevi.csv > parole.csv
   ```
5. `parole.csv` conține credențialele de distribuit elevilor. **Nu îl urca pe GitHub** (e ignorat de `.gitignore`).

### 7. Testează local (opțional)

```bash
npm run serve
# deschide http://localhost:8080
```

Autentifică-te cu contul de profesor → ar trebui să vezi pagina **Elevii mei**. Cu un cont de elev → **Acasă**.

### 8. Publică pe GitHub Pages

```bash
# 1. Creează un repo gol pe github.com (privat sau public, oricum funcționează)
# 2. În folderul proiectului:
git remote add origin https://github.com/<USER>/<REPO>.git
git branch -M main
git push -u origin main

# 3. Pe GitHub: Settings → Pages → Source: "Deploy from a branch" → Branch: main / (root) → Save
# 4. După ~1 minut, site-ul e live la https://<USER>.github.io/<REPO>/
```

> **Important**: după publicare, verifică în Supabase: **Authentication → URL Configuration** — adaugă URL-ul GitHub Pages la **Site URL** și la **Redirect URLs** (chiar dacă nu folosim password recovery, e bine să fie consistent).

---

## Structura

```
.
├── index.html, dashboard.html, practice.html,
│   history.html, teacher.html       — paginile aplicației
├── css/style.css
├── js/
│   ├── config.js                    — URL/cheie Supabase (de completat)
│   ├── supabase.js, auth.js         — client + flux de autentificare
│   ├── login.js, dashboard.js,
│   │   practice.js, history.js,
│   │   teacher.js                   — logica per pagină
│   ├── review.js                    — randare tabel cu colorare verde/roșu
│   └── math/
│       ├── exact.js                 — aritmetică exactă cu radicali
│       ├── pyramids.js              — formule pentru cele 3 piramide
│       ├── library.js               — perechi (l, h) curate
│       ├── generator.js             — produce o foaie cu 8 exerciții
│       └── parse.js                 — parsează „2rad3" la 2√3
├── sql/schema.sql                   — schema Supabase + RLS
├── tools/
│   ├── test-math.mjs                — `npm test`
│   └── add-student.mjs              — `npm run add-student`
├── package.json
├── .gitignore, .nojekyll
└── README.md
```

## Pentru elevi: cum scriu răspunsurile

| Răspuns matematic | În tastatură |
|---|---|
| 5 | `5` |
| −5 | `-5` |
| √7 | `rad7` sau `sqrt(7)` |
| 2√3 | `2rad3` |
| 72 + 36√3 | `72+36rad3` |
| 5 − 2√3 | `5-2rad3` |

Sub fiecare casetă apare o previzualizare cu modul în care a fost interpretat răspunsul. Dacă apare „—", expresia nu e validă.

## Variabilele

| Simbol | Denumire |
|---|---|
| `l`  | latura bazei |
| `aᵦ` | apotema bazei |
| `R`  | raza cercului circumscris bazei |
| `P`  | perimetrul bazei |
| `Aᵦ` | aria bazei |
| `h`  | înălțimea piramidei |
| `aₚ` | apotema piramidei |
| `m`  | muchia piramidei |
| `Aₗ` | aria laterală |
| `Aₜ` | aria totală |
| `V`  | volumul |

## Licență

Folosește-l cum dorești. Dacă îți este util, spune și altor profesori.
