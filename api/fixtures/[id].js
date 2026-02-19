export default async function handler(req, res) {
  if (req.method !== 'GET')
    return res.status(405).json({error: 'Method not allowed'})
  const token = process.env.SPORTMONKS_API_TOKEN
  if (!token) return res.status(500).json({error: 'API not configured'})

  const {id} = req.query
  if (!id) return res.status(400).json({error: 'Fixture ID is required'})

  const richIncludes =
    'venue,league,visitorteam,localteam,runs,batting,bowling,balls,lineup,firstumpire,secondumpire,manofmatch,tosswon,batting.batsman,bowling.player,balls.batsman,balls.bowler'
  const minimalIncludes =
    'venue,league,visitorteam,localteam,runs,batting,bowling,lineup,firstumpire,secondumpire,manofmatch,tosswon'

  try {
    const richUrl = `https://cricket.sportmonks.com/api/v2.0/fixtures/${id}?api_token=${token}&include=${richIncludes}`
    const response = await fetch(richUrl)
    const data = await response.json()

    if (response.ok && data?.status !== 'error') {
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate')
      return res.status(200).json(data)
    }

    // Rich includes failed — retry with base includes
    const minUrl = `https://cricket.sportmonks.com/api/v2.0/fixtures/${id}?api_token=${token}&include=${minimalIncludes}`
    const response2 = await fetch(minUrl)
    const data2 = await response2.json()

    if (!response2.ok) {
      const msg =
        data2?.message?.message ||
        data2?.message ||
        data2?.error ||
        'Fixture not found'
      return res
        .status(response2.status)
        .json({error: typeof msg === 'string' ? msg : JSON.stringify(msg)})
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate')
    return res.status(200).json(data2)
  } catch (err) {
    console.error('Fixture fetch error:', err)
    return res
      .status(500)
      .json({error: err.message || 'Failed to fetch fixture'})
  }
}
