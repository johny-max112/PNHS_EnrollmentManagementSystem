import { Link } from 'react-router-dom';

function PortalHomePage() {
  return (
    <main className="page-shell">
      <section className="portal-grid">
        <article className="enroll-card portal-card">
          <h1>Student Portal</h1>
          <p>For student enrollment, status tracking, subject viewing, section assignment, and COE access.</p>
          <Link className="portal-link" to="/student/login">
            Open Student Portal
          </Link>
        </article>

        <article className="enroll-card portal-card">
          <h1>Admin Portal</h1>
          <p>For system management, reports, enrollment workflow, and user account administration.</p>
          <Link className="portal-link" to="/admin/login">
            Open Admin Portal
          </Link>
        </article>

        <article className="enroll-card portal-card">
          <h1>Registrar Portal</h1>
          <p>For enrollment review, approvals, and section and report workflow tasks.</p>
          <Link className="portal-link" to="/registrar/login">
            Open Registrar Portal
          </Link>
        </article>
      </section>
    </main>
  );
}

export default PortalHomePage;
