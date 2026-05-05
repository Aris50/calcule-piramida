#!/usr/bin/env node
// Bulk-create student or teacher accounts.
//
// Reads a CSV from stdin or from the path passed as the second argument.
// CSV format (no header):
//   email,full name,class,password
//   email,full name,class,             ← password omitted → random one is generated
//
// Examples:
//   node tools/add-student.mjs students.csv
//   echo 'maria@scoala.ro,Maria Pop,8A,' | node tools/add-student.mjs
//
// Pass --teacher to make all rows teachers (default is student).
//
// Required env vars:
//   SUPABASE_URL              project URL
//   SUPABASE_SERVICE_ROLE_KEY service-role secret (Project Settings → API)
//
// The service-role key bypasses RLS — keep it on your machine, never commit it.

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Setează SUPABASE_URL și SUPABASE_SERVICE_ROLE_KEY în mediu.');
  process.exit(1);
}

const args = process.argv.slice(2);
const isTeacher = args.includes('--teacher');
const fileArg = args.find((a) => !a.startsWith('--'));
const csv = fileArg
  ? readFileSync(fileArg, 'utf8')
  : readFileSync(0, 'utf8');

const sb = createClient(url, key, { auth: { persistSession: false } });

const rows = csv
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'));

const out = [['email', 'full_name', 'class', 'password', 'status']];
for (const line of rows) {
  const parts = line.split(',').map((s) => s.trim());
  const [email, full_name, class_group = '', password = ''] = parts;
  if (!email || !full_name) {
    out.push([email || '', full_name || '', class_group, '', 'SKIP: lipsește email sau nume']);
    continue;
  }
  const finalPassword = password || randomBytes(6).toString('base64url');
  const { data, error } = await sb.auth.admin.createUser({
    email,
    password: finalPassword,
    email_confirm: true,
    user_metadata: {
      full_name,
      role: isTeacher ? 'teacher' : 'student',
      class_group: class_group || null,
    },
  });
  if (error) {
    out.push([email, full_name, class_group, '', 'ERROR: ' + error.message]);
  } else {
    out.push([email, full_name, class_group, finalPassword, 'OK']);
  }
}

// Print as CSV so the teacher can save the credentials sheet
for (const row of out) {
  console.log(row.map(csvEscape).join(','));
}

function csvEscape(s) {
  s = String(s);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
