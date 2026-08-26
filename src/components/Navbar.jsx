function Navbar() {
  return (
    <nav className="navbar">
      <div className="logo">
        <span className="logo-icon">R</span>
        <span>REFERRAL</span>
      </div>

      <div className="nav-right">
        <span className="nav-status">
          <span className="status-dot"></span>
          Live
        </span>

        <button className="profile-button">
          Dream
        </button>
      </div>
    </nav>
  );
}

export default Navbar;