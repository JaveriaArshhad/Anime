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

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    let db;

    try {
        db = await getConnection();

        // ---- GET: return every recommendation, grouped isn't needed here;
        // the frontend groups them by user_name itself ----
        if (event.httpMethod === 'GET') {
            const [rows] = await db.query(
                'SELECT id, user_name, anime_title, anime_image, anime_link, created_at FROM recommendations ORDER BY created_at ASC'
            );
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(rows),
            };
        }

        // ---- POST: add a new recommendation ----
        if (event.httpMethod === 'POST') {
            const body = JSON.parse(event.body || '{}');
            const { userName, animeTitle, animeImage, animeLink, website } = body;

            // Honeypot: real users never see or fill this field. A bot that
            // fills every field in the form will trip this, so we quietly
            // pretend it succeeded without actually writing anything.
            if (website) {
                return { statusCode: 201, headers, body: JSON.stringify({ id: 0 }) };
            }

            if (!userName || !animeTitle) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'userName and animeTitle are required' }),
                };
            }

            if (userName.length > 100 || animeTitle.length > 255) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Input too long' }),
                };
            }

            const ip = event.headers['x-nf-client-connection-ip']
                || event.headers['client-ip']
                || (event.headers['x-forwarded-for'] || '').split(',')[0].trim()
                || 'unknown';

            const [result] = await db.query(
                'INSERT INTO recommendations (user_name, anime_title, anime_image, anime_link, ip_address) VALUES (?, ?, ?, ?, ?)',
                [userName, animeTitle, animeImage || null, animeLink || null, ip]
            );

            return {
                statusCode: 201,
                headers,
                body: JSON.stringify({ id: result.insertId }),
            };
        }

        // ---- DELETE: remove a single recommendation by id (admin only) ----
        if (event.httpMethod === 'DELETE') {
            const body = JSON.parse(event.body || '{}');
            const { id, passcode } = body;

            if (!process.env.ADMIN_PASSCODE || passcode !== process.env.ADMIN_PASSCODE) {
                return {
                    statusCode: 403,
                    headers,
                    body: JSON.stringify({ error: 'Not authorized' }),
                };
            }

            if (!id) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'id is required' }),
                };
            }

            await db.query('DELETE FROM recommendations WHERE id = ?', [id]);

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true }),
            };
        }

        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    } catch (error) {
        console.error('Database error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Something went wrong on the server.' }),
        };
    } finally {
        if (db) await db.end();
    }
};t