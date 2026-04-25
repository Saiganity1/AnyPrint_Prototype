import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <section className="panel">
      <h2>Page Not Found</h2>
      <p>This route does not exist in the React upgrade yet.</p>
      <Link className="btn" to="/">
        Go Home
      </Link>
    </section>
  );
}
