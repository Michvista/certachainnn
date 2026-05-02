require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function testEmail() {
  try {
    console.log("Testing email credentials...");
    console.log("User:", process.env.EMAIL_USER);
    console.log("Pass length:", process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : 0);
    
    await transporter.verify();
    console.log("SMTP Connection successful!");
    
    // Optional: send a test email to the same address
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: "Test Email from CertaChain",
      text: "This is a test email to verify Nodemailer works."
    });
    console.log("Test email sent:", info.messageId);
  } catch (error) {
    console.error("SMTP Error:", error);
  }
}

testEmail();
