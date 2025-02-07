const Mailjet = require('node-mailjet');
const mailjet = Mailjet.apiConnect(process.env.MJ_APIKEY_PUBLIC, process.env.MJ_APIKEY_PRIVATE);

async function sendVerificationEmail(email, username, email) {
    const request = mailjet.post("send", { 'version': 'v3.1' }).request({
        "Messages": [{
            "From": {
                "Email": "no-reply@tandemapp.xyz",
                "Name": "Nacho, Fundador de Tandem"
            },
            "To": [{
                "Email": email,
                "Name": username
            }],
            "Subject": "Email Verification",
            "TextPart": "Please verify your email by clicking the link below.",
            "HTMLPart": `
                <div style="background-color: #1a2332; color: #d4dbdc; padding: 20px; font-family: Arial, sans-serif;">
                    <h3 style="color: #00ff9c;">Dear ${username},</h3>
                    <p>Please verify your email by clicking the link below:</p>
                    <a href="http://tandemapp.xyz/api/auth/verify?email=${email}" style="color: #00ff9c;">Verify Email</a>
                    <p>Thank you!</p>
                </div>`
        }]
    });

    try {
        const result = await request;
        console.log('Mailjet response:', result.body);
    } catch (err) {
        console.error('Mailjet error:', err.statusCode, err.response.text);
    }
}

module.exports = { sendVerificationEmail };
