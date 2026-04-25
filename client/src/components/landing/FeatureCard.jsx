import { useRef, useEffect, useState } from "react";

export default function FeatureCard({ icon: Icon, title, description, index = 0 }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`feature-card ${isVisible ? "feature-card-visible" : ""}`}
      style={{ transitionDelay: `${index * 120}ms` }}
    >
      <div className="feature-card-icon">
        <Icon size={28} strokeWidth={1.5} />
      </div>
      <h3 className="feature-card-title">{title}</h3>
      <p className="feature-card-desc">{description}</p>
      <div className="feature-card-glow" />
    </div>
  );
}
