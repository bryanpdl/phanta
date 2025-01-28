"use client";

const AnimatedBackground = () => {
  return (
    <div className="fixed inset-0 w-full h-full z-0">
      <iframe
        src="https://unicorn.studio/embed/gRchREectBiqgRaXVAgc"
        width="1920px"
        height="1080px"
        loading="lazy"
        className="w-full h-full"
        title="Interactive Background"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
      />
    </div>
  );
};

export default AnimatedBackground; 