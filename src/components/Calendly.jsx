/**
 * CalendlyInline
 *
 * Embeds a Calendly scheduling widget inline on the page.
 * On first mount the component lazily injects the Calendly external script
 * (`widget.js`) into the document body — subsequent renders skip this step
 * because the script is identified by a stable `id` attribute.
 * Calendly then scans the DOM for elements with the class
 * `calendly-inline-widget` and `data-url`, and replaces them with an iframe.
 *
 * @param {string} url    — Full Calendly scheduling URL (defaults to the
 *                          LeaseLink set-call link)
 * @param {number} height — Desired widget height in pixels (default 700).
 *                          Note: the current implementation sets height to
 *                          "90%" via inline style; this prop is accepted but
 *                          not yet applied to the style object.
 */
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
