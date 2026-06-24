import { getSupabaseServer } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { simpleParser } from 'mailparser'


export async function POST(request) {
    try {
        // Authenticate webhook
        const secret = new URL(request.url).searchParams.get('secret') || request.headers.get('x-webhook-secret') || request.headers.get('Authorization')?.replace('Bearer ', '');
        const expectedSecret = process.env.INBOUND_EMAIL_SECRET || 'sorted_solutions_secret_2026';
        if (secret !== expectedSecret) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        let sender_email = 'unknown@example.com';
        let sender_name = 'Unknown';
        let recipient_email = 'support@sortedsolutions.in';
        let subject = 'No Subject';
        let body_text = '';
        let body_html = '';
        let rawPayload = {};

        const contentType = request.headers.get('content-type') || '';
        
        if (contentType.includes('application/json')) {
            const body = await request.json();
            rawPayload = body;
            
            // Extract sender (From)
            const fromVal = body.from || body.sender || body.from_email || '';
            const parsedFrom = parseFromHeader(fromVal);
            sender_email = parsedFrom.email;
            sender_name = parsedFrom.name;
            
            // Extract recipient (To)
            recipient_email = extractEmail(body.to || body.recipient || body.envelope?.to || 'support@sortedsolutions.in');
            
            // Subject
            subject = body.subject || 'No Subject';
            
            // Bodies
            body_text = body.text || body.body_text || body.plain || body.body || '';
            body_html = body.html || body.body_html || '';
        } else if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            
            // Build raw payload from form data
            for (const [key, value] of formData.entries()) {
                if (typeof value === 'string') {
                    rawPayload[key] = value;
                }
            }
            
            const fromVal = formData.get('from') || formData.get('sender') || '';
            const parsedFrom = parseFromHeader(fromVal);
            sender_email = parsedFrom.email;
            sender_name = parsedFrom.name;
            
            recipient_email = extractEmail(formData.get('to') || formData.get('recipient') || 'support@sortedsolutions.in');
            subject = formData.get('subject') || 'No Subject';
            body_text = formData.get('text') || formData.get('plain') || '';
            body_html = formData.get('html') || '';
        } else if (contentType.includes('message/rfc822') || contentType.includes('application/octet-stream') || !contentType) {
            // Read raw body bytes
            const rawBody = await request.arrayBuffer();
            const buffer = Buffer.from(rawBody);
            
            // Parse using mailparser
            const parsed = await simpleParser(buffer);
            
            const sender_email_raw = parsed.from?.value?.[0]?.address || 'unknown@example.com';
            sender_email = sender_email_raw.toLowerCase().trim();
            sender_name = parsed.from?.value?.[0]?.name || sender_email.split('@')[0];
            
            const envelopeTo = request.headers.get('X-Envelope-To') || request.headers.get('x-envelope-to');
            recipient_email = extractEmail(envelopeTo || parsed.to?.value?.[0]?.address || 'support@sortedsolutions.in');
            
            subject = parsed.subject || 'No Subject';
            body_text = parsed.text || '';
            body_html = parsed.html || parsed.textAsHtml || '';
            
            const messageId = parsed.messageId || '';
            rawPayload = {
                direction: 'inbound',
                messageId,
                headers: parsed.headers ? Object.fromEntries(parsed.headers) : {}
            };
        } else {
            return NextResponse.json({ success: false, error: 'Unsupported Content-Type' }, { status: 400 });
        }

        // Validate required fields
        if (!sender_email) {
            sender_email = 'unknown@example.com';
        }
        if (!recipient_email) {
            recipient_email = 'support@sortedsolutions.in';
        }

        const supabase = getSupabaseServer();
        if (!supabase) {
            return NextResponse.json({ success: false, error: 'Database client not available' }, { status: 503 });
        }

        // Insert into database
        const { data, error } = await supabase
            .from('support_emails')
            .insert([{
                recipient_email,
                sender_email,
                sender_name,
                subject,
                body_text,
                body_html,
                status: 'unread',
                metadata: rawPayload
            }])
            .select()
            .single();

        if (error) {
            throw error;
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Inbound email webhook error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

function parseFromHeader(fromStr) {
    if (!fromStr) return { email: 'unknown@example.com', name: 'Unknown' };
    
    // Format: "Name" <email@example.com> or Name <email@example.com>
    const match = fromStr.match(/^(?:"?([^"]*?)"?\s*)?<(.*?)>$/);
    if (match) {
        return {
            name: match[1]?.trim() || match[2].split('@')[0],
            email: match[2].trim().toLowerCase()
        };
    }
    
    // Format: email@example.com
    return {
        name: fromStr.split('@')[0] || 'Unknown',
        email: fromStr.trim().toLowerCase()
    };
}

function extractEmail(str) {
    if (!str) return '';
    const match = str.match(/<([^>]+)>/);
    if (match) return match[1].trim().toLowerCase();
    
    const emailMatch = str.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    return emailMatch ? emailMatch[0].trim().toLowerCase() : str.trim().toLowerCase();
}
