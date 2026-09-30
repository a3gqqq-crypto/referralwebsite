import { Navigate, useLocation, useParams } from "react-router-dom";

// /join/NAME?squad=TAG is the shareable invite link (it gets its own link
// preview from the server). In the app it's the same as /?ref=NAME&squad=TAG.
function JoinRedirect() {
  const { ref } = useParams();
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  if (ref) params.set("ref", ref);

  return <Navigate to={`/?${params.toString()}`} replace />;
}

export default JoinRedirect;
