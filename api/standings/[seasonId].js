export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const token = process.env.SPORTMONKS_API_TOKEN
  if (!token) return res.status(500).json({error: 'API not configured'})

  let {seasonId} = req.query
  if (!seasonId && req.url) {
    const match = req.url.match(/\/api\/standings\/([^/?]+)/)
    if (match) seasonId = match[1]
  }
  if (!seasonId) return res.status(400).json({error: 'seasonId required'})

  try {
    const url = `https://cricket.sportmonks.com/api/v2.0/standings/season/${seasonId}?api_token=${token}&include=team`
    const response = await fetch(url)

    if (!response.ok) {
      const errorText = await response.text()
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = {error: errorText || 'Failed to fetch standings'}
      }
      const msg =
        errorData?.message?.message ||
        errorData?.message ||
        errorData?.error ||
        'Failed to fetch standings'
      return res
        .status(response.status)
        .json({error: typeof msg === 'string' ? msg : JSON.stringify(msg)})
    }

    const data = await response.json()
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate')
    return res.status(200).json(data)
  } catch (err) {
    console.error('Standings fetch error:', err)
    return res
      .status(500)
      .json({error: err.message || 'Failed to fetch standings'})
  }
}
