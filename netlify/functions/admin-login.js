exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    try {
        const { passcode } = JSON.parse(event.body || '{}');

        if (!process.env.ADMIN_PASSCODE) {
            console.error('ADMIN_PASSCODE environment variable is not set!');
            return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server not configured' }) };
        }

        if (passcode === process.env.ADMIN_PASSCODE) {
            return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
        }

        return { statusCode: 401, headers, body: JSON.stringify({ error: 'Incorrect passcode' }) };
    } catch (error) {
        console.error('Admin login error:', error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Something went wrong' }) };
    }
};