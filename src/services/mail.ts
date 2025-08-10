import nodemailer from "nodemailer";

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM = "Demo Shop <no-reply@demo.com>"
} = process.env as Record<string, string>;

let transporter: nodemailer.Transporter | null = null;

if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: Number(SMTP_PORT || 587) === 465, // 465->true, 587->false
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    logger: true,   // enable nodemailer internal logger
    debug: true     // enable debug output
  });
}

export async function sendMail(to: string, subject: string, html: string) {
  console.log("📨 sendMail() start → to:", to, "| subject:", subject);
  if (!transporter) {
    console.log("📧 [DEV-MAIL] (no SMTP) To:", to, "| Subject:", subject, "| HTML:", html);
    return;
  }
  try {
    // verify connection + auth
    const ok = await transporter.verify();
    console.log("✅ transporter.verify():", ok);

    const info = await transporter.sendMail({ from: SMTP_FROM, to, subject, html });
    console.log("📬 Mail sent. messageId:", info.messageId, " response:", info.response);
  } catch (err) {
    console.error("❌ SMTP send error:", err);
  } finally {
    console.log("📨 sendMail() end");
  }
}