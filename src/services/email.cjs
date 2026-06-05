const { Resend } = require("resend")

const resend = new Resend(process.env.RESEND_API_KEY)

async function sendVerificationEmail(email, token) {
  const verifyUrl =
    `${process.env.BASE_URL}/verify-email?token=${token}`

  await resend.emails.send({
    from: "onboarding@resend.dev",
    to: email,
    subject: "Verify your email",
    html: `<h2>Verify your email</h2><a href="${verifyUrl}">Verify Email</a>`,
  })
}

module.exports = { sendVerificationEmail }