import { supabase } from "../supabaseClient";

export const TeamLeadNotify = (leadName, leadUnits, email, phone, company, notes) => {
    const teamSubject = "You have a New Lease Link Lead";
    const teamEmails = ["jtaylor@leaselink.ai", "tgrace@leaselink.ai"];

    const body = `
  <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto;">
    <h1 style="color: #1a73e8;">You Have a New Lead</h1>
    <h2 style="color: #444; font-weight: normal;">Call as quick as you can. Email has been sent.</h2>

    <div style="margin-bottom: 12px;">
      <strong>Name:</strong><br/>
      <span>${leadName || ""}</span>
    </div>

    <div style="margin-bottom: 12px;">
      <strong>Company:</strong><br/>
      <span>${company || ""}</span>
    </div>

    <div style="margin-bottom: 12px;">
      <strong>Email:</strong><br/>
      <span>${email || ""}</span>
    </div>

    <div style="margin-bottom: 12px;">
      <strong>Phone:</strong><br/>
      <span>${phone || ""}</span>
    </div>

    <div style="margin-bottom: 12px;">
      <strong>Number of Units:</strong><br/>
      <span>${leadUnits || ""}</span>
    </div>

    <div style="margin-bottom: 12px;">
      <strong>Notes:</strong><br/>
      <span>${notes || ""}</span>
    </div>
  </div>
  `;


        const { error } = supabase.functions.invoke('send-email', {
            body: {
            emailto: teamEmails,
            emailsubject: teamSubject,
            emailbody: body
            }
        })
        if (error) {
            console.log("Error Sending Team Notify Email")
        }
    

};
export const EmailNewLead = (leadName, leadUnits, email, company) => {
    let subject;
    let body;
    if (leadUnits >= 100) {
        subject = "We’ll Be in Touch Soon";

        body = `
  <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; line-height: 1.6;">
    <p>Dear ${leadName || "there"},</p>

    <p>Thank you for your interest in <strong>Lease Link</strong> for ${company}. Our team will be reaching out to you shortly to learn more about your needs and answer any questions you may have.</p>

    <p>If you’d like to schedule a time that works best for you, you can book a call directly using the link below:</p>

    <p>
      <a href="https://calendly.com/jtaylor-leaselink" 
         style="display: inline-block; padding: 10px 20px; background-color: #1a73e8; color: #fff; text-decoration: none; border-radius: 4px;">
        📅 Book a Call Now
      </a>
    </p>

    <p>We look forward to connecting with you soon.</p>

    <p>Best regards,<br/>The Lease Link Team</p>
  </div>
`;
    }
    else {
        subject = "Thank You for Your Interest";

        body = `
  <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; line-height: 1.6;">
    <p>Dear ${leadName || "there"},</p>

    <p>Thank you for your interest in <strong>Lease Link</strong>. At this time, we are only accepting companies that manage <strong>100 or more units</strong>.</p>

    <p>We encourage you to stay connected with us, as this requirement may change in the future. If you believe we made a mistake regarding your company’s qualifications, please don’t hesitate to reach out:</p>

    <ul>
      <li>Email: <a href="mailto:tgrace@leaselink.ai">tgrace@leaselink.ai</a></li>
      <li>Email: <a href="mailto:jtaylor@leaselink.ai">jtaylor@leaselink.ai</a></li>
    </ul>

    <p>We appreciate your understanding and look forward to the possibility of working together down the road.</p>

    <p>Best regards,<br/>The Lease Link Team</p>
  </div>
`;
    }
    const { error } = supabase.functions.invoke('send-email', {
        body: {
        emailto: email,
        emailsubject: subject,
        emailbody: body
        }
    })
    if (error) {
        console.log("Error Sending Team Notify Email")
    }
}
