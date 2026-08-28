const mysql = require('mysql2/promise');

async function getConnection() {
    return mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });
}

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    let db;

    try {
        db = await getConnection();

        // ---- GET: anyone can view ----
        if (event.httpMethod === 'GET') {
            const [rows] = await db.query(
                'SELECT id, anime_title, anime_image, anime_link, category, created_at FROM watched ORDER BY category ASC, created_at ASC'
            );
            return { statusCode: 200, headers, body: JSON.stringify(rows) };
        }

        // ---- POST: add an item (admin only) ----
        if (event.httpMethod === 'POST') {
            const body = JSON.parse(event.body || '{}');
            const { animeTitle, animeImage, animeLink, category, passcode } = body;

            if (!process.env.ADMIN_PASSCODE || passcode !== process.env.ADMIN_PASSCODE) {
                return { statusCode: 403, headers, body: JSON.stringify({ error: 'Not authorized' }) };
            }

            if (!animeTitle || !category) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: 'animeTitle and category are required' }) };
            }

            const [existing] = await db.query(
                'SELECT id FROM watched WHERE anime_title = ? LIMIT 1',
                [animeTitle]
            );
            if (existing.length > 0) {
                return { statusCode: 409, headers, body: JSON.stringify({ error: 'Already marked as watched' }) };
            }

            const [result] = await db.query(
                'INSERT INTO watched (anime_title, anime_image, anime_link, category) VALUES (?, ?, ?, ?)',
                [animeTitle, animeImage || null, animeLink || null, category]
            );

            return { statusCode: 201, headers, body: JSON.stringify({ id: result.insertId }) };
        }

        // ---- DELETE: remove an item (admin only) ----
        if (event.httpMethod === 'DELETE') {
            const body = JSON.parse(event.body || '{}');
            const { id, passcode } = body;

            if (!process.env.ADMIN_PASSCODE || passcode !== process.env.ADMIN_PASSCODE) {
                return { statusCode: 403, headers, body: JSON.stringify({ error: 'Not authorized' }) };
            }

            if (!id) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: 'id is required' }) };
            }

            await db.query('DELETE FROM watched WHERE id = ?', [id]);
            return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
        }

        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    } catch (error) {
        console.error('Database error:', error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Something went wrong on the server.' }) };
    } finally {
        if (db) await db.end();
    }
};