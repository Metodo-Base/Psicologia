import { supabase } from './lib/supabase';

async function checkPK() {
  console.log('--- Checking CRM_Geral Primary Key ---');
  
  // Query to get table information from information_schema
  const { data, error } = await supabase.rpc('get_table_info', { table_name: 'CRM_Geral' });
  
  if (error) {
    console.log('RPC get_table_info failed, trying direct query...');
    // Fallback: try to see if we can get it via a raw query if enabled, 
    // but usually we can't from client.
    // Let's try to insert a duplicate and see the error message details.
    
    const testId = 'test-pk-check-' + Date.now();
    const { error: insertError } = await supabase.from('CRM_Geral').insert([
      { 'Identificador do usuario': testId, Nome: 'Test' },
      { 'Identificador do usuario': testId, Nome: 'Test Duplicate' }
    ]);
    
    if (insertError) {
      console.log('Insert duplicate error:', insertError.message);
      console.log('Insert duplicate detail:', (insertError as any).details);
    }
  } else {
    console.log('Table Info:', data);
  }
}

checkPK();
