import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { assetId } = await request.json()
    if (!assetId) return NextResponse.json({ error: 'assetId obrigatório' }, { status: 400 })

    const { data: asset, error } = await supabase
      .from('creative_assets')
      .update({
        status: 'approved',
        updated_at: new Date().toISOString(),
      })
      .eq('id', assetId)
      .select('id, client_id, caption, slides_data, slide_count')
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, asset })
  } catch (error) {
    console.error('[atlas/approve-all]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 }
    )
  }
}
