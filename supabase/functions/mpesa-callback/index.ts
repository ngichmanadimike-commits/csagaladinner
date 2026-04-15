// M-PESA Callback Handler

import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const paymentData = req.body;

        // Process payment confirmation
        console.log('Payment Confirmation:', paymentData);

        // TODO: Add logic to save confirmation to database

        return res.status(200).json({ message: 'Payment confirmation received' });
    } catch (error) {
        console.error('Error processing payment confirmation:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}