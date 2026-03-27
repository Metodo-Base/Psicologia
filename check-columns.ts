import { supabase } from './lib/supabase';

async function checkColumns() {
  console.log('--- Checking CRM_Geral Columns ---');
  const { data, error } = await supabase.from('CRM_Geral').select('*').limit(1);
  
  if (error) {
    console.error('Error:', error);
  } else if (data && data.length > 0) {
    console.log('Columns:', Object.keys(data[0]));
    console.log('Sample record:', data[0]);
  }
}

checkColumns();
