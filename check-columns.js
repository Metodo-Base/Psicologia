const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  try {
    const { data, error } = await supabase.from('CRM_Geral').select('*').limit(1);
    if (error) {
      console.error('Error fetching CRM_Geral:', error);
    } else if (data && data.length > 0) {
      console.log('Columns in CRM_Geral:', Object.keys(data[0]));
      console.log('Sample data:', data[0]);
    } else {
      console.log('CRM_Geral is empty');
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkColumns();
