const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    };

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    try {
        // ---- GET: return every recommendation; the frontend groups them by user_name ----
        if (event.httpMethod === 'GET') {
            const { data, error } = await supabase
                .from('recommendations')
                .select('id, user_name, anime_title, anime_image, anime_link, created_at')
                .order('created_at', { ascending: true });
            if (error) throw error;
            return { statusCode: 200, headers, body: JSON.stringify(data) };
        }

        // ---- POST: add a new recommendation ----
        if (event.httpMethod === 'POST') {
            const { userName, animeTitle, animeImage, animeLink, website } = JSON.parse(event.body || '{}');

            // Honeypot: real users never fill this field, so quietly pretend success for bots.
            if (website) {
                return { statusCode: 201, headers, body: JSON.stringify({ id: 0 }) };
            }

            if (!userName || !animeTitle) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: 'userName and animeTitle are required' }) };
            }

            if (userName.length > 100 || animeTitle.length > 255) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: 'Input too long' }) };
            }

            const ip = event.headers['x-nf-client-connection-ip']
                || event.headers['client-ip']
                || (event.headers['x-forwarded-for'] || '').split(',')[0].trim()
                || 'unknown';

            const ownerToken = crypto.randomBytes(16).toString('hex');

            const { data, error } = await supabase
                .from('recommendations')
                .insert({
                    user_name: userName,
                    anime_title: animeTitle,
                    anime_image: animeImage || null,
                    anime_link: animeLink || null,
                    ip_address: ip,
                    owner_token: ownerToken,
                })
                .select('id')
                .single();
            if (error) throw error;

            return { statusCode: 201, headers, body: JSON.stringify({ id: data.id, ownerToken }) };
        }

        // ---- DELETE: admin (passcode) or the original submitter (ownerToken) ----
        if (event.httpMethod === 'DELETE') {
            const { id, passcode, ownerToken } = JSON.parse(event.body || '{}');

            if (!id) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: 'id is required' }) };
            }

            const isAdmin = process.env.ADMIN_PASSCODE && passcode === process.env.ADMIN_PASSCODE;

            if (isAdmin) {
                const { error } = await supabase.from('recommendations').delete().eq('id', id);
                if (error) throw error;
                return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
            }

            if (ownerToken) {
                const { data, error } = await supabase
                    .from('recommendations')
                    .delete()
                    .eq('id', id)
                    .eq('owner_token', ownerToken)
                    .select('id');
                if (error) throw error;
                if (data.length > 0) {
                    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
                }
            }

            return { statusCode: 403, headers, body: JSON.stringify({ error: 'Not authorized' }) };
        }

        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    } catch (error) {
        console.error('Database error:', error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Something went wrong on the server.' }) };
    }
};