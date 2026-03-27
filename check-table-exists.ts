import { supabase } from './lib/supabase';

async function checkTable() {
  console.log('--- Checking CRM_Geral Table ---');
  const { data, error } = await supabase.from('CRM_Geral').select('*').limit(1);
  
  if (error) {
    console.error('Error querying CRM_Geral:', error);
    console.log('Error Code:', error.code);
    console.log('Error Message:', error.message);
  } else {
    console.log('Table CRM_Geral exists!');
    console.log('Sample data:', data);
  }
}

checkTable();
