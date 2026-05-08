import { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const enabled = process.env.PROMO_ENABLED!== 'false'
  res.status(200).json({ enabled })
}
