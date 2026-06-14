import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Corpo da requisição inválido' }, { status: 400 });
    }

    const { email, password } = body || {};

    if (email !== 'contato@evolves.site' || password !== '256398Dash@2026') {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Configuração do Supabase Service Role não encontrada.' }, { status: 500 });
    }

    // Initialize Supabase admin client (service role is required to list users)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // 1. Fetch users from auth
    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    if (usersError) throw usersError;

    // 2. Fetch predictions
    const { data: predictions, error: predsError } = await supabaseAdmin
      .from('predictions')
      .select('id, user_id, updated_at');

    if (predsError) {
      console.warn('Predictions table may not exist or has error:', predsError.message);
    }

    // 3. Merge predictions into users list
    const mappedUsers = users.map(user => {
      const userPreds = predictions?.filter(p => p.user_id === user.id) || [];
      return {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        predictionsCount: userPreds.length,
        predictionCodes: userPreds.map(p => p.id),
        last_updated: userPreds.length > 0 ? userPreds[0].updated_at : null
      };
    });

    return NextResponse.json({ users: mappedUsers });
  } catch (err: any) {
    console.error('Admin Users API error:', err);
    return NextResponse.json({ error: err.message || 'Erro interno do servidor' }, { status: 500 });
  }
}
