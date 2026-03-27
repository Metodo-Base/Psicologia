import { supabase } from './lib/supabase';

async function checkColumns() {
  const { data, error } = await supabase.from('CRM_Geral').select('*').limit(1);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Columns:', Object.keys(data[0] || {}));
  }
}

checkColumns();
