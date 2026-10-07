import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import nodemailer from "npm:nodemailer@6.9.10"

const GMAIL_USER = Deno.env.get("GMAIL_USER")
const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD")

// Configure Gmail SMTP transporter with SSL on port 465
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASSWORD,
  },
})

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  }

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const payload = await req.json()

    // Handle both direct invocation and Supabase Database Webhook payloads
    const record = payload.record || payload
    const role = (payload.role || (record.working_as ? "mentor" : "student")).toLowerCase()
    const recipientEmail = record.email || payload.email
    const recipientName = record.full_name || record.fullName || payload.name || "there"
    const appUrl = payload.appUrl || Deno.env.get("APP_URL") || "https://karkai.vercel.app"

    if (!recipientEmail) {
      return new Response(JSON.stringify({ error: "Missing recipient email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    let subject = ""
    let plainText = ""
    let htmlContent = ""

    if (role === "mentor") {
      subject = "Welcome to Karkai! 🤝"
      plainText = `Hi ${recipientName},\n\nWelcome to Karkai! 👋\n\nYour mentor profile has been completed and submitted successfully.\n\nOur team will review your details and verification. Once approved, you can connect with students and begin your mentoring journey.\n\nThank you for choosing to contribute your experience to the next generation. 🌱\n\nGo to Karkai: ${appUrl}\n\n— Team Karkai`

      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 36px 16px;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 36px 32px; box-shadow: 0 4px 14px rgba(15, 23, 42, 0.04);">
                  <tr>
                    <td>
                      <!-- Brand Heading -->
                      <h2 style="margin: 0 0 20px 0; color: #0f172a; font-size: 22px; font-weight: 800;">
                        Welcome to Karkai! 🤝
                      </h2>

                      <!-- Body text -->
                      <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155; line-height: 1.6;">
                        Hi ${recipientName},
                      </p>

                      <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155; line-height: 1.6;">
                        Welcome to Karkai! 👋
                      </p>

                      <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155; line-height: 1.6;">
                        Your mentor profile has been completed and submitted successfully.
                      </p>

                      <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155; line-height: 1.6;">
                        Our team will review your details and verification. Once approved, you can connect with students and begin your mentoring journey.
                      </p>

                      <p style="margin: 0 0 28px 0; font-size: 15px; color: #334155; line-height: 1.6;">
                        Thank you for choosing to contribute your experience to the next generation. 🌱
                      </p>

                      <!-- Action Button -->
                      <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 0 28px 0;">
                        <tr>
                          <td style="border-radius: 12px; background: linear-gradient(135deg, #2563eb, #1d4ed8);">
                            <a href="${appUrl}" target="_blank" style="display: inline-block; padding: 13px 26px; font-size: 14.5px; font-weight: 750; color: #ffffff; text-decoration: none; border-radius: 12px;">
                              Go to Karkai &rarr;
                            </a>
                          </td>
                        </tr>
                      </table>

                      <!-- Sign-off -->
                      <p style="margin: 0; font-size: 15px; color: #0f172a; font-weight: 700;">
                        &mdash; Team Karkai
                      </p>
                    </td>
                  </tr>
                </table>

                <!-- Footer Note -->
                <p style="margin-top: 20px; font-size: 12px; color: #94a3b8; text-align: center;">
                  Karkai Student&ndash;Mentor NGO Digital Platform
                </p>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    } else {
      subject = "Welcome to Karkai! 🌱"
      plainText = `Hi ${recipientName},\n\nWelcome to Karkai! 👋\n\nYour profile is now complete, and you’re ready to begin your Karkai journey.\n\nYou can now explore your career direction, discover mentors, and start building towards your goals.\n\nYour journey starts here. 🚀\n\nGo to Karkai: ${appUrl}\n\n— Team Karkai`

      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 36px 16px;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 36px 32px; box-shadow: 0 4px 14px rgba(15, 23, 42, 0.04);">
                  <tr>
                    <td>
                      <!-- Brand Heading -->
                      <h2 style="margin: 0 0 20px 0; color: #0f172a; font-size: 22px; font-weight: 800;">
                        Welcome to Karkai! 🌱
                      </h2>

                      <!-- Body text -->
                      <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155; line-height: 1.6;">
                        Hi ${recipientName},
                      </p>

                      <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155; line-height: 1.6;">
                        Welcome to Karkai! 👋
                      </p>

                      <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155; line-height: 1.6;">
                        Your profile is now complete, and you’re ready to begin your Karkai journey.
                      </p>

                      <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155; line-height: 1.6;">
                        You can now explore your career direction, discover mentors, and start building towards your goals.
                      </p>

                      <p style="margin: 0 0 28px 0; font-size: 15px; color: #334155; line-height: 1.6; font-weight: 600; color: #1e3a8a;">
                        Your journey starts here. 🚀
                      </p>

                      <!-- Action Button -->
                      <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 0 28px 0;">
                        <tr>
                          <td style="border-radius: 12px; background: linear-gradient(135deg, #2563eb, #1d4ed8);">
                            <a href="${appUrl}" target="_blank" style="display: inline-block; padding: 13px 26px; font-size: 14.5px; font-weight: 750; color: #ffffff; text-decoration: none; border-radius: 12px;">
                              Go to Karkai &rarr;
                            </a>
                          </td>
                        </tr>
                      </table>

                      <!-- Sign-off -->
                      <p style="margin: 0; font-size: 15px; color: #0f172a; font-weight: 700;">
                        &mdash; Team Karkai
                      </p>
                    </td>
                  </tr>
                </table>

                <!-- Footer Note -->
                <p style="margin-top: 20px; font-size: 12px; color: #94a3b8; text-align: center;">
                  Karkai Student&ndash;Mentor NGO Digital Platform
                </p>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    }

    const info = await transporter.sendMail({
      from: `"Team Karkai" <${GMAIL_USER}>`,
      to: recipientEmail,
      subject,
      text: plainText,
      html: htmlContent,
    })

    return new Response(JSON.stringify({ success: true, messageId: info.messageId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error: any) {
    console.error("Gmail SMTP error:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
