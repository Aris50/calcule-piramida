# Calcule · Piramide

O aplicație web pentru exersarea piramidelor regulate la geometrie — gândită pentru elevii de gimnaziu și liceu.

**Live**: https://aris50.github.io/calcule-piramida/

---

## Ce face

Generează automat foi de exerciții cu **8 scenarii**, în care, pentru fiecare piramidă, sunt date două dintre cele 11 mărimi caracteristice și elevul trebuie să calculeze restul.

Acoperă cele trei piramide regulate clasice:

- **Piramida triunghiulară regulată** (bază triunghi echilateral)
- **Piramida patrulateră regulată** (bază pătrat)
- **Piramida hexagonală regulată** (bază hexagon regulat)

Mărimile cu care se lucrează:

| Simbol | Denumire |
|---|---|
| `l`  | latura bazei |
| `aᵦ` | apotema bazei |
| `R`  | raza cercului circumscris bazei |
| `P`  | perimetrul bazei |
| `Aᵦ` | aria bazei |
| `h`  | înălțimea piramidei |
| `aₚ` | apotema piramidei |
| `m`  | muchia laterală |
| `Aₗ` | aria laterală |
| `Aₜ` | aria totală |
| `V`  | volumul |

## Pentru elevi

- Te autentifici cu emailul și parola primite de la profesor.
- De pe pagina **Acasă** alegi modulul *Piramide*.
- Apare un tabel cu 8 rânduri. În fiecare rând sunt evidențiate cu mov două căsuțe — acelea sunt valorile date. Restul le calculezi tu.
- Răspunsurile se scriu în notația de pe caiet:

| Răspuns | Tastezi |
|---|---|
| 5 | `5` |
| √7 | `rad7` |
| 2√3 | `2rad3` |
| 72 + 36√3 | `72+36rad3` |
| 5 − 2√3 | `5-2rad3` |

- Apeși **Verifică** și fiecare căsuță se face verde (corect) sau roșie (greșit). Poți corecta și verifica de câte ori vrei.
- Când ești mulțumit, apeși **Trimite**. Trimiterea se salvează la pagina **Istoric**, cu data, scorul și posibilitatea de a revedea tabelul completat.

## Pentru profesori

- Vezi toți elevii cu numărul de exerciții rezolvate, media procentuală și data ultimului exercițiu.
- Filtrezi după clasă.
- Intri în orice trimitere și vezi tabelul exact așa cum a fost completat de elev — căsuțele verzi sunt răspunsurile corecte, cele roșii arată ce a scris greșit cu răspunsul corect dedesubt.
- Export CSV pentru toate trimiterile.

Conturile elevilor le creezi tu, fie unul câte unul din panoul Supabase, fie în masă printr-un script care produce un fișier `.csv` cu credențialele de distribuit.

## Cum sunt construite exercițiile

Toate valorile generate sunt **numere curate**:

- numere întregi (de ex. `12`, `72`),
- radicali simplificați (de ex. `2√3`, `5√7`),
- sau sume între cele două (de ex. `72 + 36√3`).

Niciodată **fracții** și niciodată valori cu radicand mare și urât. Asta pentru că aplicația nu face calcule numerice cu virgulă mobilă — păstrează totul în formă exactă, simbolică, de la generare până la verificarea răspunsului.

În spate există o bibliotecă curată de perechi `(latură, înălțime)` selectate manual pentru ca toate cele 11 mărimi derivate să iasă curat. Combinațiile de „date inițiale" sunt și ele filtrate astfel încât exercițiul să fie rezolvabil cu calcule rezonabile pentru un elev de gimnaziu — fără ecuații de gradul patru.

## Tehnologii

- **Frontend**: HTML + CSS + JavaScript pur (fără bundler).
- **Randare matematică**: [KaTeX](https://katex.org/).
- **Backend**: [Supabase](https://supabase.com) — autentificare, bază de date Postgres cu Row-Level Security.
- **Hosting**: GitHub Pages.

Toate componentele sunt pe planuri gratuite.

## Limitări actuale & idei pentru viitor

- Doar piramide regulate. Modul pentru *trunchi de piramidă*, *con* și *cilindru* sunt în lista de „în curând" pe pagina elevului.
- Generatorul nu are încă selector de dificultate.
- Nu există încă mod „test cronometrat" — orice exercițiu poate fi rezolvat în ritmul propriu.
- Lipsește un buton de „arată-mi formula" pe rând (util la teme, nu la teste).

## Licență

Folosește-l cum dorești la clasă. Dacă îți este util ca profesor, spune-le și colegilor.
