import { createOtp } from '@/server/lib/otp';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    console.log('[SEND-OTP] Received request for email: ${email}');

    const otp = await createOtp(email);
    if (!otp) {
      console.error('[SEND-OTP] Failed to generate OTP for ${email}');
      return res.status(500).json({ message: 'Failed to generate OTP' });
    }

    console.log('[SEND-OTP] Generated OTP for ${email}: ${otp}');
    
    return res.status(200).json({ 
      success: true, 
      message: 'OTP sent to email',
      testOtp: otp
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[SEND-OTP] Exception:', { message: errorMsg, error: error });
    return res.status(500).json({ message: 'Server error' });
  }
}