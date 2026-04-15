"use client";

import { useEffect, useState } from "react";

function proxyUrl(url: string) {
  const withoutProtocol = url.replace(/^https?:\/\//, "");
  return `https://images.weserv.nl/?url=${encodeURIComponent(withoutProtocol)}&w=1400&output=jpg&q=82`;
}

type ProgressiveImageProps = {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  loading?: "lazy" | "eager";
};

export function ProgressiveImage({
  src,
  alt,
  className,
  imgClassName,
  loading = "lazy"
}: ProgressiveImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [activeSrc, setActiveSrc] = useState(() => proxyUrl(src));
  const [triedDirect, setTriedDirect] = useState(false);

  useEffect(() => {
    setActiveSrc(proxyUrl(src));
    setLoaded(false);
    setTriedDirect(false);
  }, [src]);

  function handleError() {
    if (!triedDirect) {
      setTriedDirect(true);
      setActiveSrc(src);
    }
  }

  return (
    <div className={`progressive-image ${loaded ? "is-loaded" : ""} ${className ?? ""}`}>
      <div className="progressive-image-skeleton" aria-hidden />
      <img
        src={activeSrc}
        alt={alt}
        loading={loading}
        decoding="async"
        referrerPolicy="no-referrer"
        className={imgClassName}
        onLoad={() => setLoaded(true)}
        onError={handleError}
      />
    </div>
  );
}
