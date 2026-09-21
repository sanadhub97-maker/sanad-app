import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

export function RouteProgressBar() {
  const location = useLocation();
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(true);
    const timer = setTimeout(() => {
      setActive(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [location.pathname, location.search]);

  return (
    <div className="fixed top-0 inset-x-0 z-50 h-[2.5px] pointer-events-none overflow-hidden">
      <AnimatePresence>
        {active && (
          <motion.div
            key={location.key || location.pathname}
            initial={{ scaleX: 0, transformOrigin: "0% 50%", opacity: 1 }}
            animate={{ scaleX: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.35,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="h-full w-full bg-gradient-to-r from-blue-600 via-cyan-400 to-indigo-600 shadow-[0_0_12px_rgba(37,99,235,0.7)]"
          />
        )}
      </AnimatePresence>
    </div>
  );
}

