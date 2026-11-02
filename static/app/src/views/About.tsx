import { PREVIEW } from '../api';
import { Icon } from '../ui';

export function About() {
  return (
    <>
      <header className="page-head">
        <div><h1>How HandoffIQ works</h1><p className="sub">A handover you can verify, not just a summary you have to trust.</p></div>
      </header>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        <section className="card"><h2><Icon name="link" size={18} /> Evidence-linked</h2><p className="muted" style={{ marginTop: 8 }}>Every requirement, decision, dependency and risk quotes the exact sentence it came from and links to the Jira issue or Confluence page. Items are labelled <em>verified</em>, <em>inference</em>, <em>missing</em> or <em>assumption</em>.</p></section>
        <section className="card"><h2><Icon name="alert" size={18} /> Conflicts &amp; gaps</h2><p className="muted" style={{ marginTop: 8 }}>Owners, dates and scope statements are compared across sources. Unassigned issues, unresolved items and absent decisions become clarification questions.</p></section>
        <section className="card"><h2><Icon name="shield" size={18} /> Human-controlled</h2><p className="muted" style={{ marginTop: 8 }}>The analysis only reads. Jira issues and the Confluence page are created only after you review the exact changes and approve them, and everything is recorded in the audit trail.</p></section>
        <section className="card"><h2><Icon name="clock" size={18} /> Fresh &amp; explainable</h2><p className="muted" style={{ marginTop: 8 }}>Each source shows when it was retrieved. The readiness score shows the seven weighted dimensions behind it. It measures information completeness, not project success.</p></section>
      </div>
      <section className="card" style={{ marginTop: 16 }}>
        <h2>Good to know</h2>
        <ul className="muted" style={{ paddingLeft: 20, margin: '10px 0 0' }}>
          <li>Analysis is rule-based and runs inside Forge. No data leaves Atlassian. Use the <strong>HandoffIQ Rovo agent</strong> for conversational reasoning over the same results.</li>
          <li>Handovers are private to the user who created them. Retrieval runs as you, so you only ever see content you are allowed to see.</li>
          <li>Pattern-based extraction can miss unusual phrasing. Treat “no conflicts” as “none detected”.</li>
          <li>Handovers marked <em>Synthetic data</em> use built-in sample content, not your site.</li>
        </ul>
        {PREVIEW && <p className="banner" style={{ marginTop: 14 }}>Preview build: Jira/Confluence writes are simulated.</p>}
      </section>
    </>
  );
}
