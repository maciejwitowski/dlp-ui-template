// Minimal static checks for Supabase migrations: require RLS and avoid allow-all policies.
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const CANDIDATE_DIRS = ["supabase/migrations", "db/migrations", "sql/migrations"];

function listSqlFiles(dir) {
  try {
    if (!statSync(dir).isDirectory()) return [];
    return readdirSync(dir)
      .filter(f => f.toLowerCase().endsWith(".sql"))
      .map(f => join(dir, f));
  } catch { return []; }
}

const files = CANDIDATE_DIRS.flatMap(listSqlFiles);
if (files.length === 0) {
  console.log("No migration SQL files found (skipping).");
  process.exit(0);
}

const allowAll = [
  /create\s+policy.*using\s*\(\s*true\s*\)/i,
  /create\s+policy.*with\s+check\s*\(\s*true\s*\)/i,
  /grant\s+select\s+on\s+table\s+\w+\s+to\s+anon\s*;/i
];

let errors = [];

for (const f of files) {
  const sql = readFileSync(f, "utf8");

  // Flag "allow all" policies
  if (allowAll.some(r => r.test(sql))) {
    errors.push(`Allow-all policy found in ${f}`);
  }

  // Ensure RLS enabled for any table created in this file
  const created = [...sql.matchAll(/create\s+table\s+(\w+)/gi)].map(m => m[1]);
  for (const t of created) {
    const rlsRegex = new RegExp(`alter\\s+table\\s+${t}\\s+enable\\s+row\\s+level\\s+security\\s*;`, "i");
    if (!rlsRegex.test(sql)) {
      errors.push(`RLS not enabled for table '${t}' in ${f}`);
    }
  }
}

if (errors.length) {
  console.error("\nSupabase SQL policy errors:");
  for (const e of errors) console.error(" -", e);
  process.exit(1);
} else {
  console.log("Supabase SQL checks passed.");
}
