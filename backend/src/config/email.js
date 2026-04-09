const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendOTPEmail = async (email, name, otp) => {
  const mailOptions = {
    from: `"NexSkill" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Verify Your NexSkill Account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #6366f1;">Welcome to NexSkill! 🎉</h2>
        <p>Hi <strong>${name}</strong>,</p>
        <p>Your email verification OTP is:</p>
        <div style="background:#f3f4f6; border-radius:8px; padding:20px; text-align:center; margin:20px 0;">
          <span style="font-size:36px; font-weight:bold; letter-spacing:8px; color:#6366f1;">${otp}</span>
        </div>
        <p>This OTP expires in <strong>10 minutes</strong>.</p>
        <p>If you didn't request this, ignore this email.</p>
        <hr/>
        <p style="color:#9ca3af; font-size:12px;">NexSkill — Trade Skills, Not Money</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendOTPEmail };