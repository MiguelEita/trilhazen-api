const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const axios = require('axios'); // Para chamar o YouTube
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001; // Usa a porta do Render ou 3001 localmente

app.use(cors());
app.use(express.json());

// Configuração do OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Chave do YouTube
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// Função auxiliar para buscar vídeo no YouTube
async function buscarVideoYouTube(termoDeBusca) {
  try {
    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q: termoDeBusca + ' tutorial programming', // Adiciona contexto à busca
        type: 'video',
        maxResults: 1,
        key: YOUTUBE_API_KEY
      }
    });

    if (response.data.items && response.data.items.length > 0) {
      const video = response.data.items[0];
      return {
        id: video.id.videoId,
        titulo: video.snippet.title,
        thumbnail: video.snippet.thumbnails.default.url
      };
    }
    return null;
  } catch (error) {
    console.error(`Erro ao buscar vídeo para "${termoDeBusca}":`, error.message);
    return null;
  }
}

app.get('/', (req, res) => {
  res.send('API TrilhaZen (OpenAI + YouTube) está online!');
});

app.post('/gerar-trilha', async (req, res) => {
  console.log('Recebido pedido de trilha:', req.body);

  try {
    const { objetivo, preferencias } = req.body;

    // 1. Pedir a estrutura da trilha ao OpenAI
    const prompt = `
      Crie uma trilha de aprendizado curta sobre "${objetivo}".
      O aluno tem estas preferências: "odeia ${preferencias}".
      
      Responda APENAS com um JSON válido neste formato:
      {
        "trilha": [
          {
            "modulo": "Nome do Módulo",
            "aulas": ["Tópico da Aula 1", "Tópico da Aula 2"]
          }
        ]
      }
      Não coloque markdown. Apenas o JSON cru.
    `;

    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content: "Você é um assistente JSON útil." }, { role: "user", content: prompt }],
      model: "gpt-3.5-turbo",
      response_format: { type: "json_object" }
    });

    const conteudoTexto = completion.choices[0].message.content;
    let trilhaDados = JSON.parse(conteudoTexto);

    console.log('Trilha gerada pela IA (sem vídeos). Enriquecendo com YouTube...');

    // 2. Enriquecer cada aula com um vídeo do YouTube
    // (Isso pode demorar um pouco, pois faz várias requisições)
    
    // Vamos percorrer cada módulo
    for (let i = 0; i < trilhaDados.trilha.length; i++) {
      const modulo = trilhaDados.trilha[i];
      
      // Vamos percorrer cada aula do módulo
      // Nota: Transformamos a lista de strings ["Aula 1"] em objetos [{titulo: "Aula 1", video: ...}]
      const novasAulas = [];
      
      for (const aulaTitulo of modulo.aulas) {
        // Busca o vídeo
        const videoData = await buscarVideoYouTube(`${aulaTitulo} ${objetivo}`);
        
        novasAulas.push({
          titulo: aulaTitulo,
          video: videoData // Pode ser null se não achar ou der erro
        });
      }
      
      // Substitui a lista antiga pela nova lista enriquecida
      trilhaDados.trilha[i].aulas = novasAulas;
    }

    console.log('Trilha enriquecida com sucesso!');
    res.json(trilhaDados);

  } catch (error) {
    console.error('Erro grave no servidor:', error);
    res.status(500).json({ error: 'Erro ao gerar trilha', details: error.message });
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});