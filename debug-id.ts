import { supabase } from './lib/supabase';

async function getMaxId() {
  const { data, error } = await supabase
    .from('CRM_Geral')
    .select('id')
    .order('id', { ascending: false })
    .limit(1);
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Max ID:', data[0]?.id);
    console.log('Type of ID:', typeof data[0]?.id);
  }
}

getMaxId();
