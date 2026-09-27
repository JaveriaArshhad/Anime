const { createClient } = require('@supabase/supabase-js');

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

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    try {
        // ---- GET: anyone can view ----
        if (event.httpMethod === 'GET') {
            const { data, error } = await supabase
                .from('notcompleted')
                .select('id, anime_title, anime_image, anime_link, reason, created_at')
                .order('created_at', { ascending: true });
            if (error) throw error;
            return { statusCode: 200, headers, body: JSON.stringify(data) };
        }

        // ---- POST: add an item (admin only) ----
        if (event.httpMethod === 'POST') {
            const { animeTitle, animeImage, animeLink, reason, passcode } = JSON.parse(event.body || '{}');

            if (!process.env.ADMIN_PASSCODE || passcode !== process.env.ADMIN_PASSCODE) {
                return { statusCode: 403, headers, body: JSON.stringify({ error: 'Not authorized' }) };
            }

            if (!animeTitle) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: 'animeTitle is required' }) };
            }

            const { data: existing, error: findError } = await supabase
                .from('notcompleted')
                .select('id')
                .eq('anime_title', animeTitle)
                .limit(1);
            if (findError) throw findError;
            if (existing.length > 0) {
                return { statusCode: 409, headers, body: JSON.stringify({ error: 'Already on the list' }) };
            }

            const { data, error } = await supabase
                .from('notcompleted')
                .insert({ anime_title: animeTitle, anime_image: animeImage || null, anime_link: animeLink || null, reason: reason || null })
                .select('id')
                .single();
            if (error) throw error;

            return { statusCode: 201, headers, body: JSON.stringify({ id: data.id }) };
        }

        // ---- DELETE: remove an item (admin only) ----
        if (event.httpMethod === 'DELETE') {
            const { id, passcode } = JSON.parse(event.body || '{}');

            if (!process.env.ADMIN_PASSCODE || passcode !== process.env.ADMIN_PASSCODE) {
                return { statusCode: 403, headers, body: JSON.stringify({ error: 'Not authorized' }) };
            }

            if (!id) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: 'id is required' }) };
            }

            const { error } = await supabase.from('notcompleted').delete().eq('id', id);
            if (error) throw error;
            return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
        }

        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    } catch (error) {
        console.error('Database error:', error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Something went wrong on the server.' }) };
    }
};