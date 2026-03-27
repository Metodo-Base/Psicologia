import { supabase } from '@/lib/supabase';

export interface Patient {
  id?: string;
  name: string;
  phone?: string;
  email?: string;
  observations?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Cria um novo paciente na tabela crm_psico_patients
 */
export async function createPatient(patientData: Omit<Patient, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('crm_psico_patients')
    .insert([patientData])
    .select()
    .single();

  if (error) throw error;
  return data as Patient;
}

/**
 * Busca todos os pacientes cadastrados
 */
export async function getPatients() {
  const { data, error } = await supabase
    .from('crm_psico_patients')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data as Patient[];
}

/**
 * Busca um paciente pelo ID
 */
export async function getPatientById(id: string) {
  const { data, error } = await supabase
    .from('crm_psico_patients')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Patient;
}

/**
 * Converte um lead da CRM_Geral em um paciente formal na crm_psico_patients
 * Utiliza o Whatsapp como identificador único na CRM_Geral
 */
export async function convertLeadToPatient(leadWhatsapp: string) {
  console.log('Iniciando conversão do lead pelo Whatsapp:', leadWhatsapp);
  try {
    // 1. Busca os dados do lead na CRM_Geral pelo Whatsapp
    console.log('Passo 1: Buscando lead na CRM_Geral pelo Whatsapp...');
    const { data: lead, error: fetchError } = await supabase
      .from('CRM_Geral')
      .select('*')
      .eq('Whatsapp', leadWhatsapp)
      .maybeSingle();

    if (fetchError) {
      console.error('Erro ao buscar lead para conversão:', fetchError);
      throw new Error(`Erro ao buscar lead: ${fetchError.message}`);
    }
    if (!lead) {
      console.error('Lead não encontrado com Whatsapp:', leadWhatsapp);
      throw new Error('Lead não encontrado na tabela CRM_Geral. Verifique se o registro ainda existe.');
    }

    console.log('Dados do lead encontrados:', lead.Nome || 'Sem Nome');
    
    // 1.1 Verificação de Duplicidade: Verifica se já existe um paciente com este Whatsapp
    const { data: existingPatient } = await supabase
      .from('crm_psico_patients')
      .select('id')
      .eq('phone', leadWhatsapp)
      .maybeSingle();

    if (existingPatient) {
      console.log('Paciente já existe com este Whatsapp. ID:', existingPatient.id);
      
      // Apenas atualiza o CRM_Geral caso não esteja vinculado
      if (lead.patient_id !== existingPatient.id) {
        await supabase
          .from('CRM_Geral')
          .update({ 
            patient_id: existingPatient.id,
            status_conversao: 'Convertido'
          })
          .eq('Whatsapp', leadWhatsapp);
      }
      
      return { ...existingPatient, alreadyExisted: true };
    }

    // 2. Insere na tabela crm_psico_patients
    console.log('Passo 2: Inserindo na tabela crm_psico_patients...');
    const patientToInsert = {
      name: lead.Nome || lead.Whatsapp || 'Paciente sem Nome',
      phone: lead.Whatsapp || '',
      email: lead.email || null, // Usa e-mail se existir, senão null
      observations: `Lead convertido em ${new Date().toLocaleString('pt-BR')}. Resumo da triagem: ${lead['Resumo da conversa'] || 'Sem resumo'}`
    };
    
    console.log('Dados a serem inseridos:', patientToInsert);

    const { data: newPatient, error: insertError } = await supabase
      .from('crm_psico_patients')
      .insert([patientToInsert])
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao inserir paciente formal:', insertError);
      throw new Error(`Erro ao criar paciente: ${insertError.message}`);
    }
    
    if (!newPatient) throw new Error('Erro ao criar paciente: Nenhum dado retornado após inserção.');
    
    console.log('Paciente formal criado com ID:', newPatient.id);

    // 3. Atualiza o registro original na CRM_Geral com o patient_id e status 'Convertido'
    console.log('Passo 3: Atualizando status na CRM_Geral...');
    
    const { error: updateError } = await supabase
      .from('CRM_Geral')
      .update({ 
        patient_id: newPatient.id,
        status_conversao: 'Convertido'
      })
      .eq('Whatsapp', leadWhatsapp);

    if (updateError) {
      console.error('Erro ao atualizar status do lead:', updateError);
      console.warn('O paciente foi criado, mas o lead não pôde ser atualizado na CRM_Geral.');
    }

    console.log('Processo de conversão finalizado com sucesso');
    return newPatient;
  } catch (error: any) {
    console.error('Erro fatal no processo de conversão:', error);
    throw error;
  }
}
