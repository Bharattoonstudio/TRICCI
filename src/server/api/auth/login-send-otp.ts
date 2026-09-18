import { db } from '@/server/db/client';
import { otp_store, user } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
        }

          try {
              const { email } = req.body;

                  if (!email) {
                        return res.status(400).json({ error: 'Email is required' });
                            }

                                // Check if user exists
                                    const existingUser = await db.query.user.findFirst({
                                          where: eq(user.email, email),
                                              });

                                                  if (!existingUser) {
                                                        return res.status(400).json({ error: 'User not found' });
                                                            }

                                                                // Generate 6-digit OTP
                                                                    const otp = Math.floor(100000 + Math.random() * 900000).toString();

                                                                        // OTP expires in 10 minutes
                                                                            const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

                                                                                // Store OTP in database
                                                                                    await db.insert(otp_store).values({
                                                                                          identifier: email,
                                                                                                otp,
                                                                                                      purpose: 'login',
                                                                                                            expires_at: expiresAt,
                                                                                                                });
                                                                                                                
                                                                                                                    // TODO: Send email via Brevo
                                                                                                                        // For now, just log the OTP
                                                                                                                            console.log(`[LOGIN-SEND-OTP] OTP for ${email}: ${otp}`);
                                                                                                                            
                                                                                                                                res.status(200).json({
                                                                                                                                      success: true,
                                                                                                                                            message: 'OTP sent to email',
                                                                                                                                                  email,
                                                                                                                                                      });
                                                                                                                                                        } catch (error) {
                                                                                                                                                            console.error('[LOGIN-SEND-OTP] Error:', error);
                                                                                                                                                                return res.status(500).json({ error: 'Failed to send OTP' });
                                                                                                                                                                  }
                                                                                                                                                                  }
