import { supabase } from './lib/supabase';

async function debug() {
  console.log('--- Starting Deep Debug ---');
  
  // 1. Check if 'id' exists by selecting it
  const { data: idCheck, error: idError } = await supabase.from('CRM_Geral').select('id').limit(1);
  console.log('1. ID Column Check:', { exists: !idError, error: idError?.message });

  // 2. Try to insert a dummy record and catch the full error
  const dummyWhatsapp = 'debug-' + Math.floor(Math.random() * 1000000);
  console.log('2. Attempting dummy insert with Whatsapp:', dummyWhatsapp);
  
  const { data: insCheck, error: insError } = await supabase.from('CRM_Geral').insert([{
    Nome: 'Debug Record',
    Whatsapp: dummyWhatsapp,
    'Identificador do usuario': 'debug@test.com'
  }]).select();
  
  if (insError) {
    console.log('Insert Error:', insError);
    console.log('Insert Error Details:', JSON.stringify(insError, null, 2));
  } else {
    console.log('Insert Success! Columns in returned data:', Object.keys(insCheck[0]));
    console.log('Full record:', insCheck[0]);
    // Clean up
    await supabase.from('CRM_Geral').delete().eq('Nome', 'Debug Record');
  }

  // 3. Test uniqueness
  console.log('3. Testing uniqueness constraints...');
  
  // Clean up any previous tests
  await supabase.from('CRM_Geral').delete().like('Nome', 'Test %');

  // 3a. Test if Whatsapp is the PK
  console.log('3a. Testing if Whatsapp is the PK...');
  await supabase.from('CRM_Geral').insert([{ Nome: 'Test A', Whatsapp: 'unique-1', 'Identificador do usuario': 'id-1' }]);
  const { error: errA } = await supabase.from('CRM_Geral').insert([{ Nome: 'Test B', Whatsapp: 'unique-1', 'Identificador do usuario': 'id-2' }]);
  console.log('Duplicate Whatsapp error:', errA?.message);

  // 3b. Test if Identificador do usuario is the PK
  console.log('3b. Testing if Identificador do usuario is the PK...');
  await supabase.from('CRM_Geral').insert([{ Nome: 'Test C', Whatsapp: 'unique-3', 'Identificador do usuario': 'same-id' }]);
  const { error: errB } = await supabase.from('CRM_Geral').insert([{ Nome: 'Test D', Whatsapp: 'unique-4', 'Identificador do usuario': 'same-id' }]);
  console.log('Duplicate Identificador error:', errB?.message);

  // 3c. Test if Nome is the PK
  console.log('3c. Testing if Nome is the PK...');
  await supabase.from('CRM_Geral').insert([{ Nome: 'Same Name', Whatsapp: 'unique-5', 'Identificador do usuario': 'id-3' }]);
  const { error: errC } = await supabase.from('CRM_Geral').insert([{ Nome: 'Same Name', Whatsapp: 'unique-6', 'Identificador do usuario': 'id-4' }]);
  console.log('Duplicate Nome error:', errC?.message);
  
  // Clean up
  await supabase.from('CRM_Geral').delete().like('Nome', 'Test %');
  await supabase.from('CRM_Geral').delete().eq('Nome', 'Same Name');
}

debug();
