import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  action: 'invite' | 'list' | 'bulk-invite';
  email?: string;
  emails?: string[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin access
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is admin
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, email, emails }: InviteRequest = await req.json();

    if (action === 'list') {
      // Get all users from auth.users
      const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (listError) {
        console.error('Error listing users:', listError);
        throw listError;
      }

      // Get all profiles
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('user_id, full_name');

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      // Get all admin user_ids
      const { data: adminRoles } = await supabaseAdmin
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      const adminUserIds = new Set(adminRoles?.map(r => r.user_id) || []);

      const userList = users.users.map(u => ({
        id: u.id,
        email: u.email,
        full_name: profileMap.get(u.id) || null,
        is_admin: adminUserIds.has(u.id),
        created_at: u.created_at,
        last_sign_in: u.last_sign_in_at,
        confirmed: !!u.email_confirmed_at,
      }));

      return new Response(JSON.stringify({ users: userList }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === 'invite' && email) {
      return await inviteUser(supabaseAdmin, email);
    }

    if (action === 'bulk-invite' && emails && emails.length > 0) {
      const results = [];
      for (const e of emails) {
        const result = await inviteUserInternal(supabaseAdmin, e);
        results.push({ email: e, ...result });
      }
      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error('Error in invite-user function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function inviteUserInternal(supabaseAdmin: any, email: string) {
  try {
    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u: any) => u.email === email);

    if (existingUser) {
      return { success: false, message: 'User already exists' };
    }

    // Create user with a random password (they'll use magic link)
    const tempPassword = crypto.randomUUID();
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: false,
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return { success: false, message: createError.message };
    }

    // Generate magic link for signup
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovableproject.com') || 'https://orbit.lovableproject.com'}/`,
      }
    });

    if (linkError) {
      console.error('Error generating link:', linkError);
      return { success: false, message: linkError.message };
    }

    const magicLink = linkData?.properties?.action_link;

    // Send invitation email
    const emailResult = await resend.emails.send({
      from: "Orbit Beta <onboarding@resend.dev>",
      to: [email],
      subject: "🚀 You're invited to test Orbit - AI Maths Tutor",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0f; color: #ffffff; padding: 40px 20px; margin: 0;">
          <div style="max-width: 480px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; border: 1px solid rgba(139, 92, 246, 0.2);">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="font-size: 32px; margin: 0 0 8px 0; background: linear-gradient(135deg, #8b5cf6, #d946ef); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">Orbit</h1>
              <p style="color: #a1a1aa; margin: 0; font-size: 14px;">AI Maths Tutor • Beta Test</p>
            </div>
            
            <p style="font-size: 18px; line-height: 1.6; margin: 0 0 24px 0;">Hey there! 👋</p>
            
            <p style="font-size: 16px; line-height: 1.6; color: #d1d5db; margin: 0 0 24px 0;">
              You've been invited to join the <strong style="color: #8b5cf6;">Orbit beta test</strong>. We're building an AI tutor that helps students master GCSE maths through conversation, and we'd love your feedback.
            </p>
            
            <p style="font-size: 16px; line-height: 1.6; color: #d1d5db; margin: 0 0 32px 0;">
              Click the button below to access Orbit and start exploring:
            </p>
            
            <div style="text-align: center; margin-bottom: 32px;">
              <a href="${magicLink}" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 600; font-size: 16px;">
                Join Orbit Beta →
              </a>
            </div>
            
            <p style="font-size: 14px; color: #6b7280; line-height: 1.6; margin: 0 0 16px 0;">
              This link will expire in 24 hours. If you have any issues, reply to this email or reach out to the team.
            </p>
            
            <hr style="border: none; border-top: 1px solid rgba(139, 92, 246, 0.2); margin: 24px 0;">
            
            <p style="font-size: 12px; color: #6b7280; text-align: center; margin: 0;">
              This is a beta test invitation from Zero Gravity.<br>
              If you didn't expect this email, you can safely ignore it.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    console.log('Email sent:', emailResult);

    return { success: true, message: 'Invitation sent', userId: newUser?.user?.id };

  } catch (error: any) {
    console.error('Error in inviteUserInternal:', error);
    return { success: false, message: error.message };
  }
}

async function inviteUser(supabaseAdmin: any, email: string) {
  const result = await inviteUserInternal(supabaseAdmin, email);
  return new Response(JSON.stringify(result), {
    status: result.success ? 200 : 400,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
