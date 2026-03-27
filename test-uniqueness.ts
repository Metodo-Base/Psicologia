import { supabase } from './lib/supabase';

async function testUniqueness() {
  console.log('--- Testing Uniqueness ---');
  
  const base = {
    'Inicio do atendimento': '2026-03-27',
    Nome: 'Test User',
    'Resumo da conversa': 'Test',
    'Timestamp ultima msg': new Date().toISOString()
  };

  // Test 1: Duplicate Whatsapp
  console.log('Test 1: Duplicate Whatsapp');
  const whatsapp = 'test-' + Date.now();
  const { error: err1 } = await supabase.from('CRM_Geral').insert([
    { ...base, 'Identificador do usuario': 'test-id-1', Whatsapp: whatsapp },
    { ...base, 'Identificador do usuario': 'test-id-2', Whatsapp: whatsapp }
  ]);
  
  if (err1) {
    console.log('Test 1 Failed (as expected if Whatsapp is unique):', err1.message);
  } else {
    console.log('Test 1 Succeeded (Whatsapp is NOT unique)');
    // Cleanup
    await supabase.from('CRM_Geral').delete().in('Identificador do usuario', ['test-id-1', 'test-id-2']);
  }

  // Test 2: Duplicate Identificador do usuario
  console.log('Test 2: Duplicate Identificador do usuario');
  const id = 'test-id-' + Date.now();
  const { error: err2 } = await supabase.from('CRM_Geral').insert([
    { ...base, 'Identificador do usuario': id, Whatsapp: 'w1' },
    { ...base, 'Identificador do usuario': id, Whatsapp: 'w2' }
  ]);
  
  if (err2) {
    console.log('Test 2 Failed (as expected if Identificador do usuario is unique):', err2.message);
  } else {
    console.log('Test 2 Succeeded (Identificador do usuario is NOT unique)');
    // Cleanup
    await supabase.from('CRM_Geral').delete().eq('Identificador do usuario', id);
  }
}

testUniqueness();
