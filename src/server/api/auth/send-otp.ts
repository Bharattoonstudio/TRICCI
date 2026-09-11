import { createOtp, sendOtpEmail } from '@/server/lib/otp.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const otp = await createOtp(email);
    if (!otp) {
      return res.status(500).json({ message: 'Failed to generate OTP' });
    }

    const emailSent = await sendOtpEmail(email, otp);
    if (!emailSent) {
      return res.status(500).json({ message: 'Failed to send email' });
    }

    return res.status(200).json({ success: true, message: 'OTP sent to email' });
  } catch (error) {
    console.error('Send OTP error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}
