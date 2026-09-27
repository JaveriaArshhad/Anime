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
                .from('watched')
                .select('id, anime_title, anime_image, anime_link, category, created_at')
                .order('category', { ascending: true })
                .order('created_at', { ascending: true });
            if (error) throw error;
            return { statusCode: 200, headers, body: JSON.stringify(data) };
        }

        // ---- POST: add an item (admin only) ----
        if (event.httpMethod === 'POST') {
            const { animeTitle, animeImage, animeLink, category, passcode } = JSON.parse(event.body || '{}');

            if (!process.env.ADMIN_PASSCODE || passcode !== process.env.ADMIN_PASSCODE) {
                return { statusCode: 403, headers, body: JSON.stringify({ error: 'Not authorized' }) };
            }

            if (!animeTitle || !category) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: 'animeTitle and category are required' }) };
            }

            const { data: existing, error: findError } = await supabase
                .from('watched')
                .select('id')
                .eq('anime_title', animeTitle)
                .limit(1);
            if (findError) throw findError;
            if (existing.length > 0) {
                return { statusCode: 409, headers, body: JSON.stringify({ error: 'Already marked as watched' }) };
            }

            const { data, error } = await supabase
                .from('watched')
                .insert({ anime_title: animeTitle, anime_image: animeImage || null, anime_link: animeLink || null, category })
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

            const { error } = await supabase.from('watched').delete().eq('id', id);
            if (error) throw error;
            return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
        }

        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    } catch (error) {
        console.error('Database error:', error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Something went wrong on the server.' }) };
    }
};