function Skeleton({ className = "" }) {
  return (
    <div
      className={`bg-gray-700/50 animate-pulse rounded-lg ${className}`}
    />
  );
}

export default Skeleton;