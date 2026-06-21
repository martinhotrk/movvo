import { createClient } from '@supabase/supabase-js';

// Inicializa o cliente do Supabase com as variáveis de ambiente da Vercel
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    // Configuração de cabeçalhos CORS para permitir requisições do front-end
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Identifica qual endpoint o HTML está chamando com base na URL da requisição
    const { url } = req;

    try {
        // --- 1. ROTA DE CADASTRO ---
        if (url.includes('/register') && req.method === 'POST') {
            const { nome, email, senha, pin } = req.body;

            if (!nome || !email || !senha || !pin) {
                return res.status(400).json({ sucesso: false, erro: "Preencha todos os campos!" });
            }

            // Verifica se o usuário já existe
            const { data: usuarioExistente } = await supabase
                .from('usuarios')
                .select('email')
                .eq('email', email)
                .single();

            if (usuarioExistente) {
                return res.status(400).json({ sucesso: false, erro: "Este e-mail já está cadastrado." });
            }

            // Insere o novo usuário (Isso vai disparar o trigger automático das categorias padrão!)
            const { error: insertError } = await supabase
                .from('usuarios')
                .insert([{ nome, email, senha, pin }]);

            if (insertError) throw insertError;

            return res.status(200).json({ status: "success", email: email, usuario: nome });
        }

        // --- 2. ROTA DE LOGIN COMPLETO (E-mail e Senha) ---
        if (url.includes('/login') && req.method === 'POST') {
            const { email, senha } = req.body;

            const { data: usuario, error } = await supabase
                .from('usuarios')
                .select('nome, email, senha')
                .eq('email', email)
                .single();

            if (error || !usuario || usuario.senha !== senha) {
                return res.status(401).json({ sucesso: false, erro: "E-mail ou senha incorretos." });
            }

            return res.status(200).json({ status: "success", email: usuario.email, usuario: usuario.nome });
        }

        // --- 3. ROTA DE DESBLOQUEIO RÁPIDO (PIN) ---
        if (url.includes('/pin') && req.method === 'POST') {
            const { email, pin } = req.body;

            const { data: usuario, error } = await supabase
                .from('usuarios')
                .select('nome, email, pin')
                .eq('email', email)
                .single();

            if (error || !usuario || usuario.pin !== pin) {
                return res.status(401).json({ sucesso: false, erro: "PIN de acesso incorreto." });
            }

            return res.status(200).json({ status: "success", email: usuario.email, usuario: usuario.nome });
        }

        // Caso chame uma rota que não existe dentro de auth
        return res.status(404).json({ sucesso: false, erro: "Rota não encontrada." });

    } catch (error) {
        console.error("Erro no servidor:", error);
        return res.status(500).json({ sucesso: false, erro: "Erro interno no servidor de autenticação." });
    }
}
