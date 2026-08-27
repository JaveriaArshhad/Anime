const mysql = require('mysql2/promise');

// Reuse the connection across warm invocations when possible
let pool;
function getPool() {
    if (!pool) {
        pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            waitForConnections: true,
            connectionLimit: 3,
            queueLimit: 0,
        });
    }
    return pool;
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

    const db = getPool();

    try {
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
            const { userName, animeTitle, animeImage, animeLink } = body;

            if (!userName || !animeTitle) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'userName and animeTitle are required' }),
                };
            }

            // Prevent the exact same person from adding the exact same anime twice
            const [existing] = await db.query(
                'SELECT id FROM recommendations WHERE user_name = ? AND anime_title = ? LIMIT 1',
                [userName, animeTitle]
            );
            if (existing.length > 0) {
                return {
                    statusCode: 409,
                    headers,
                    body: JSON.stringify({ error: 'This anime is already on that user\'s list' }),
                };
            }

            const [result] = await db.query(
                'INSERT INTO recommendations (user_name, anime_title, anime_image, anime_link) VALUES (?, ?, ?, ?)',
                [userName, animeTitle, animeImage || null, animeLink || null]
            );

            return {
                statusCode: 201,
                headers,
                body: JSON.stringify({ id: result.insertId }),
            };
        }

        // ---- DELETE: remove a single recommendation by id ----
        if (event.httpMethod === 'DELETE') {
            const body = JSON.parse(event.body || '{}');
            const { id } = body;

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
    }
};