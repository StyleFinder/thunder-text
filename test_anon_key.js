const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://upkmmwvbspgeanotzknk.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwa21td3Zic3BnZWFub3R6a25rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxNDkxODMsImV4cCI6MjA1OTcyNTE4M30.NcByg3N381kp4is_Z3eIQju7kVNYx55InYsuRoZfSQk';

const supabase = createClient(supabaseUrl, anonKey);

async function test() {
  console.log('Testing with ANON key (RLS disabled)...');
  
  const { data, error } = await supabase
    .from('shops')
    .upsert({
      shop_domain: 'test-anon-key.myshopify.com',
      access_token: 'test_token_anon',
      scope: 'test_scope',
      is_active: true
    }, {
      onConflict: 'shop_domain'
    });

  if (error) {
    console.error('❌ ANON KEY ERROR:', error);
  } else {
    console.log('✅ ANON KEY SUCCESS!');
  }
}

test();
