// Run without adding a project dependency:
// npm install --prefix /tmp/chithi-sql-tests --no-save --ignore-scripts @electric-sql/pglite
// NODE_PATH=/tmp/chithi-sql-tests/node_modules node --test tests/sql-security.test.cjs
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { test } = require('node:test')
const { PGlite } = require('@electric-sql/pglite')

const migrations = path.join(__dirname, '../supabase/migrations')
const securityMigration = '20260912000000_security_boundaries.sql'
const owner = '10000000-0000-4000-8000-000000000001'
const other = '10000000-0000-4000-8000-000000000002'
const admin = '10000000-0000-4000-8000-000000000003'
const letterId = (index) => `20000000-0000-4000-8000-${String(index).padStart(12, '0')}`

test('security migration closes cumulative RLS bypasses and preserves authorized access', async (t) => {
  const db = new PGlite()
  t.after(() => db.close())
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (
      id uuid PRIMARY KEY, email text,
      raw_user_meta_data jsonb DEFAULT '{}'::jsonb
    );
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
    $$;
    CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
      SELECT COALESCE(NULLIF(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb)
    $$;
    GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      GRANT ALL ON TABLES TO anon, authenticated, service_role;
  `)

  const asRole = async (role, userId, callback, metadata = {}) => {
    await db.exec('BEGIN')
    try {
      assert.ok(['anon', 'authenticated', 'service_role'].includes(role))
      await db.exec(`SET LOCAL ROLE ${role}`)
      await db.query("SELECT set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: userId, role, ...metadata }),
      ])
      return await callback()
    } finally {
      await db.exec('ROLLBACK')
    }
  }
  const value = async (sql, params = []) => Object.values((await db.query(sql, params)).rows[0])[0]
  const readMigration = (name) => fs.readFileSync(path.join(migrations, name), 'utf8')
    // gen_random_uuid() is built into PostgreSQL; neither extension is used.
    .replace(/^CREATE EXTENSION[^;]+;$/gm, '')

  for (const name of fs.readdirSync(migrations).filter((name) => name.endsWith('.sql') && name < securityMigration).sort()) {
    if (name === '20260908010000_production_core_hardening.sql') {
      // Existing historical migrations assume these pre-existing columns.
      // Fresh replay without this fixture fails on profiles.updated_at, then
      // public_letters.share_token. This test targets an existing deployment.
      await db.exec(`
        ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
        ALTER TABLE public.public_letters ADD COLUMN IF NOT EXISTS share_token text;
      `)
    }
    try {
      await db.exec(readMigration(name))
    } catch (error) {
      throw new Error(`${name}: ${error.message}`, { cause: error })
    }
  }

  await db.query(`INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
    ($1, 'owner@example.test', '{}'), ($2, 'other@example.test', '{"role":"admin"}'),
    ($3, 'admin@example.test', '{}')`, [owner, other, admin])
  await db.query("UPDATE public.profiles SET role = 'admin' WHERE id = $1", [admin])
  for (let index = 1; index <= 6; index++) {
    await db.query(`INSERT INTO public.letters (id, user_id, receiver_name, content, share_id, is_public)
      VALUES ($1, $2, 'Recipient', 'Private letter body', $3, $4)`, [
      letterId(index), index === 2 ? null : owner, `token-${index}`, index === 6,
    ])
  }
  await db.query(`INSERT INTO public.shares (letter_id, user_id, share_token, is_public, expires_at) VALUES
    ($1, $4, 'token-3', true, now() - interval '1 day'),
    ($2, $4, 'token-4', true, now() + interval '1 day'),
    ($3, $4, 'token-5', false, NULL)`, [letterId(3), letterId(4), letterId(5), owner])
  // Simulate an old share that was made private after the trigger published it.
  await db.query('UPDATE public.letters SET is_public = true WHERE id = $1', [letterId(5)])
  await db.query(`INSERT INTO public.user_usage (identifier, date, letters_generated)
    VALUES ($1, CURRENT_DATE, 1), ($2, CURRENT_DATE, 2)`, [`user:${owner}`, `user:${other}`])
  await db.query(`INSERT INTO public.ai_usage (user_id, identifier, action_type, model)
    VALUES ($1, $2, 'generation', 'test'), ($3, $4, 'generation', 'test')`, [owner, `user:${owner}`, other, `user:${other}`])

  await t.test('fixture reproduces role escalation and private-letter exposure before fix', async () => {
    await asRole('authenticated', other, async () => {
      await db.query("UPDATE public.profiles SET role = 'admin' WHERE id = $1", [other])
      assert.equal(await value('SELECT public.is_admin()'), true)
    })
    await asRole('anon', null, async () => {
      assert.equal(await value('SELECT count(*)::int FROM public.letters'), 6)
    })
  })

  await db.exec(readMigration(securityMigration))
  await db.exec(readMigration(securityMigration)) // Migration is safely repeatable.
  for (const name of fs.readdirSync(migrations).filter((name) => name.endsWith('.sql') && name > securityMigration).sort()) {
    await db.exec(readMigration(name))
    await db.exec(readMigration(name))
  }

  await t.test('signup ignores user_metadata.role', async () => {
    assert.equal(await value('SELECT role FROM public.profiles WHERE id = $1', [other]), 'user')
  })
  await t.test('profile updates work but role changes and admin upserts fail', async () => {
    await asRole('authenticated', other, async () => {
      await db.query("UPDATE public.profiles SET full_name = 'Updated' WHERE id = $1", [other])
      assert.equal(await value('SELECT full_name FROM public.profiles WHERE id = $1', [other]), 'Updated')
      await assert.rejects(db.query("UPDATE public.profiles SET role = 'admin' WHERE id = $1", [other]), { code: '42501' })
    })
    await asRole('authenticated', other, async () => {
      await assert.rejects(db.query(`INSERT INTO public.profiles (id, role) VALUES ($1, 'admin')
        ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role`, [other]), { code: '42501' })
    })
  })
  await t.test('RBAC trusts profiles/app_metadata and ignores user_metadata', async () => {
    await asRole('authenticated', other, async () => {
      assert.equal(await value('SELECT public.is_admin()'), false)
      assert.equal(await value('SELECT count(*)::int FROM public.profiles'), 1)
    }, { user_metadata: { role: 'admin' } })
    await asRole('authenticated', admin, async () => {
      assert.equal(await value('SELECT public.is_admin()'), true)
      assert.equal(await value('SELECT count(*)::int FROM public.profiles'), 3)
    })
    await asRole('authenticated', other, async () => {
      assert.equal(await value('SELECT public.is_admin()'), true)
    }, { app_metadata: { role: 'admin' } })
  })
  await t.test('private/guest letters are hidden and cannot be edited by another user', async () => {
    await asRole('anon', null, async () => {
      assert.deepEqual((await db.query('SELECT id FROM public.letters')).rows, [{ id: letterId(6) }])
    })
    await asRole('authenticated', other, async () => {
      const result = await db.query("UPDATE public.letters SET content = 'Hacked' WHERE id IN ($1, $2) RETURNING id", [letterId(1), letterId(2)])
      assert.equal(result.rows.length, 0)
      await assert.rejects(db.query(`INSERT INTO public.shares (letter_id, user_id, share_token)
        VALUES ($1, $2, 'stolen-share')`, [letterId(1), other]), { code: '42501' })
    })
  })
  await t.test('owners can edit and share without publishing a permanent letter URL', async () => {
    await asRole('authenticated', owner, async () => {
      await db.query("UPDATE public.letters SET content = 'Edited' WHERE id = $1", [letterId(1)])
      await db.query(`INSERT INTO public.shares (letter_id, user_id, share_token)
        VALUES ($1, $2, 'authorized-share')`, [letterId(1), owner])
      assert.equal(await value('SELECT is_public FROM public.letters WHERE id = $1', [letterId(1)]), false)
    })
  })
  await t.test('public token RPC preserves active, expired and private share outcomes', async () => {
    await asRole('anon', null, async () => {
      for (const [token, status] of [['token-3', 'expired'], ['token-4', 'ok'], ['token-5', 'private'], ['missing', 'not_found']]) {
        const result = await value('SELECT public.get_shared_letter_by_token($1)', [token])
        assert.equal(result.status, status)
        assert.equal(Boolean(result.letter), status === 'ok')
      }
      await assert.rejects(db.query('SELECT * FROM public.shares'), { code: '42501' })
    })
  })
  await t.test('snapshot inserts cannot impersonate another owner or attach their letter', async () => {
    await asRole('authenticated', other, async () => {
      await assert.rejects(db.query(`INSERT INTO public.public_letters
        (short_id, user_id, letter_id, title, receiver_name, letter_content)
        VALUES ('forged-snapshot', $1, $2, 'Title', 'Name', 'Text')`, [other, letterId(1)]), { code: '42501' })
    })
    await asRole('authenticated', owner, async () => {
      await db.query(`INSERT INTO public.public_letters
        (short_id, user_id, letter_id, title, receiver_name, letter_content)
        VALUES ('owner-snapshot', $1, $2, 'Title', 'Name', 'Text')`, [owner, letterId(1)])
    })
  })
  await t.test('usage and compatibility views expose only authorized rows', async () => {
    await asRole('authenticated', other, async () => {
      assert.equal(await value('SELECT count(*)::int FROM public.user_usage'), 1)
      assert.equal(await value('SELECT count(*)::int FROM public.ai_usage'), 1)
      assert.equal(await value('SELECT count(*)::int FROM public.users'), 1)
      assert.equal(await value('SELECT count(*)::int FROM public.usage_logs'), 1)
      await assert.rejects(db.query('SELECT * FROM public.admin_logs'), { code: '42501' })
    })
  })
  await t.test('client roles cannot consume quota, poison cache or truncate protected tables', async () => {
    for (const role of ['anon', 'authenticated']) {
      for (const sql of [
        `SELECT public.consume_ai_quota('user:${owner}', CURRENT_DATE, 'generation', -1)`,
        "SELECT public.record_letter_view('token-1', NULL, NULL)",
        "SELECT public.increment_share_event('token-4', 'view')",
        'SELECT * FROM public.voice_cache',
        "INSERT INTO public.ai_usage (identifier, action_type, model) VALUES ('forged', 'voice', 'test')",
        'TRUNCATE public.letters CASCADE',
      ]) {
        await asRole(role, role === 'authenticated' ? other : null, async () => {
          await assert.rejects(db.query(sql), { code: '42501' })
        })
      }
    }
  })
  await t.test('service role retains profile administration, quota, cache and guest persistence', async () => {
    await asRole('service_role', null, async () => {
      await db.query("UPDATE public.profiles SET role = 'admin' WHERE id = $1", [other])
      assert.equal(await value('SELECT role FROM public.profiles WHERE id = $1', [other]), 'admin')
      const quota = await value('SELECT public.consume_ai_quota($1, CURRENT_DATE, $2, 5)', [`user:${other}`, 'voice'])
      assert.equal(quota.consumed, true)
      assert.equal(quota.used, 1)
      await db.query("INSERT INTO public.voice_cache (content_hash, voice_style, audio_url) VALUES ('hash', 'warm', 'audio')")
      await db.query("INSERT INTO public.letters (receiver_name, content) VALUES ('Guest', 'Guest letter')")
    })
  })

  await t.test('manual and legacy content edits preserve the generated snapshot across metadata updates', async () => {
    await asRole('authenticated', owner, async () => {
      await db.query("UPDATE public.letters SET enhanced_content = 'Refined' WHERE id = $1", [letterId(1)])
      assert.equal(await value('SELECT content FROM public.letters WHERE id = $1', [letterId(1)]), 'Refined')
      await db.query("UPDATE public.letters SET letter_content = 'Legacy edit' WHERE id = $1", [letterId(1)])
      await db.query("UPDATE public.letters SET title = 'Metadata edit', favorite = true WHERE id = $1", [letterId(1)])
      assert.deepEqual((await db.query(`SELECT content, letter_content, generated_content, enhanced_content,
        enhanced_letter, is_favorite FROM public.letters WHERE id = $1`, [letterId(1)])).rows[0], {
        content: 'Legacy edit', letter_content: 'Legacy edit', generated_content: 'Private letter body',
        enhanced_content: null, enhanced_letter: null, is_favorite: true,
      })
      await db.query("UPDATE public.letters SET content = '' WHERE id = $1", [letterId(1)])
      await db.query("UPDATE public.letters SET title = 'Another edit' WHERE id = $1", [letterId(1)])
      assert.equal(await value('SELECT letter_content FROM public.letters WHERE id = $1', [letterId(1)]), '')
    })
  })
  await t.test('legacy names sync and nullable aliases stay cleared after unrelated updates', async () => {
    await asRole('authenticated', owner, async () => {
      await db.query(`UPDATE public.letters SET receiver_name = 'Renamed', original_letter = NULL,
        enhanced_letter = 'Refined legacy', share_slug = NULL WHERE id = $1`, [letterId(1)])
      await db.query('UPDATE public.letters SET enhanced_content = NULL WHERE id = $1', [letterId(1)])
      await db.query("UPDATE public.letters SET title = 'Metadata' WHERE id = $1", [letterId(1)])
      assert.deepEqual((await db.query(`SELECT recipient_name, receiver_name, original_input, original_letter,
        enhanced_content, enhanced_letter, share_id, share_slug, content FROM public.letters WHERE id = $1`, [letterId(1)])).rows[0], {
        recipient_name: 'Renamed', receiver_name: 'Renamed', original_input: null, original_letter: null,
        enhanced_content: null, enhanced_letter: null, share_id: null, share_slug: null, content: 'Refined legacy',
      })
      assert.equal(await value(`SELECT count(*)::int FROM pg_trigger WHERE tgrelid = 'public.letters'::regclass
        AND NOT tgisinternal AND tgname IN ('trg_sync_letters_canonical', 'trg_sync_letters_compatibility')`), 1)
    })
  })
  await t.test('legacy insert and explicit generation/refinement writes keep current text and snapshots distinct', async () => {
    await asRole('authenticated', owner, async () => {
      const row = (await db.query(`INSERT INTO public.letters (user_id, receiver_name, letter_content)
        VALUES ($1, 'Legacy recipient', 'Legacy insertion') RETURNING id, content, generated_content, share_id`, [owner])).rows[0]
      assert.equal(row.content, 'Legacy insertion')
      assert.equal(row.generated_content, 'Legacy insertion')
      assert.match(row.share_id, /^[a-f0-9]{12}$/)
      await db.query("UPDATE public.letters SET generated_content = 'New generation' WHERE id = $1", [row.id])
      await db.query("UPDATE public.letters SET enhanced_letter = 'Refinement' WHERE id = $1", [row.id])
      assert.deepEqual((await db.query('SELECT content, generated_content, enhanced_content FROM public.letters WHERE id = $1', [row.id])).rows[0], {
        content: 'Refinement', generated_content: 'New generation', enhanced_content: 'Refinement',
      })
    })
  })

  const reservationA = '30000000-0000-4000-8000-000000000001'
  const reservationB = '30000000-0000-4000-8000-000000000002'
  const reserve = (identifier, action, limit, token) => value(
    'SELECT public.reserve_ai_quota($1, CURRENT_DATE, $2, $3, $4)', [identifier, action, limit, token])
  const consume = (identifier, action, limit, token) => value(
    'SELECT public.consume_ai_quota($1, CURRENT_DATE, $2, $3, $4)', [identifier, action, limit, token])
  const release = (identifier, action, token) => value(
    'SELECT public.release_ai_quota($1, CURRENT_DATE, $2, $3)', [identifier, action, token])

  await t.test('competing reservations serialize before AI and charge once only after success', async () => {
    await asRole('service_role', null, async () => {
      const competing = await Promise.all([
        reserve('test:concurrent', 'generation', 1, reservationA),
        reserve('test:concurrent', 'generation', 1, reservationB),
      ])
      assert.equal(competing.filter((entry) => entry.allowed).length, 1)
      assert.equal(competing.find((entry) => !entry.allowed).reason, 'busy')
      assert.equal(await value("SELECT letters_generated FROM public.user_usage WHERE identifier = 'test:concurrent'"), 0)
      const winner = competing[0].allowed ? reservationA : reservationB
      const loser = competing[0].allowed ? reservationB : reservationA
      assert.equal(await release('test:concurrent', 'generation', loser), false)
      assert.equal((await consume('test:concurrent', 'generation', 1, loser)).consumed, false)
      assert.equal((await value("SELECT public.consume_ai_quota('test:concurrent', CURRENT_DATE, 'generation', 1)")).reason, 'busy')
      assert.equal((await consume('test:concurrent', 'generation', 1, winner)).used, 1)
      assert.equal((await consume('test:concurrent', 'generation', 1, winner)).consumed, false)
      assert.equal((await reserve('test:concurrent', 'generation', 1, loser)).reason, 'limit')
    })
  })
  await t.test('failure release is free; expiry replaces abandoned leases without late-release races', async () => {
    await asRole('service_role', null, async () => {
      assert.equal((await reserve('test:release', 'voice', 1, reservationA)).allowed, true)
      assert.equal(await release('test:release', 'voice', reservationA), true)
      assert.equal(await value("SELECT voice_letters_used FROM public.user_usage WHERE identifier = 'test:release'"), 0)
      assert.equal((await reserve('test:release', 'voice', 1, reservationA)).allowed, true)
      await db.query(`UPDATE public.user_usage SET quota_reservations = jsonb_set(quota_reservations,
        '{voice,expires_at}', to_jsonb(now() - interval '1 minute')) WHERE identifier = 'test:release'`)
      assert.equal((await reserve('test:release', 'voice', 1, reservationB)).allowed, true)
      assert.equal(await release('test:release', 'voice', reservationA), false)
      assert.equal((await consume('test:release', 'voice', 1, reservationA)).consumed, false)
      assert.equal((await consume('test:release', 'voice', 1, reservationB)).used, 1)
    })
  })
  await t.test('leases are per action, include unlimited users, and voice audit accepts its action', async () => {
    await asRole('service_role', null, async () => {
      assert.equal((await reserve('test:actions', 'generation', -1, reservationA)).allowed, true)
      assert.equal((await reserve('test:actions', 'refinement', 1, reservationA)).allowed, true)
      assert.equal((await reserve('test:actions', 'voice', 1, reservationA)).allowed, true)
      assert.equal((await reserve('test:actions', 'generation', -1, reservationB)).reason, 'busy')
      assert.equal((await consume('test:actions', 'refinement', 1, reservationA)).used, 1)
      assert.equal((await consume('test:actions', 'voice', 1, reservationA)).used, 1)
      await db.query("INSERT INTO public.ai_usage (identifier, action_type, model) VALUES ('test:actions', 'voice', 'tts-1')")
    })
  })
  await t.test('only service role can reserve/release and invalid actions cannot increment generation', async () => {
    for (const role of ['anon', 'authenticated']) {
      await asRole(role, role === 'authenticated' ? other : null, async () => {
        await assert.rejects(reserve('test:denied', 'generation', -1, reservationA), { code: '42501' })
      })
      await asRole(role, role === 'authenticated' ? other : null, async () => {
        await assert.rejects(release('test:denied', 'generation', reservationA), { code: '42501' })
      })
    }
    await asRole('service_role', null, async () => {
      await assert.rejects(consume('test:invalid', 'invalid-action', -1, null), { code: '22023' })
    })
  })
})
