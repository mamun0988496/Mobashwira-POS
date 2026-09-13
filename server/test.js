const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,          // 👈 পোর্ট চেঞ্জ করে 587 দেওয়া হলো
  secure: false,      // 👈 587 পোর্টের জন্য এটা false রাখতে হয়
  auth: {
    user: 'mdmamun361ml@gmail.com', 
    pass: 'dmwcxnglwhiewtgm' 
  }
});

const mailOptions = {
  from: 'mdmamun361ml@gmail.com',
  to: 'mdmamun584956@gmail.com', 
  subject: 'Test Email 🚀',
  text: 'এই মেইলটি গেলে বুঝতে হবে পোর্ট 587 কাজ করছে!'
};

console.log("পোর্ট 587 দিয়ে মেইল পাঠানোর চেষ্টা করা হচ্ছে...");

transporter.sendMail(mailOptions, function(error, info){
  if (error) {
    console.log("❌ আবার সমস্যা হয়েছে:");
    console.log(error);
  } else {
    console.log("✅ মেইল সফলভাবে পাঠানো হয়েছে!", info.response);
  }
});