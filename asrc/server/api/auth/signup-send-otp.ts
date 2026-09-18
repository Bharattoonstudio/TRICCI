import { db } from '@/server/db/client';
import { otp_store, user } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import type { NextApiRequest, NextApiResponse } from 'next';
import { validateEmail, sanitizeInput } from '@/lib/validation';
import { sendOtpEmail } from '@/server/email';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
        }

          try {
              const { email, role } = req.body;

                  if (!email || !role) {
                        return res.status(400).json({ error: 'Email and role are required' });
                            }

                                const sanitizedEmail = sanitizeInput(email).toLowerCase();
                                    if (!validateEmail(sanitizedEmail)) {
                                          return res.status(400).json({ error: 'Invalid email' });
                                              }

                                                  const validRoles = ['employer', 'consultant', 'candidate'];
                                                      if (!validRoles.includes(role)) {
                                                            return res.status(400).json({ error: 'Invalid role' });
                                                                }

                                                                    const existingUser = await db.query.user.findFirst({
                                                                          where: eq(user.email, sanitizedEmail),
                                                                              });

                                                                                  if (existingUser) {
                                                                                        return res.status(400).json({ error: 'Email already registered' });
                                                                                            }

                                                                                                const otp = Math.floor(100000 + Math.random() * 900000).toString();
                                                                                                    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
                                                                                                    
                                                                                                        await db.insert(otp_store).values({
                                                                                                              identifier: sanitizedEmail,
                                                                                                                    otp,
                                                                                                                          purpose: 'signup',
                                                                                                                                expires_at: expiresAt,
                                                                                                                                      verified: false,
                                                                                                                                          });
                                                                                                                                          
                                                                                                                                              await sendOtpEmail(sanitizedEmail, otp, 'signup');
                                                                                                                                              
                                                                                                                                                  console.log('[SIGNUP-SEND-OTP] OTP sent to', sanitizedEmail);
                                                                                                                                                  
                                                                                                                                                      return res.status(200).json({
                                                                                                                                                            success: true,
                                                                                                                                                                  message: 'OTP sent to email',
                                                                                                                                                                        email: sanitizedEmail,
                                                                                                                                                                            });
                                                                                                                                                                              } catch (error) {
                                                                                                                                                                                  console.error('[SIGNUP-SEND-OTP] Error:', error);
                                                                                                                                                                                      return res.status(500).json({ error: 'Failed to send OTP' });
                                                                                                                                                                                        }
                                                                                                                                                                                        }
