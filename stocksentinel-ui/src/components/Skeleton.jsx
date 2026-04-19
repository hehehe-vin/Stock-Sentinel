export default function Skeleton({ className = '', style = {} }) {
  return (
    <div 
      className={`animate-pulse rounded-md ${className}`} 
      style={{ background: 'var(--bg-secondary)', ...style }}
    ></div>
  );
}
