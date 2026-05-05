// Curated (l, h) seed pairs per pyramid type.
// Every pair has been hand-picked so that ALL 11 derived values come out
// clean (integer, k·√n, or integer + k·√n with n ≤ 30 square-free).

export const SEEDS = {
  triunghiulara: [
    { l: 6,  h: 1 },   // ap=2,        m=√13
    { l: 6,  h: 2 },   // ap=√7,       m=4
    { l: 6,  h: 3 },   // ap=2√3,      m=√21
    { l: 12, h: 2 },   // ap=4,        m=2√13
    { l: 12, h: 4 },   // ap=2√7,      m=8
    { l: 12, h: 6 },   // ap=4√3,      m=2√21
    { l: 18, h: 3 },   // ap=6,        m=3√13
    { l: 18, h: 6 },   // ap=3√7,      m=12
    { l: 18, h: 9 },   // ap=6√3,      m=3√21
    { l: 24, h: 4 },   // ap=8,        m=4√13
    { l: 24, h: 8 },   // ap=4√7,      m=16
    { l: 24, h: 12 },  // ap=8√3,      m=4√21
  ],
  patrulatera: [
    { l: 6,  h: 3 },   // ap=3√2,      m=3√3
    { l: 6,  h: 6 },   // ap=3√5,      m=3√6
    { l: 8,  h: 6 },   // ap=2√13,     m=2√17
    { l: 12, h: 6 },   // ap=6√2,      m=6√3
    { l: 12, h: 12 },  // ap=6√5,      m=6√6
    { l: 16, h: 12 },  // ap=4√13,     m=4√17
    { l: 18, h: 9 },   // ap=9√2,      m=9√3
    { l: 24, h: 12 },  // ap=12√2,     m=12√3
  ],
  hexagonala: [
    { l: 2,  h: 1 },   // ap=2,        m=√5
    { l: 2,  h: 3 },   // ap=2√3,      m=√13
    { l: 4,  h: 2 },   // ap=4,        m=2√5
    { l: 4,  h: 4 },   // ap=2√7,      m=4√2
    { l: 4,  h: 6 },   // ap=4√3,      m=2√13
    { l: 4,  h: 8 },   // ap=2√19,     m=4√5
    { l: 6,  h: 3 },   // ap=6,        m=3√5
    { l: 6,  h: 6 },   // ap=3√7,      m=6√2
    { l: 6,  h: 9 },   // ap=6√3,      m=3√13
    { l: 8,  h: 4 },   // ap=8,        m=4√5
    { l: 8,  h: 6 },   // ap=2√21,     m=10
    { l: 8,  h: 8 },   // ap=4√7,      m=8√2
    { l: 8,  h: 12 },  // ap=8√3,      m=4√13
    { l: 10, h: 5 },   // ap=10,       m=5√5
    { l: 12, h: 6 },   // ap=12,       m=6√5
    { l: 12, h: 18 },  // ap=12√3,     m=6√13
  ],
};

export const MAX_RADICAND = 30;
