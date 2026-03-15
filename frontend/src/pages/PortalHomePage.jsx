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
          <h1>Admin / Registrar Portal</h1>
          <p>For enrollment review, approval, reporting, and system management.</p>
          <Link className="portal-link" to="/login">
            Open Staff Portal
          </Link>
        </article>
      </section>
    </main>
  );
}

export default PortalHomePage;
