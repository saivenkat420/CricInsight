const FREE_LEAGUE_IDS = [3, 5, 10]

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const token = process.env.SPORTMONKS_API_TOKEN
  if (!token) return res.status(500).json({error: 'API not configured'})

  try {
    const url = `https://cricket.sportmonks.com/api/v2.0/leagues?api_token=${token}`
    const response = await fetch(url)
    const data = await response.json()

    if (!response.ok) {
      const msg =
        data?.message?.message ||
        data?.message ||
        data?.error ||
        'Failed to fetch leagues'
      return res
        .status(response.status)
        .json({error: typeof msg === 'string' ? msg : JSON.stringify(msg)})
    }

    if (data.data) {
      data.data = data.data.filter(l => FREE_LEAGUE_IDS.includes(l.id))
    }

    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate')
    return res.status(200).json(data)
  } catch (err) {
    console.error('Leagues fetch error:', err)
    return res
      .status(500)
      .json({error: err.message || 'Failed to fetch leagues'})
  }
}
