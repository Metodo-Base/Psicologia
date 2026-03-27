import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/services/authService';

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Acesso negado. Apenas administradores podem semear dados.' }, { status: 403 });
  }

  try {
    console.log('API Seed: Iniciando processo para o usuário:', user.email);
    
    // 1. Limpar dados antigos de teste para evitar duplicidade e erros de chave primária
    await supabase
      .from('CRM_Geral')
      .delete()
      .like('Identificador do usuario', `${user.email}%`);

    // 2. Tentar obter dados para ver as colunas (debug)
    const { data: checkData, error: checkError } = await supabase
      .from('CRM_Geral')
      .select('*')
      .limit(1);
    
    if (checkError) {
      console.error('API Seed: Erro ao verificar colunas:', checkError);
    } else if (checkData && checkData.length > 0) {
      console.log('API Seed: Colunas detectadas:', Object.keys(checkData[0]));
    }

    // Não usamos mais ID manual pois a tabela CRM_Geral não possui coluna 'id'

    const names = [
      'Ana Beatriz Silva', 'Bruno Oliveira', 'Carla Mendes', 'Diego Santos', 'Elena Ferreira',
      'Fabio Lima', 'Gabriela Costa', 'Hugo Rocha', 'Isabela Martins', 'João Pedro Alves',
      'Karen Souza', 'Lucas Gabriel', 'Mariana Luz', 'Nicolas Vaz', 'Olivia Ramos',
      'Paulo Henrique', 'Quiteria Maria', 'Ricardo Gomes', 'Sofia Helena', 'Tiago Arantes'
    ];

    const statuses = ['Contatos iniciados', 'Não qualificados', 'Qualificados', 'Consultas Fechadas'];
    const origens = ['whatsapp', 'instagram', 'site', 'indicacao'];
    const modalidades = ['online', 'presencial'];
    const tiposConsulta = ['Individual', 'Casal', 'Infantil'];

    const leads = [];
    const patientsToInsert = [];

    for (let i = 0; i < 20; i++) {
      const name = names[i];
      const whatsapp = `55119${Math.floor(10000000 + Math.random() * 90000000)}`;
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const origem = origens[Math.floor(Math.random() * origens.length)];
      const modalidade = modalidades[Math.floor(Math.random() * modalidades.length)];
      const tipoConsulta = tiposConsulta[Math.floor(Math.random() * tiposConsulta.length)];
      
      // Datas variadas nos últimos 30 dias
      const daysAgo = Math.floor(Math.random() * 30);
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      const dateStr = date.toISOString();

      const lead: any = {
        Nome: name,
        Whatsapp: whatsapp,
        tipo_consulta: tipoConsulta,
        'Resumo da conversa': `Interesse em terapia ${tipoConsulta.toLowerCase()}. Relatou sintomas de ansiedade e busca por autoconhecimento.`,
        'Inicio do atendimento': date.toLocaleDateString('pt-BR').replace(/\//g, '-'),
        'Timestamp ultima msg': dateStr,
        'Data da consulta': status === 'Qualificados' || status === 'Consultas Fechadas' ? `${new Date(date.getTime() + 86400000 * 2).toLocaleDateString('pt-BR').substring(0, 5)} - 14:00` : null,
        status_conversao: status,
        tipo: status === 'Contatos iniciados' ? 'lead' : 'paciente',
        modalidade: modalidade,
        origem: origem,
        valor_sessao: status !== 'Contatos iniciados' ? 150 + (Math.floor(Math.random() * 10) * 10) : null,
        'Identificador do usuario': `${user.email}:${whatsapp}`
      };

      leads.push(lead);
    }

    // Inserir Leads - Selecionamos colunas específicas que sabemos que existem
    const { data: insertedLeads, error: leadsError } = await supabase
      .from('CRM_Geral')
      .insert(leads)
      .select('Nome, Whatsapp, status_conversao, "Resumo da conversa"');

    if (leadsError) throw leadsError;

    // Criar pacientes formais para os convertidos
    const convertedLeads = insertedLeads.filter(l => l.status_conversao === 'Consultas Fechadas');
    
    for (const lead of convertedLeads) {
      const patient = {
        name: lead.Nome,
        phone: lead.Whatsapp,
        observations: `Lead convertido via seed. Resumo: ${lead['Resumo da conversa']}`
      };
      patientsToInsert.push(patient);
    }

    if (patientsToInsert.length > 0) {
      const { data: insertedPatients, error: patientsError } = await supabase
        .from('crm_psico_patients')
        .insert(patientsToInsert)
        .select();

      if (patientsError) throw patientsError;

      // Atualizar CRM_Geral com patient_id e criar planos de terapia
      const therapyPlans = [];
      const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
      const frequencies = ['weekly', 'biweekly'];

      for (const patient of insertedPatients) {
        // Atualizar lead correspondente
        await supabase
          .from('CRM_Geral')
          .update({ patient_id: patient.id })
          .eq('Whatsapp', patient.phone);

        // Criar plano de terapia para alguns
        if (Math.random() > 0.3) {
          const plan = {
            patient_id: patient.id,
            status: 'active',
            frequency: frequencies[Math.floor(Math.random() * frequencies.length)],
            weekdays: [weekdays[Math.floor(Math.random() * weekdays.length)]],
            time: `${Math.floor(8 + Math.random() * 10).toString().padStart(2, '0')}:00:00`,
            start_date: new Date().toISOString().split('T')[0],
            observations: 'Plano gerado automaticamente pelo seed.'
          };
          therapyPlans.push(plan);
        }
      }

      if (therapyPlans.length > 0) {
        const { error: plansError } = await supabase
          .from('therapy_plans')
          .insert(therapyPlans);
        
        if (plansError) throw plansError;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `${leads.length} leads criados, ${patientsToInsert.length} pacientes convertidos e planos de terapia gerados.` 
    });
  } catch (err: any) {
    console.error('Erro no seed:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
