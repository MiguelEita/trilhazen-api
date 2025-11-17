// ==========================================================
// 1. IMPORTAÇÕES DAS BIBLIOTECAS (AGORA COM OPENAI)
// ==========================================================
const express = require('express');
const cors = require('cors');

// Importa a biblioteca do OpenAI
const OpenAI = require('openai');

// Importa e "liga" o dotenv para ler nosso arquivo .env
require('dotenv').config();

// ==========================================================
// 2. CONFIGURAÇÕES INICIAIS
// ==========================================================
const app = express();
const port = 3001; 
app.use(cors());
app.use(express.json());

// ==========================================================
// 3. INICIALIZAÇÃO DA IA (OPENAI / ChatGPT)
// ==========================================================
// Pega a chave secreta do .env
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ==========================================================
// 4. ROTAS DA NOSSA API (NÃO MUDAM)
// ==========================================================

// Rota de Teste Padrão
app.get('/', (req, res) => {
  res.send('API TrilhaZen (com motor OpenAI) está funcionando!');
});

// === A ROTA DE IA (MODIFICADA PARA O OPENAI) ===
app.post('/gerar-trilha', async (req, res) => {
  console.log('Requisição recebida em /gerar-trilha...');

  try {
    // 1. Pega os dados que o React enviou
    const { objetivo, preferencias } = req.body;

    // 2. O "Prompt Mestre" (O mesmo de antes)
    const prompt = `
      Você é um mentor de tecnologia e bem-estar chamado "TrilhaZen".
      Seu objetivo é criar uma trilha de aprendizado curta (no máximo 3 módulos)
      para um aluno iniciante.

      O objetivo do aluno é: "${objetivo}"
      A preferência de bem-estar do aluno é: "odeia ${preferencias}"

      Sua resposta DEVE ser um objeto JSON válido, e nada mais.
      Não inclua "\`\`\`json" ou qualquer outro texto antes ou depois.

      A estrutura do JSON deve ser:
      {
        "trilha": [
          {
            "modulo": "Nome do Módulo 1",
            "aulas": [
              "Nome da Aula 1.1",
              "Nome da Aula 1.2",
              "Exercício Prático 1.3"
            ]
          },
          {
            "modulo": "Nome do Módulo 2",
            "aulas": [
              "Nome da Aula 2.1",
              "Nome da Aula 2.2"
            ]
          }
        ]
      }
    `;

    // 3. Envia o prompt para o OpenAI (ChatGPT 3.5 Turbo)
    const chatCompletion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Modelo rápido e barato
      messages: [
        {"role": "system", "content": "Responda apenas com JSON."},
        {"role": "user", "content": prompt}
      ],
      response_format: { type: "json_object" } // Mágico! Força a resposta em JSON.
    });

    const text = chatCompletion.choices[0].message.content;
    console.log('Resposta da IA (em texto):', text);

    // 4. Converte a resposta em texto da IA para um JSON de verdade
    const jsonResponse = JSON.parse(text);

    // 5. Envia o JSON de volta para o React (exatamente como antes)
    res.json(jsonResponse);

  } catch (error) {
    console.error('ERRO AO GERAR TRILHA:', error);
    res.status(500).json({ error: 'Falha ao gerar a trilha com a IA.' });
  }
});

// ==========================================================
// 5. INICIA O SERVIDOR
// ==========================================================
app.listen(port, () => {
  console.log(`Servidor TrilhaZen-API (OpenAI) rodando em http://localhost:${port}`);
});