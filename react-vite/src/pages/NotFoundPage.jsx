import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <section className="notfound-page">
      <div className="page-intro">
        <p className="page-kicker">Not Found</p>
        <h2 className="page-title">Page Not Found</h2>
        <p className="page-lead">This route does not exist.</p>
      </div>
      <section className="panel">
        <p>Try returning to the homepage or navigating from the menu.</p>
        <Link className="btn" to="/">
          Go Home
        </Link>
      </section>
    </section>
  );
}
