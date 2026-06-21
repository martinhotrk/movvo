import { createClient } from '@supabase/supabase-js';

// Inicializa o cliente do Supabase usando as variáveis de ambiente da Vercel
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // Configuração de cabeçalhos CORS para permitir que seu index.html faça requisições livremente
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Captura a ação (login ou cadastrar) e os dados enviados por POST ou GET
  const dados = req.method === 'POST' ? req.body : req.query;
  const { acao, nome, email, senha, pin } = dados;

  try {
    // --- ROTA DE CADASTRO ---
    if (acao === 'cadastrar_usuario') {
      if (!email || !senha || !nome) {
        return res.status(400).json({ sucesso: false, message: 'Dados incompletos para cadastro.' });
      }

      const { data, error } = await supabase
        .from('usuarios')
        .insert([{ nome, email, senha, pin: pin || '' }])
        .select();

      if (error) throw error;

      return res.status(200).json({ status: 'success', sucesso: true, usuario: { nome, email } });
    }

    // --- ROTA DE LOGIN ---
    if (acao === 'login') {
      if (!email || !senha) {
        return res.status(400).json({ sucesso: false, message: 'E-mail e senha são obrigatórios.' });
      }

      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !data || data.senha !== senha) {
        return res.status(401).json({ sucesso: false, message: 'E-mail ou senha incorretos.' });
      }

      return res.status(200).json({
        status: 'success',
        sucesso: true,
        usuario: { nome: data.nome, email: data.email, pin: data.pin }
      });
    }

    return res.status(400).json({ sucesso: false, message: 'Ação inválida ou não informada.' });

  } catch (error) {
    return res.status(500).json({ status: 'error', sucesso: false, message: error.message });
  }
}
