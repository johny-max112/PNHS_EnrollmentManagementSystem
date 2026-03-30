import { Link } from 'react-router-dom';
import '../styles/base.css';
import '../styles/PortalHomePage.css';

function PortalHomePage() {
  return (
    <main className="page-shell">
      <section className="portal-grid">
        <article className="enroll-card portal-card">
          <h1>Admin Portal</h1>
          <p>For system management, reports, enrollment workflow, and user account administration.</p>
          <Link className="portal-link" to="/admin/login">
            Open Admin Portal
          </Link>
        </article>

        <article className="enroll-card portal-card">
          <h1>Registrar Portal</h1>
          <p>For enrollment processing, document verification, and report workflow tasks.</p>
          <Link className="portal-link" to="/registrar/login">
            Open Registrar Portal
          </Link>
        </article>
      </section>
    </main>
  );
}

export default PortalHomePage;
