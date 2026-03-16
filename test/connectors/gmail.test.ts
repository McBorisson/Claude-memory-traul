import { describe, test, expect } from "bun:test";
import { htmlToText } from "html-to-text";

// Mirror the extractBody logic from src/connectors/gmail.ts
function extractBodyFromHtml(html: string): string {
  return htmlToText(html, {
    wordwrap: false,
    selectors: [
      { selector: "img", format: "skip" },
      { selector: "a", options: { ignoreHref: true } },
    ],
  });
}

// Synthetic email fixtures mimicking real-world patterns
const fixtures: { name: string; html: string; expectedKeywords: string[] }[] = [
  {
    name: "ATS application confirmation (Greenhouse-style)",
    html: `
      <html><body>
        <img src="https://cdn.greenhouse.io/img/logo-abc123.png" width="600" />
        <table><tr><td>
          <p>Hi Candidate,</p>
          <p>Thanks for applying to <strong>Senior Product Manager</strong> at <strong>Acme Corp</strong>!</p>
          <p>We're thrilled you'd consider joining us, and wanted to confirm that we have received your application.</p>
          <p>Our recruiting team will review your profile and get back to you shortly.</p>
          <p>In the meantime, learn more about us:</p>
          <a href="https://tracking.greenhouse-mail.io/r/abc123/def456/ghi789?utm_source=greenhouse&utm_campaign=confirmation&utm_medium=email&utm_id=9876543">Visit our careers page</a>
          <br/>
          <a href="https://tracking.greenhouse-mail.io/r/abc123/xyz999?utm_source=greenhouse&utm_campaign=confirmation&utm_medium=email">Follow us on LinkedIn</a>
          <p style="color:#999;font-size:11px;">
            This email was sent by Acme Corp via Greenhouse.
            <a href="https://tracking.greenhouse-mail.io/unsubscribe/abc123/preferences?token=eyJhbGciOiJIUzI1NiJ9.abc123.def456">Unsubscribe</a>
          </p>
        </td></tr></table>
      </body></html>
    `,
    expectedKeywords: ["applying", "Senior Product Manager", "Acme Corp", "recruiting team", "review your profile"],
  },
  {
    name: "Recruiter outreach (HTML rich)",
    html: `
      <html><body>
        <div style="max-width:600px;margin:0 auto;">
          <img src="https://ci3.googleusercontent.com/proxy/abc123/image.png" />
          <p>Hi there,</p>
          <p>I came across your profile and was impressed by your experience in product management.</p>
          <p>We're currently looking for a <b>Head of Product</b> to lead our platform team at <b>TechStartup Inc</b>.</p>
          <p>The role involves:</p>
          <ul>
            <li>Leading a team of 8 product managers</li>
            <li>Defining product strategy for our developer platform</li>
            <li>Working closely with engineering leadership</li>
          </ul>
          <p>Would you be open to a quick chat this week?</p>
          <p>Best regards,<br/>Jane Smith<br/>Senior Recruiter</p>
          <img src="https://mail.google.com/mail/tracking/open?id=abc123&token=def456" width="1" height="1" />
        </div>
      </body></html>
    `,
    expectedKeywords: ["profile", "Head of Product", "platform team", "product managers", "recruiter"],
  },
  {
    name: "Application rejection (ATS automated)",
    html: `
      <html><body>
        <table width="100%" bgcolor="#f5f5f5"><tr><td>
          <table width="600" align="center" bgcolor="#ffffff"><tr><td>
            <img src="https://cdn.lever.co/img/company-logo-abc123.png" />
            <h2>Update on your application</h2>
            <p>Dear Candidate,</p>
            <p>Thank you for your interest in the <strong>Senior PM, Platform</strong> position at <strong>BigTech Co</strong>.</p>
            <p>After careful consideration, we have decided to move forward with other candidates whose experience more closely aligns with our current needs.</p>
            <p>We encourage you to apply for future openings that match your skills.</p>
            <p>Sincerely,<br/>The BigTech Co Recruiting Team</p>
            <hr/>
            <p style="font-size:11px;color:#999;">
              <a href="https://jobs.lever.co/bigtech/unsubscribe?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.abc.def">Unsubscribe</a> |
              <a href="https://jobs.lever.co/bigtech/privacy">Privacy Policy</a> |
              BigTech Co, 123 Innovation Way, San Francisco, CA 94105
            </p>
          </td></tr></table>
        </td></tr></table>
      </body></html>
    `,
    expectedKeywords: ["application", "Senior PM", "move forward with other candidates", "future openings"],
  },
  {
    name: "Marketing newsletter with heavy tracking",
    html: `
      <html><body>
        <div>
          <!-- preheader -->
          <span style="display:none;max-height:0;overflow:hidden;">Your weekly job market update &#847; &#847; &#847; &#847; &#847; &#847;</span>
          <img src="https://img.mailinblue.com/3161638/images/content_library/original/header-banner.png" />
          <table>
            <tr><td>
              <a href="https://9sh28qce.r.us-east-1.awstrack.me/L0/https:%2F%2Fjobsite.com%2F%3Futm_source=brevo%26utm_campaign=Weekly%2520Email%26utm_medium=email%26utm_id=487/1/0100abc-def-ghi/tracking123=456">
                <img src="https://img.mailinblue.com/3161638/images/content_library/original/cta-button.png" alt="View Jobs" />
              </a>
            </td></tr>
            <tr><td>
              <h1>This week in hiring</h1>
              <p>Remote hiring is more competitive than ever: 9 out of 10 applicants are automatically rejected by ATS systems.</p>
              <p>Here are 3 tips to stand out:</p>
              <ol>
                <li>Tailor your resume to each job description</li>
                <li>Use keywords from the posting</li>
                <li>Follow up within 48 hours</li>
              </ol>
              <a href="https://9sh28qce.r.us-east-1.awstrack.me/L0/https:%2F%2Fjobsite.com%2Fblog%2Ftips%3Futm_source=brevo%26utm_campaign=Weekly/2/0100abc/tracking789">Read more on our blog</a>
            </td></tr>
          </table>
          <table><tr><td style="font-size:11px;color:#999;">
            <a href="https://creative-assets.mailinblue.com/editor/social-icons/rounded_colored/twitter_32px.png">Twitter</a>
            <a href="https://creative-assets.mailinblue.com/editor/social-icons/rounded_colored/linkedin_32px.png">LinkedIn</a>
            <a href="https://creative-assets.mailinblue.com/editor/social-icons/rounded_colored/facebook_32px.png">Facebook</a>
            <br/>
            <a href="https://9sh28qce.r.us-east-1.awstrack.me/unsubscribe/abc123">Unsubscribe</a> |
            <a href="https://jobsite.com/privacy">Privacy</a>
          </td></tr></table>
        </div>
      </body></html>
    `,
    expectedKeywords: ["hiring", "competitive", "ATS", "resume", "keywords", "follow up"],
  },
  {
    name: "Google Calendar invite",
    html: `
      <html><body>
        <table><tr><td>
          <img src="https://ssl.gstatic.com/calendar/images/dynamiclogo_2020q4/calendar_31_2x.png" />
          <h3>user@example.com has accepted the following invitation.</h3>
          <table>
            <tr><td><b>Product Strategy Review</b></td></tr>
            <tr><td>Monday Mar 15, 2026 &#8901; 10:00 – 11:00 (GMT)</td></tr>
            <tr><td>Google Meet: <a href="https://meet.google.com/abc-defg-hij">https://meet.google.com/abc-defg-hij</a></td></tr>
          </table>
          <a href="https://calendar.google.com/calendar/event?action=VIEW&eid=abc123&tok=MjQ&ctz=Europe%2FLisbon&hl=en&cal=vlad@example.com" style="background:#1a73e8;color:white;padding:8px 16px;">View event</a>
          <p style="color:#999;font-size:11px;">
            You are receiving this email at the account vlad@example.com because you are subscribed to receive invitation replies for this event.
            <br/><a href="https://calendar.google.com/calendar/optout?eid=abc123">Stop receiving replies for this event</a>
          </p>
        </td></tr></table>
      </body></html>
    `,
    expectedKeywords: ["accepted", "Product Strategy Review", "Monday Mar 15"],
  },
  {
    name: "Transactional notification with deep tracking URLs",
    html: `
      <html><body>
        <center>
          <table width="600"><tr><td>
            <a href="https://click.notification.service.com/CL0/https:%2F%2Fapp.service.com%2Fdashboard%3Futm_source%3Dnotification%26utm_medium%3Demail%26utm_campaign%3Dweekly_summary%26utm_content%3Dheader/1/abc123-def456-ghi789"><img src="https://static.service.com/email/logo.png" /></a>
            <h2>Your weekly summary</h2>
            <p>Here's what happened this week:</p>
            <ul>
              <li>3 new expenses pending review totaling €847.50</li>
              <li>1 payment completed for €2,100.00</li>
              <li>2 invoices overdue</li>
            </ul>
            <a href="https://click.notification.service.com/CL0/https:%2F%2Fapp.service.com%2Fexpenses%3Futm_source%3Dnotification/2/abc123" style="background:#0066ff;color:white;padding:10px 20px;">Review expenses</a>
            <p style="font-size:11px;color:#666;">
              You received this because you're subscribed to weekly summaries.
              <a href="https://click.notification.service.com/unsubscribe/abc123?token=xyz">Manage preferences</a>
            </p>
          </td></tr></table>
        </center>
      </body></html>
    `,
    expectedKeywords: ["weekly summary", "expenses", "pending review", "847.50", "invoices overdue"],
  },
  {
    name: "Plain text email (no HTML)",
    html: `Hi there,

I wanted to follow up on our conversation about the Product Manager role.
Are you still interested in scheduling a call this week?

Let me know what times work for you.

Thanks,
Sarah from Recruiting`,
    expectedKeywords: ["follow up", "Product Manager", "scheduling a call", "Recruiting"],
  },
  {
    name: "Minimal HTML wrapper around plain text",
    html: `
      <html><body>
        <div dir="ltr">
          <p>Dear Applicant,</p>
          <p>We regret to inform you that your application for the Data Engineer position has not been successful at this time.</p>
          <p>We appreciate your interest in our company and wish you all the best in your career search.</p>
          <p>Kind regards,<br/>HR Team</p>
        </div>
      </body></html>
    `,
    expectedKeywords: ["application", "Data Engineer", "not been successful", "career search"],
  },
  {
    name: "Image-heavy promotional with sparse text",
    html: `
      <html><body>
        <table width="100%"><tr><td align="center">
          <a href="https://tracking.example.com/click/abc123/campaign/spring-sale"><img src="https://cdn.example.com/email/spring-banner-2026.jpg" width="600" alt="Spring Sale - Up to 50% off" /></a>
        </td></tr></table>
        <table width="100%"><tr><td align="center">
          <a href="https://tracking.example.com/click/abc123/product/1"><img src="https://cdn.example.com/products/item1.jpg" width="200" alt="Premium Widget" /></a>
          <a href="https://tracking.example.com/click/abc123/product/2"><img src="https://cdn.example.com/products/item2.jpg" width="200" alt="Deluxe Gadget" /></a>
          <a href="https://tracking.example.com/click/abc123/product/3"><img src="https://cdn.example.com/products/item3.jpg" width="200" alt="Super Gizmo" /></a>
        </td></tr></table>
        <table><tr><td align="center" style="font-size:11px;color:#999;">
          <p>Shop now and save big this spring!</p>
          <a href="https://tracking.example.com/unsubscribe/abc123">Unsubscribe</a> |
          <a href="https://example.com/privacy">Privacy</a> |
          Example Inc, 456 Commerce St
        </td></tr></table>
      </body></html>
    `,
    expectedKeywords: ["Shop now"],
  },
  {
    name: "Newsletter with mixed content and social links",
    html: `
      <html><body>
        <table><tr><td>
          <a href="https://newsletter.example.com/view/abc123"><img src="https://cdn.newsletter.com/header-logo.png" /></a>
          <h1>Weekly Tech Digest</h1>
          <h2>AI Agents Are Changing How We Work</h2>
          <p>This week, three major companies announced AI agent platforms that promise to automate complex workflows. The implications for product teams are significant.</p>
          <a href="https://newsletter.example.com/click/abc123/article/1?utm_source=email&utm_medium=newsletter&utm_campaign=weekly_digest_2026_03_10">Read the full article →</a>
          <hr/>
          <h2>The Rise of Hybrid Search</h2>
          <p>Combining vector embeddings with traditional keyword search is becoming the gold standard for information retrieval. Here's why pure semantic search isn't enough.</p>
          <a href="https://newsletter.example.com/click/abc123/article/2?utm_source=email&utm_medium=newsletter&utm_campaign=weekly_digest_2026_03_10">Continue reading →</a>
          <hr/>
          <table><tr>
            <td><a href="https://twitter.com/example"><img src="https://cdn.newsletter.com/social/twitter.png" width="32" /></a></td>
            <td><a href="https://linkedin.com/company/example"><img src="https://cdn.newsletter.com/social/linkedin.png" width="32" /></a></td>
            <td><a href="https://youtube.com/example"><img src="https://cdn.newsletter.com/social/youtube.png" width="32" /></a></td>
          </tr></table>
          <p style="font-size:10px;">© 2026 TechDigest. All rights reserved.<br/>
          <a href="https://newsletter.example.com/unsubscribe/abc123">Unsubscribe</a></p>
        </td></tr></table>
      </body></html>
    `,
    expectedKeywords: ["AI Agents", "automate complex workflows", "product teams", "Hybrid Search", "vector embeddings", "keyword search"],
  },
];

describe("Gmail extractBody quality", () => {
  for (const fixture of fixtures) {
    test(fixture.name, () => {
      const text = extractBodyFromHtml(fixture.html);

      // Report: show what we got
      const urlCount = (text.match(/https?:\/\/\S{40,}/g) || []).length;
      const textLength = text.length;
      const cleanText = text.replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " ").trim();
      const cleanRatio = cleanText.length / Math.max(textLength, 1);

      console.log(`\n--- ${fixture.name} ---`);
      console.log(`  Total length: ${textLength} chars`);
      console.log(`  Long URLs found: ${urlCount}`);
      console.log(`  Clean text ratio: ${(cleanRatio * 100).toFixed(0)}%`);
      console.log(`  Clean text preview: ${cleanText.slice(0, 200)}`);

      // Check that expected keywords survive extraction
      const missingKeywords = fixture.expectedKeywords.filter(
        (kw) => !text.toLowerCase().includes(kw.toLowerCase())
      );
      if (missingKeywords.length > 0) {
        console.log(`  MISSING keywords: ${missingKeywords.join(", ")}`);
      }

      // Assertions
      expect(missingKeywords).toEqual([]); // all keywords must survive

      // Quality gate: clean text ratio should be > 50%
      // (if more than half the output is URLs, the extraction is poor)
      expect(cleanRatio).toBeGreaterThan(0.5);
    });
  }
});
