import { NextResponse, type NextRequest } from 'next/server';
import { verifyAdminAuth, createServiceClient } from '@/lib/auth-helpers';

// PATCH - Update staging item
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Verify admin authentication
  const authResult = await verifyAdminAuth(req);
  if ('error' in authResult) return authResult.error;

  const { response: res } = authResult;
  const supabase = createServiceClient(req, res);

  try {
    const body = await req.json();
    const { id, airtable_id, created_at, ...updateData } = body;

    // Mark item as edited when updating
    const dataToUpdate = {
      ...updateData,
      is_edited: true
    };

    const { data, error } = await supabase
      .from('staging_table')
      .update(dataToUpdate)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400, headers: res.headers });
    }

    return NextResponse.json({ success: true, item: data }, { headers: res.headers });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400, headers: res.headers });
  }
}

// DELETE - Delete staging item
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Verify admin authentication
  const authResult = await verifyAdminAuth(req);
  if ('error' in authResult) return authResult.error;

  const { response: res } = authResult;
  const supabase = createServiceClient(req, res);

  const { error } = await supabase
    .from('staging_table')
    .delete()
    .eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400, headers: res.headers });
  }

  return NextResponse.json({ success: true }, { headers: res.headers });
}
