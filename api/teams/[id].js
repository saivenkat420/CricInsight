export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const token = process.env.SPORTMONKS_API_TOKEN
  if (!token) return res.status(500).json({error: 'API not configured'})

  const {id} = req.query
  if (!id) {
    return res.status(400).json({error: 'Team ID is required'})
  }

  try {
    const url = `https://cricket.sportmonks.com/api/v2.0/teams/${id}?api_token=${token}&include=squad`
    const response = await fetch(url)

    if (!response.ok) {
      const errorText = await response.text()
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = {error: errorText || 'Failed to fetch team'}
      }
      const msg =
        errorData?.message?.message ||
        errorData?.message ||
        errorData?.error ||
        'Failed to fetch team'
      return res
        .status(response.status)
        .json({error: typeof msg === 'string' ? msg : JSON.stringify(msg)})
    }

    const data = await response.json()
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate')
    return res.status(200).json(data)
  } catch (err) {
    console.error('Team fetch error:', err)
    return res.status(500).json({error: err.message || 'Failed to fetch team'})
  }
}
