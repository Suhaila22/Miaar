# Mi'yar User Guide for Evaluation and Institutional Excellence

**Version:** 1.0 (August 2026)  
**Design and review:** Eng. Dr. Suhaila Mohieldin  
**Platform:** Mi'yar Platform Development Team

---

## 1. About Mi'yar

**Mi'yar** is a professional intelligent platform for structuring evaluation, judging, and nomination-file management for government, private-sector, and academic organizations. It combines institutional-excellence evaluation practices with AI-assisted evidence analysis, weighted scoring, recommendations, auditability, and an advanced administration workspace.

The interface supports Arabic RTL and English LTR modes. Users can switch languages from the sidebar without losing their current data. The platform supports four judging programs and adapts its rubric and evidence guidance to the selected program.

---

## 2. Supported Judging Programs

Choose the most appropriate judging program before uploading evidence. Mi'yar automatically adapts the evaluation criteria and context to the selected program.

| Judging program | Purpose and focus | Typical criteria and evidence themes |
| :--- | :--- | :--- |
| **Institutional Excellence** | Evaluates leadership, strategy, innovation, operational practices, stakeholder experience, and sustainable impact. | Leadership, strategy, innovation, results, sustainability, customer experience, and people. |
| **Academic Graduation Projects** | Evaluates university projects, applied research, originality, methodology, and implementation quality. | Originality, research method, prototype, presentation, and delivery. |
| **Tenders and Proposals** | Evaluates technical and financial offers, compliance, execution plans, and supplier risk. | Technical compliance, financial fit, delivery plan, and risk management. |
| **Employee Performance** | Measures individual performance, objectives, output quality, and continuous improvement. | Goal achievement, responsiveness, development initiatives, and output quality. |

---

## 3. Sign In and Create an Account

When you open Mi'yar, the welcome screen provides two clear actions: **Sign in** and **Create an account**.

Both actions open the same form: **Create an account** collects a name, email address, and password and signs you in immediately; **Sign in** asks for the email and password of an existing account. Passwords are stored encrypted and are never visible to anyone, including administrators.

After authentication, the platform applies the account role. Standard users can access evaluation workspaces and assigned tasks, while administrators can access control-center analytics and user-management operations. Use **Sign out** from the account menu whenever you finish a session.

> If an administrator provisions a user from the Users directory, that user can later create a password with the same email address on the **Create an account** screen to activate the account.

---

## 4. Account and Profile

Open the profile menu at the bottom of the sidebar and select **My account** to open `/account`.

The account page provides the following controls:

* **Display name:** Edit the name shown throughout the platform and select **Save profile**.
* **Email address:** Displayed as read-only. Contact an administrator to change the email on file for your account.
* **Account role:** Displayed as read-only so role changes remain an administrator-controlled operation.
* **Account security:** Confirms that your password is stored encrypted.
* **Sign out:** Ends the current authenticated session.

Account and related-data deletion is restricted to administrators to preserve evaluation records. Administrators manage deletion through the dedicated Users directory rather than from the personal profile page.

---

## 5. Evaluation Workflow

To evaluate a nomination or initiative, follow these steps:

1. **Select a judging program:** Choose Institutional Excellence, Graduation Projects, Tenders and Proposals, or Employee Performance.
2. **Customize criteria weights (optional):** Adjust percentage weights before starting, ensuring that the total equals 100%. Save a configuration as a reusable template when appropriate.
3. **Enter the nomination context:** Provide the initiative or organization name and the reference context that guides the judges.
4. **Upload evidence:** Drag and drop supporting files. Mi'yar supports PDF, DOCX, PPTX, XLSX, CSV, JPG, PNG, and WEBP files, detects file types, and extracts document content for analysis.
5. **Review evidence coverage:** Use the coverage strip to identify which criteria are supported by the submitted evidence.
6. **Add criterion notes and attachments:** Judges can add comments and attach supporting files to individual criterion scores.
7. **Review multiple-judge input:** When several judges assess the same candidate, the platform calculates and displays the average score with an individual judge breakdown.
8. **Sign off:** Use the digital signature pad to approve the final evaluation before submission.

---

## 6. Results, Audit Trail, and Exports

Mi'yar calculates the weighted total score, ranking, medal tier, strengths, weaknesses, and improvement recommendations. The leaderboard supports search, medal filters, perfect-score filtering, and side-by-side comparison of two candidates.

The **Mi'yar Copilot** can generate evidence-grounded nomination and award-decision summaries in Arabic or English. Use the copy control to reuse the generated summary in an official communication or decision record.

Evaluation history includes score modifications, judge notes, signature timestamps, and related audit events. Export controls are available for leaderboard results, nomination detail reports, and award samples. PDF reports can include the Mi'yar branding, evaluation metrics, criterion details, comparison charts, and evaluator/approver signature fields. Leaderboard data can also be exported for spreadsheet reporting.

---

## 7. Awards Library

The **Awards Library** contains 12 clearly labeled illustrative award samples distributed across the supported judging programs. These samples are demonstration material and are not real client awards or customer testimonials.

* **Search and filters:** Search by initiative or organization, then filter by program, certification tier, or award type.
* **Specialized tags:** Apply one or more tags such as sustainability, innovation, digital transformation, or community impact. Multiple active tags narrow the results together.
* **Award details:** Open a card to review the score, summary, performance indicators, rationale, and PDF export action.
* **Administration:** Administrators can create, edit, or delete illustrative award samples and request bilingual Copilot descriptions.

---

## 8. Admin Control Center

The Admin Control Center gives platform administrators a real-data operational overview:

* **KPIs:** Active awards, nominations in preparation, incomplete requirements, and upcoming deadlines.
* **Interactive analytics:** Six-month evaluation volume, program distribution, certification bands, rubric readiness, radar views, evidence health, and program benchmarks with hover and keyboard inspection.
* **Review workflow:** Upcoming and overdue assignments, judge workload, recent nominations, and audit activity.
* **Trial management:** Monitor the fixed five-attempt free trial and reset a user's attempts when appropriate.
* **Improvement opportunities:** Identify criteria that need stronger evidence or better performance across recorded evaluations.

---

## 9. User Management and Roles

The **Users** item is visible in the sidebar to administrators only and opens the dedicated `/users` directory.

The directory displays account totals, administrator and standard-user counts, recent activity, trial status, evaluation counts, assigned review tasks, and completed tasks. Administrators can search by name or email and filter by role or trial status.

### Add a user

Select **Add user**, enter a valid name and email address, choose the account role, and save. The provisioned user can later visit **Create an account** with the same email address to set a password and activate the account.

### Edit a user

Select **Edit user** on a user card or row to update the display name, role, or trial-attempt counter. The email address of an account that has already been activated remains read-only. The current administrator cannot change or remove their own account through destructive actions.

### Delete a user

Select **Delete user**, review the bilingual confirmation dialog, and confirm only when the account should be removed. The system protects the current administrator from self-deletion and removes dependent assignments, evaluations, and audit records according to the account-lifecycle rules.

### Reset trial attempts

Administrators can reset a user's trial counter from the Users directory. The platform-wide free trial is limited to **five attempts per user**.

---

## 10. FAQ

### How do I create an account?
Select **Create an account** on the welcome screen and fill in your name, email address, and a password (at least 8 characters). Mi'yar creates your profile and signs you in immediately.

### Why can I not edit my email address?
The email address is intentionally read-only inside Mi'yar once an account is active. Contact an administrator if the account was provisioned with an incorrect email.

### Why can I not see the Users page?
The Users directory is restricted to administrator accounts. Ask a platform administrator to review your role if you believe you should have access.

### How many free evaluations can I run?
The free trial allows up to five evaluation attempts per user. Administrators can reset the counter when appropriate. For extension requests, contact **soso22083@gmail.com**.

### Can I use more than one judging program?
Yes. Select the appropriate program for each nomination. Mi'yar adapts the rubric, evidence categories, and evaluation context to the selected program.

### How are multiple judges handled?
Each judge can submit criterion scores, comments, attachments, and a signature. Mi'yar displays the individual submissions and calculates the average score automatically.

### Where can I find my generated summary?
Open the nomination detail view and use the Copilot summary control. Choose Arabic or English, generate the evidence-grounded summary, and copy it when ready.

---

## 11. Troubleshooting

| Issue | Recommended action |
| :--- | :--- |
| **The sign-in screen keeps returning after signing in.** | Refresh the page, confirm that cookies are enabled in your browser, and sign in again with your email and password. |
| **I forgot my password.** | Contact a platform administrator — they can reset your account from the Users directory. |
| **The profile Save button does not update the name.** | Enter at least two characters, remove leading/trailing spaces, and submit again. If the message persists, refresh and retry. |
| **The email field is disabled.** | Emails cannot be edited from Mi'yar once an account is active. Ask an administrator to provision the correct email or contact support. |
| **The Users menu is missing.** | Confirm that you are signed in with an administrator role. Standard users do not receive access to `/users`. |
| **An uploaded file is not accepted.** | Check that the file is PDF, DOCX, PPTX, XLSX, CSV, JPG, PNG, or WEBP, then retry with a smaller or undamaged file. |
| **The AI summary or evaluation fails.** | Confirm that required evidence and a nomination title are present, then retry. Do not repeatedly submit if the service reports an error; contact support with the nomination context. |
| **The trial appears exhausted unexpectedly.** | Review the attempt count in the subscription panel. If a failed evaluation consumed an attempt incorrectly, contact an administrator or support at **soso22083@gmail.com**. |
| **The PDF opens as a blank page.** | Allow the browser to finish loading the generated report, then use the browser print dialog to save as PDF. Try a current version of Chrome, Edge, or Safari. |
| **The language direction looks incorrect.** | Use the language toggle in the sidebar, refresh the page, and ensure the browser is not forcing an extension or custom page direction. |

If the issue remains unresolved, include the page name, approximate time, account email, judging program, and a short description when contacting **soso22083@gmail.com**. Do not send confidential evidence files unless the support team specifically requests them through an approved channel.

---

## 12. Support and Contact

For questions, trial-extension requests, or technical support, contact the official support address:

**Email:** [soso22083@gmail.com](mailto:soso22083@gmail.com)

---

## References

1. Mi'yar platform documentation for institutional excellence and intelligent judging, 2026.
2. Mi'yar bilingual interface and RTL/LTR implementation guidance.
3. Mi'yar evaluation report and PDF export specifications.
4. Mi'yar support and subscription contact process.
