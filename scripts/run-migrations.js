import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration(filePath) {
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    
    console.log(`\n📝 Running migration: ${path.basename(filePath)}`);
    
    const { error } = await supabase.rpc('exec', { sql });
    
    if (error) {
      console.error(`❌ Migration failed:`, error);
      return false;
    }
    
    console.log(`✅ Migration completed: ${path.basename(filePath)}`);
    return true;
  } catch (err) {
    console.error(`❌ Error reading migration file:`, err.message);
    return false;
  }
}

async function main() {
  const scriptsDir = path.join(process.cwd(), 'scripts');
  const migrationFiles = fs
    .readdirSync(scriptsDir)
    .filter(f => f.match(/^\d{3}_.*\.sql$/))
    .sort();

  console.log(`🚀 Starting migrations... Found ${migrationFiles.length} migrations`);

  for (const file of migrationFiles) {
    const filePath = path.join(scriptsDir, file);
    const success = await runMigration(filePath);
    
    if (!success) {
      console.error(`\n⚠️  Stopping at failed migration: ${file}`);
      process.exit(1);
    }
  }

  console.log('\n✨ All migrations completed successfully!');
}

main();
