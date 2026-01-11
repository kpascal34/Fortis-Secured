/**
 * Serverless function to send staff invite emails via AWS SES
 */

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, inviteCode, signupUrl } = req.body;

    if (!email || !inviteCode || !signupUrl) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // AWS SES configuration
    const AWS_REGION = process.env.AWS_SES_REGION || 'eu-north-1';
    const FROM_EMAIL = process.env.AWS_SES_FROM_EMAIL;
    const ACCESS_KEY = process.env.AWS_SES_ACCESS_KEY_ID;
    const SECRET_KEY = process.env.AWS_SES_SECRET_ACCESS_KEY;

    if (!FROM_EMAIL || !ACCESS_KEY || !SECRET_KEY) {
      console.error('AWS SES credentials not configured');
      return res.status(500).json({ error: 'Email service not configured' });
    }

    // Create AWS SES client
    const { SESClient, SendEmailCommand } = await import('@aws-sdk/client-ses');
    
    const sesClient = new SESClient({
      region: AWS_REGION,
      credentials: {
        accessKeyId: ACCESS_KEY,
        secretAccessKey: SECRET_KEY,
      },
    });

    // Email content
    const subject = 'Your Fortis Secured Staff Invitation';
    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #06b6d4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
            .code { background: #e2e8f0; padding: 15px; border-radius: 6px; font-family: monospace; font-size: 18px; text-align: center; margin: 20px 0; }
            .footer { text-align: center; color: #64748b; font-size: 14px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Welcome to Fortis Secured</h1>
              <p style="margin: 10px 0 0;">Your staff onboarding invitation</p>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>You've been invited to join Fortis Secured as a staff member. To complete your registration and begin the onboarding process, please use the link below:</p>
              
              <div style="text-align: center;">
                <a href="${signupUrl}" class="button">Complete Your Registration</a>
              </div>

              <p>Alternatively, you can use this invite code:</p>
              <div class="code">${inviteCode}</div>

              <p><strong>What's next?</strong></p>
              <ol>
                <li>Click the button above or visit the signup page</li>
                <li>Enter your invite code</li>
                <li>Create your account</li>
                <li>Complete the BS7858 compliance wizard</li>
              </ol>

              <p><strong>Important:</strong> This invite link will expire in 30 days.</p>

              <div class="footer">
                <p>If you didn't expect this invitation, you can safely ignore this email.</p>
                <p>&copy; ${new Date().getFullYear()} Fortis Secured. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const textBody = `
Welcome to Fortis Secured

You've been invited to join Fortis Secured as a staff member.

Your invite code: ${inviteCode}

To complete your registration, visit:
${signupUrl}

What's next:
1. Visit the signup page
2. Enter your invite code
3. Create your account
4. Complete the BS7858 compliance wizard

This invite link will expire in 30 days.

If you didn't expect this invitation, you can safely ignore this email.

© ${new Date().getFullYear()} Fortis Secured. All rights reserved.
    `;

    // Send email
    const command = new SendEmailCommand({
      Source: FROM_EMAIL,
      Destination: {
        ToAddresses: [email],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: htmlBody,
            Charset: 'UTF-8',
          },
          Text: {
            Data: textBody,
            Charset: 'UTF-8',
          },
        },
      },
    });

    const response = await sesClient.send(command);
    
    console.log('Email sent successfully:', response.MessageId);
    
    return res.status(200).json({ 
      success: true, 
      messageId: response.MessageId 
    });

  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({ 
      error: 'Failed to send email',
      details: error.message 
    });
  }
}
