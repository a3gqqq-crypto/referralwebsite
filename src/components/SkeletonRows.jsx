function SkeletonRows({ count = 4 }) {
  return (
    <div className="skeleton-rows">
      {Array.from({ length: count }).map((_, index) => (
        <div className="skeleton-row" key={index}>
          <div className="skeleton skeleton-avatar"></div>

          <div className="skeleton-lines">
            <div className="skeleton skeleton-line medium"></div>
            <div className="skeleton skeleton-line short"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default SkeletonRows;
