/**
 * Reset Coach Password Script
 * Usage: node scripts/reset-coach-password.js <email> <new-password>
 */

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function resetPassword(email, newPassword) {
  console.log(`\n🔐 Resetting password for: ${email}\n`);

  // Check if coach exists
  const { data: coach, error: fetchError } = await supabase
    .from('coaches')
    .select('*')
    .eq('email', email)
    .single();

  if (fetchError || !coach) {
    console.error('❌ Coach not found:', email);
    console.log('\n💡 Available coaches:');
    const { data: allCoaches } = await supabase
      .from('coaches')
      .select('email, name, is_active')
      .order('email');

    if (allCoaches) {
      allCoaches.forEach(c => console.log(`   - ${c.email} (${c.name}) ${c.is_active ? '✓' : '✗ inactive'}`));
    }
    process.exit(1);
  }

  // Hash new password
  console.log('🔨 Hashing password...');
  const passwordHash = await bcrypt.hash(newPassword, 10);

  // Update password
  const { error: updateError } = await supabase
    .from('coaches')
    .update({
      password_hash: passwordHash,
      password_set_at: new Date().toISOString(),
      is_active: true
    })
    .eq('email', email);

  if (updateError) {
    console.error('❌ Failed to update password:', updateError);
    process.exit(1);
  }

  console.log('✅ Password reset successfully!');
  console.log(`\n📧 Email: ${email}`);
  console.log(`🔑 Password: ${newPassword}`);
  console.log(`\n🔗 Login at: http://localhost:3050/coach/login\n`);
}

// Parse command line arguments
const [email, password] = process.argv.slice(2);

if (!email || !password) {
  console.log('\n📖 Usage: node scripts/reset-coach-password.js <email> <new-password>\n');
  console.log('Examples:');
  console.log('  node scripts/reset-coach-password.js baker2122+coach@gmail.com MyNewPassword123');
  console.log('  node scripts/reset-coach-password.js baker2122+test@gmail.com TestPass456\n');
  process.exit(1);
}

if (password.length < 8) {
  console.error('❌ Password must be at least 8 characters');
  process.exit(1);
}

resetPassword(email, password).catch(err => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
