'use client';

/**
 * GradientMesh - Animated background component for auth pages
 * Creates a deep navy gradient with floating orbs
 */
export function GradientMesh() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #001429 0%, #002952 50%, #003d7a 100%)'
        }}
      />
      {/* Animated orbs */}
      <div
        className="absolute w-96 h-96 rounded-full blur-3xl opacity-20 animate-welcome-float"
        style={{
          background: 'radial-gradient(circle, #0099ff 0%, transparent 70%)',
          top: '10%',
          right: '-10%'
        }}
      />
      <div
        className="absolute w-80 h-80 rounded-full blur-3xl opacity-15 animate-welcome-float-slow"
        style={{
          background: 'radial-gradient(circle, #ffcc00 0%, transparent 70%)',
          bottom: '20%',
          left: '-5%'
        }}
      />
      <div
        className="absolute w-64 h-64 rounded-full blur-3xl opacity-10 animate-welcome-float-slower"
        style={{
          background: 'radial-gradient(circle, #0066cc 0%, transparent 70%)',
          top: '50%',
          right: '20%'
        }}
      />
    </div>
  );
}
