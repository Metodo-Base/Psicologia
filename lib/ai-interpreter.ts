import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { AiConfig } from "@/services/aiConfigService";

export interface ExtractedFilters {
  tipo?: 'lead' | 'paciente';
  status_conversao?: string;
  modalidade?: 'online' | 'presencial';
  origem?: string;
  valor_sessao_min?: number;
  valor_sessao_max?: number;
  whatsapp?: string;
  q?: string;
  observacoes?: string;
}

const SYSTEM_PROMPT = `
Você é um assistente especializado em extrair filtros de busca de frases em português para um sistema de gestão de clínica psicológica.
Sua tarefa é retornar um JSON com os seguintes campos (todos opcionais):
- tipo: "lead" ou "paciente"
- status_conversao: "novo", "em_atendimento", "agendado", "alta", "abandono"
- modalidade: "online" ou "presencial"
- origem: "whatsapp", "instagram", "site", "indicacao"
- valor_sessao_min: número
- valor_sessao_max: número
- whatsapp: string (apenas números)
- q: string (termo de busca geral)
- observacoes: string (orientação se a frase for vaga)

REGRAS:
1. Não invente filtros que não foram solicitados.
2. Se a frase for vaga demais, use o campo "observacoes" para orientar o usuário.
3. Retorne APENAS o JSON.
`;

export interface CategorizedLead {
  status_conversao?: string;
  tipo_consulta?: 'Online' | 'Presencial';
  tipo?: 'lead' | 'paciente';
}

const CATEGORIZATION_PROMPT = `
Você é um assistente de triagem para uma clínica de psicologia. Sua tarefa é analisar o resumo de uma conversa e categorizar o lead.

ESTÁGIOS DO FUNIL (status_conversao):
1. "Contatos iniciados": O lead apenas enviou a primeira mensagem ou o resumo está vazio/muito curto.
2. "Não qualificados": A conversa começou, houve troca de informações, mas ainda não há um pedido claro de agendamento.
3. "Qualificados": O lead demonstrou interesse real em agendar, perguntou por horários disponíveis, valores ou confirmou que quer marcar.
4. "Consultas Fechadas": O lead já escolheu um horário e a consulta está agendada/confirmada.

MODALIDADE (tipo_consulta):
- "Online": Se o lead mencionou preferência por atendimento remoto/vídeo.
- "Presencial": Se o lead mencionou preferência por ir ao consultório.

TIPO (tipo):
- "lead": Se ainda está em negociação.
- "paciente": Se já fechou consulta ou está em tratamento.

Retorne APENAS um JSON no formato:
{
  "status_conversao": "estágio",
  "tipo_consulta": "Online" | "Presencial",
  "tipo": "lead" | "paciente"
}
`;

export async function categorizeLead(summary: string, config: AiConfig): Promise<CategorizedLead> {
  if (!summary || summary.length < 5) {
    return { status_conversao: 'Contatos iniciados', tipo: 'lead' };
  }

  if (config.provider === 'google') {
    const ai = new GoogleGenAI({ apiKey: config.api_key });
    try {
      const response = await ai.models.generateContent({
        model: config.model || "gemini-3-flash-preview",
        contents: `Resumo da conversa: "${summary}"`,
        config: {
          systemInstruction: CATEGORIZATION_PROMPT,
          responseMimeType: "application/json",
        },
      });

      const text = response.text || '{}';
      return JSON.parse(text);
    } catch (e) {
      console.error('Error with Gemini AI categorization:', e);
      return {};
    }
  } else {
    const openai = new OpenAI({ apiKey: config.api_key });
    try {
      const response = await openai.chat.completions.create({
        model: config.model || "gpt-4o",
        messages: [
          { role: "system", content: CATEGORIZATION_PROMPT },
          { role: "user", content: `Resumo da conversa: "${summary}"` }
        ],
        response_format: { type: "json_object" }
      });

      const text = response.choices[0].message.content || '{}';
      return JSON.parse(text);
    } catch (e) {
      console.error('Error with OpenAI categorization:', e);
      return {};
    }
  }
}

export async function interpretQuery(query: string, config: AiConfig): Promise<ExtractedFilters> {
  if (config.provider === 'google') {
    const ai = new GoogleGenAI({ apiKey: config.api_key });
    try {
      const response = await ai.models.generateContent({
        model: config.model || "gemini-3-flash-preview",
        contents: query,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: "application/json",
        },
      });

      const text = response.text || '{}';
      return JSON.parse(text);
    } catch (e) {
      console.error('Error with Gemini AI:', e);
      return { observacoes: "Erro ao interpretar a consulta com Gemini." };
    }
  } else {
    const openai = new OpenAI({ apiKey: config.api_key });
    const response = await openai.chat.completions.create({
      model: config.model || "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: query }
      ],
      response_format: { type: "json_object" }
    });

    const text = response.choices[0].message.content || '{}';
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error('Error parsing OpenAI response:', text);
      return { observacoes: "Erro ao interpretar a consulta com OpenAI." };
    }
  }
}
