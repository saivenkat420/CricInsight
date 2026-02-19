export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const token = process.env.SPORTMONKS_API_TOKEN
  if (!token) return res.status(500).json({error: 'API not configured'})

  try {
    const url = `https://cricket.sportmonks.com/api/v2.0/livescores?api_token=${token}&include=localteam,visitorteam,venue,runs`
    const response = await fetch(url)
    const data = await response.json()

    if (!response.ok) {
      const msg =
        data?.message?.message ||
        data?.message ||
        data?.error ||
        'Failed to fetch live scores'
      return res
        .status(response.status)
        .json({error: typeof msg === 'string' ? msg : JSON.stringify(msg)})
    }

    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate')
    return res.status(200).json(data)
  } catch (err) {
    console.error('Live fetch error:', err)
    return res
      .status(500)
      .json({error: err.message || 'Failed to fetch live scores'})
  }
}
