import { supabase } from './lib/supabase';

async function checkConstraints() {
  console.log('--- Checking CRM_Geral Constraints ---');
  
  // Try to get constraints via RPC if available
  const { data, error } = await supabase.rpc('get_table_constraints', { table_name: 'CRM_Geral' });
  
  if (error) {
    console.log('RPC get_table_constraints failed.');
    // Try to infer from error messages by inserting various duplicates
    
    const base = {
      'Identificador do usuario': 'test-id-' + Date.now(),
      'Inicio do atendimento': '2026-03-27',
      Nome: 'Test User',
      'Resumo da conversa': 'Test',
      'Timestamp ultima msg': new Date().toISOString()
    };

    // Test: Duplicate IDConversa ChatWoot
    console.log('Test: Duplicate IDConversa ChatWoot');
    const { error: err1 } = await supabase.from('CRM_Geral').insert([
      { ...base, 'Identificador do usuario': 'id-1', 'IDConversa ChatWoot': '999' },
      { ...base, 'Identificador do usuario': 'id-2', 'IDConversa ChatWoot': '999' }
    ]);
    if (err1) console.log('IDConversa ChatWoot is unique:', err1.message);
    else console.log('IDConversa ChatWoot is NOT unique');

    // Test: Duplicate IDLead ChatWoot
    console.log('Test: Duplicate IDLead ChatWoot');
    const { error: err2 } = await supabase.from('CRM_Geral').insert([
      { ...base, 'Identificador do usuario': 'id-3', 'IDLead ChatWoot': '888' },
      { ...base, 'Identificador do usuario': 'id-4', 'IDLead ChatWoot': '888' }
    ]);
    if (err2) console.log('IDLead ChatWoot is unique:', err2.message);
    else console.log('IDLead ChatWoot is NOT unique');
  } else {
    console.log('Constraints:', data);
  }
}

checkConstraints();
