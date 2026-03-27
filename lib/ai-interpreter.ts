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
