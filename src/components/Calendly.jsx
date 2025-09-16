// components/CalendlyInline.jsx
import { useEffect, useRef } from "react";

export default function CalendlyInline({
    url = "https://calendly.com/jtaylor-leaselink/set-call",
    height = 700,
}) {
    const ref = useRef(null);

    useEffect(() => {
        // add Calendly script once
        const src = "https://assets.calendly.com/assets/external/widget.js";
        const id = "calendly-widget-script";
        if (!document.getElementById(id)) {
            const s = document.createElement("script");
            s.id = id;
            s.src = src;
            s.async = true;
            document.body.appendChild(s);
        }
    }, []);

    return (
        <div
            ref={ref}
            className="calendly-inline-widget"
            data-url={url}
            style={{
                width: "90%",
                height: "90%",
                // important in flex/grid containers to prevent overflow
                minWidth: 0,
                minHeight: 0,
            }}
        />
    );
}
