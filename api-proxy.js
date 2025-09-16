const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

exports.handler = async (event) => {
    const { targetUrl } = event.queryStringParameters;

    if (!targetUrl) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Target URL is required' }),
        };
    }

    const url = new URL(targetUrl);
    let options = {
        method: 'GET',
        headers: {},
    };

    // أضف مفتاح الـ API الصحيح بناءً على الرابط المستهدف
    if (url.hostname === 'v3.football.api-sports.io') {
        options.headers['x-rapidapi-key'] = process.env.FOOTBALL_API_KEY;
        options.headers['x-rapidapi-host'] = 'v3.football.api-sports.io';
    } else if (url.hostname === 'newsdata.io') {
        // مفتاح newsdata.io يضاف إلى الرابط، لذلك سنضيفه هنا بأمان
        url.searchParams.append('apikey', process.env.NEWSDATA_API_KEY);
    } else {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Unsupported API host' }),
        };
    }

    try {
        const response = await fetch(url.toString(), options);
        const data = await response.json();

        return {
            statusCode: response.status,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*', // أو رابط موقعك للزيادة في الأمان
            },
            body: JSON.stringify(data),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch data from the target API', details: error.message }),
        };
    }
};