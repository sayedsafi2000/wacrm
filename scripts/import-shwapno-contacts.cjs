/**
 * One-off importer: Shwapno customer .xls lists -> CRM `contacts`.
 *
 * Reads every .xls in public/Shwapno_customer_data, extracts
 * (Customer Name, Contact No), normalizes the phone to Bangladesh
 * international form (8801XXXXXXXXX), de-dupes, skips numbers already
 * in the account, then bulk-inserts via the Supabase service role.
 *
 * Usage:
 *   node scripts/import-shwapno-contacts.cjs --dry-run   # inspect only
 *   node scripts/import-shwapno-contacts.cjs             # real insert
 */
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const DRY_RUN = process.argv.includes('--dry-run');
const DATA_DIR = path.join(__dirname, '..', 'public', 'Shwapno_customer_data');
const CONTACT_COL = 3; // "Contact No"
const NAME_COL = 1; // "Customer Name"
const DATA_START_ROW = 4; // rows 0-3 are titles/headers
const INSERT_CHUNK = 500;

// ---- env -----------------------------------------------------------
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  const text = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

// ---- phone normalization ------------------------------------------
// Goal: Bangladesh international form -> 880 + 10-digit local (starts 1).
// Handles: leading 0 missing ("1711..."), local "01711...", already
// country-coded "8801711...", and "+880..."/spaces/dashes.
function normalizeBdPhone(raw) {
  let d = String(raw == null ? '' : raw).replace(/\D/g, '');
  if (!d) return null;

  // Already country coded.
  if (d.startsWith('880')) {
    const local = d.slice(3).replace(/^0+/, '');
    return local ? '880' + local : null;
  }
  // Local with leading zero(s): 01711... -> 1711...
  if (d.startsWith('0')) d = d.replace(/^0+/, '');

  if (!d) return null;
  return '880' + d;
}

function cleanName(raw) {
  const s = String(raw == null ? '' : raw)
    .replace(/\s+/g, ' ')
    .trim();
  return s || null;
}

// ---- read all xls --------------------------------------------------
function collectRows() {
  const files = fs
    .readdirSync(DATA_DIR)
    .filter((f) => /\.xls$|\.xlsx$/i.test(f))
    .sort();

  // Keep first-seen name per normalized phone.
  const byPhone = new Map();
  let totalCells = 0;
  let noDigits = 0;

  for (const f of files) {
    const wb = XLSX.readFile(path.join(DATA_DIR, f));
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    for (let i = DATA_START_ROW; i < rows.length; i++) {
      const r = rows[i];
      const rawPhone = r[CONTACT_COL];
      if (rawPhone === '' || rawPhone == null) continue;
      totalCells++;
      const phone = normalizeBdPhone(rawPhone);
      if (!phone) {
        noDigits++;
        continue;
      }
      if (!byPhone.has(phone)) {
        byPhone.set(phone, cleanName(r[NAME_COL]));
      } else if (byPhone.get(phone) == null) {
        // backfill a name if the first occurrence had none
        const nm = cleanName(r[NAME_COL]);
        if (nm) byPhone.set(phone, nm);
      }
    }
  }

  return { files, byPhone, totalCells, noDigits };
}

// ---- account resolution -------------------------------------------
async function resolveAccount(admin) {
  const { data: profs, error } = await admin
    .from('profiles')
    .select('user_id, account_id, full_name, email, created_at')
    .order('created_at', { ascending: true });
  if (error) throw new Error('profiles read failed: ' + error.message);
  if (!profs || profs.length === 0) throw new Error('No profiles found.');

  const withAccount = profs.filter((p) => p.account_id);
  if (withAccount.length === 0)
    throw new Error('No profile has an account_id.');

  const accountIds = [...new Set(withAccount.map((p) => p.account_id))];
  // Pick the account owning the most existing contacts (or the only one).
  let chosen = withAccount[0];
  if (accountIds.length > 1) {
    let best = -1;
    for (const accId of accountIds) {
      const { count } = await admin
        .from('contacts')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', accId);
      if ((count ?? 0) > best) {
        best = count ?? 0;
        chosen = withAccount.find((p) => p.account_id === accId);
      }
    }
  }
  return { chosen, accountIds, profileCount: profs.length };
}

async function fetchExistingNormalized(admin, accountId) {
  const existing = new Set();
  const PAGE = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await admin
      .from('contacts')
      .select('phone_normalized')
      .eq('account_id', accountId)
      .range(from, from + PAGE - 1);
    if (error) throw new Error('existing read failed: ' + error.message);
    if (!data || data.length === 0) break;
    for (const r of data) if (r.phone_normalized) existing.add(r.phone_normalized);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return existing;
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env vars.');

  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(DRY_RUN ? '== DRY RUN ==' : '== LIVE IMPORT ==');

  const { files, byPhone, totalCells, noDigits } = collectRows();
  console.log(`Files: ${files.length}`);
  console.log(`Non-empty contact cells: ${totalCells}`);
  console.log(`Rows with no usable digits: ${noDigits}`);
  console.log(`Unique normalized phones in files: ${byPhone.size}`);

  const { chosen, accountIds, profileCount } = await resolveAccount(admin);
  console.log(`\nProfiles in DB: ${profileCount}; accounts: ${accountIds.length}`);
  console.log(
    `Target -> account_id=${chosen.account_id} user_id=${chosen.user_id} (${chosen.email || chosen.full_name || 'n/a'})`
  );

  const existing = await fetchExistingNormalized(admin, chosen.account_id);
  console.log(`Existing contacts in this account: ${existing.size}`);

  const toInsert = [];
  let skippedExisting = 0;
  for (const [phone, name] of byPhone) {
    if (existing.has(phone)) {
      skippedExisting++;
      continue;
    }
    toInsert.push({
      user_id: chosen.user_id,
      account_id: chosen.account_id,
      phone,
      name,
    });
  }
  console.log(`Already present (skip): ${skippedExisting}`);
  console.log(`New contacts to insert: ${toInsert.length}`);

  // Sample
  console.log('\nSample of normalized rows to insert:');
  for (const row of toInsert.slice(0, 8)) {
    console.log(`  ${row.phone}  |  ${row.name ?? ''}`);
  }

  if (DRY_RUN) {
    console.log('\n(dry run — nothing written)');
    return;
  }

  console.log(`\nInserting ${toInsert.length} rows in chunks of ${INSERT_CHUNK}...`);
  let inserted = 0;
  let conflicts = 0;
  let failed = 0;
  const t0 = Date.now();

  for (let i = 0; i < toInsert.length; i += INSERT_CHUNK) {
    const chunk = toInsert.slice(i, i + INSERT_CHUNK);
    // The dedup unique index is PARTIAL, so ON CONFLICT can't target it —
    // use plain insert. Rows are already de-duped + pre-filtered against
    // existing, so a 23505 here is a rare race; treat it as skipped.
    const { error } = await admin.from('contacts').insert(chunk);
    if (error) {
      // Fall back to per-row so one bad value never sinks a chunk.
      for (const row of chunk) {
        const { error: e1 } = await admin.from('contacts').insert([row]);
        if (!e1) inserted++;
        else if (/duplicate|23505/i.test(e1.message)) conflicts++;
        else {
          failed++;
          if (failed <= 5) console.warn('  row failed:', row.phone, e1.message);
        }
      }
    } else {
      inserted += chunk.length;
    }
    const done = Math.min(i + INSERT_CHUNK, toInsert.length);
    if (done % 10000 < INSERT_CHUNK || done === toInsert.length) {
      const secs = ((Date.now() - t0) / 1000).toFixed(0);
      console.log(`  ${done}/${toInsert.length}  (${secs}s)`);
    }
  }

  console.log('\n== DONE ==');
  console.log(`Inserted: ${inserted}`);
  console.log(`Conflicts/skipped: ${conflicts}`);
  console.log(`Failed: ${failed}`);

  const { count: finalCount } = await admin
    .from('contacts')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', chosen.account_id);
  console.log(`Total contacts in account now: ${finalCount}`);
}

main().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
