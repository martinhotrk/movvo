import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    // Cabeçalhos CORS para permitir comunicação com o Front-end
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { method, url } = req;

    try {
        // --- 1. ROTA DE CONSULTA DE TOTAIS (GET /api/transactions/totals) ---
        if (method === 'GET' && url.includes('/totals')) {
            const { email } = req.query;

            if (!email) {
                return res.status(400).json({ sucesso: false, erro: "E-mail do usuário não fornecido." });
            }

            // Puxa todos os registros de gastos e ganhos do usuário
            const { data: registros, error } = await supabase
                .from('gastos')
                .select('ganhos, gastos')
                .eq('usuario_email', email);

            if (error) throw error;

            // Calcula os totais com base nas linhas retornadas
            let totalGanhos = 0;
            let totalGastos = 0;

            if (registros && registros.length > 0) {
                registros.forEach(item => {
                    totalGanhos += parseFloat(item.ganhos || 0);
                    totalGastos += parseFloat(item.gastos || 0);
                });
            }

            const lucro = totalGanhos - totalGastos;

            return res.status(200).json({
                sucesso: true,
                ganhos: totalGanhos,
                gastos: totalGastos,
                lucro: lucro
            });
        }

        // --- 2. ROTA PARA INSERIR NOVO LANÇAMENTO (POST /api/transactions) ---
        if (method === 'POST') {
            const { email, ganhos, gastos } = req.body;

            if (!email) {
                return res.status(400).json({ sucesso: false, message: "Usuário não identificado." });
            }

            // Insere o faturamento ou gasto na tabela 'gastos'
            const { error } = await supabase
                .from('gastos')
                .insert([
                    { 
                        usuario_email: email, 
                        ganhos: ganhos || 0, 
                        gastos: gastos || 0 
                    }
                ]);

            if (error) throw error;

            return res.status(200).json({ status: "success", sucesso: true });
        }

        // Caso não entre em nenhuma condição
        return res.status(404).json({ sucesso: false, erro: "Rota não encontrada." });

    } catch (error) {
        console.error("Erro no servidor de transações:", error);
        return res.status(500).json({ sucesso: false, message: "Erro interno no servidor de transações." });
    }
}
