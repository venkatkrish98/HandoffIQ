# HandoffIQ privacy policy

HandoffIQ is a Forge app that runs entirely on Atlassian infrastructure (Runs on Atlassian). It has no backend of its own and sends no data to any third party.

**What it reads.** Jira issues and Confluence pages that the signed-in user can already access, using that user's own permissions (`asUser`). Content is analysed inside the Forge function and is not sent anywhere else.

**What it stores.** Handover records, analysis results, clarification answers and an audit trail are saved in the app's Forge Key-Value Store, in the customer's Atlassian site. Records contain Atlassian account IDs and the text the user entered or the analysis quoted. Handovers are private to their creator. Nothing is copied to systems operated by the app author, and nothing is cached outside Forge.

**What it writes.** Jira issues and Confluence pages are created only after the user reviews and approves them, as that user.

**Deletion.** A handover can be deleted in the app (Delete handover). Uninstalling the app removes its Forge storage.

**AI.** The analysis is deterministic and rule-based. No external AI provider receives your data.

**Contact.** venkatswamy2304@gmail.com
