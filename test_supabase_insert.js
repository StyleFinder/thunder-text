const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://upkmmwvbspgeanotzknk.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwa21td3Zic3BnZWFub3R6a25rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDE0OTE4MywiZXhwIjoyMDU5NzI1MTgzfQ.DF2UQEv2ehy0GKpHqPa9YFCnjoN6K93wDsZHbcmO7zw';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function test() {
  console.log('Testing Supabase insert with service role key...');
  
  const { data, error } = await supabase
    .from('shops')
    .upsert({
      shop_domain: 'test-node-script.myshopify.com',
      access_token: 'test_token_from_node',
      scope: 'test_scope',
      is_active: true,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'shop_domain'
    });

  if (error) {
    console.error('❌ ERROR:', error);
    process.exit(1);
  }
  
  console.log('✅ SUCCESS:', data);
  process.exit(0);
}

test();
