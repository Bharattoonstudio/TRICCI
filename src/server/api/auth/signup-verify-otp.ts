import { db } from '@/server/db/client';
import { otp_store, user, candidateProfile, employerProfile, consultantProfile, session } from '@/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
        }

          try {
              const { email, otp, role, name } = req.body;

                  if (!email || !otp || !role || !name) {
                        return res.status(400).json({ error: 'All fields are required' });
                            }

                                const otpRecord = await db.query.otp_store.findFirst({
                                      where: and(
                                              eq(otp_store.identifier, email),
                                                      eq(otp_store.otp, otp),
                                                              eq(otp_store.purpose, 'signup')
                                                                    ),
                                                                        });

                                                                            if (!otpRecord) {
                                                                                  return res.status(400).json({ error: 'Invalid or expired OTP' });
                                                                                      }

                                                                                          if (otpRecord.expires_at < new Date()) {
                                                                                                return res.status(400).json({ error: 'OTP has expired' });
                                                                                                    }
                                                                                                    
                                                                                                        const userId = crypto.randomUUID();
                                                                                                            await db.insert(user).values({
                                                                                                                  id: userId,
                                                                                                                        email,
                                                                                                                              name,
                                                                                                                                    role,
                                                                                                                                          email_verified: true,
                                                                                                                                              });
                                                                                                                                              
                                                                                                                                                  if (role === 'candidate') {
                                                                                                                                                        await db.insert(candidateProfile).values({
                                                                                                                                                                user_id: userId,
                                                                                                                                                                      });
                                                                                                                                                                          } else if (role === 'employer') {
                                                                                                                                                                                await db.insert(employerProfile).values({
                                                                                                                                                                                        user_id: userId,
                                                                                                                                                                                              });
                                                                                                                                                                                                  } else if (role === 'consultant') {
                                                                                                                                                                                                        await db.insert(consultantProfile).values({
                                                                                                                                                                                                                user_id: userId,
                                                                                                                                                                                                                      });
                                                                                                                                                                                                                          }
                                                                                                                                                                                                                          
                                                                                                                                                                                                                              const sessionToken = crypto.randomBytes(16).toString('hex');
                                                                                                                                                                                                                                  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                                                                                                                                                                                                                                  
                                                                                                                                                                                                                                      await db.insert(session).values({
                                                                                                                                                                                                                                            token: sessionToken,
                                                                                                                                                                                                                                                  user_id: userId,
                                                                                                                                                                                                                                                        expires_at: expiresAt,
                                                                                                                                                                                                                                                            });
                                                                                                                                                                                                                                                            
                                                                                                                                                                                                                                                                await db.update(otp_store).set({ verified: true }).where(eq(otp_store.id, otpRecord.id));
                                                                                                                                                                                                                                                                
                                                                                                                                                                                                                                                                    res.setHeader('Set-Cookie', `sessionToken=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`);
                                                                                                                                                                                                                                                                    
                                                                                                                                                                                                                                                                        console.log('[SIGNUP-VERIFY-OTP] User created:', userId);
                                                                                                                                                                                                                                                                        
                                                                                                                                                                                                                                                                            return res.status(200).json({
                                                                                                                                                                                                                                                                                  success: true,
                                                                                                                                                                                                                                                                                        message: 'Account created successfully',
                                                                                                                                                                                                                                                                                              userId,
                                                                                                                                                                                                                                                                                                    email,
                                                                                                                                                                                                                                                                                                          role,
                                                                                                                                                                                                                                                                                                                sessionToken,
                                                                                                                                                                                                                                                                                                                    });
                                                                                                                                                                                                                                                                                                                      } catch (error) {
                                                                                                                                                                                                                                                                                                                          console.error('[SIGNUP-VERIFY-OTP] Error:', error);
                                                                                                                                                                                                                                                                                                                              return res.status(500).json({ error: 'Failed to verify OTP' });
                                                                                                                                                                                                                                                                                                                                }
                                                                                                                                                                                                                                                                                                                                }
