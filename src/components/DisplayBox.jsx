// DisplayBox.jsx
// Generic gradient container used to wrap page content sections.
// Applies the custom `bg-lease-gradient` Tailwind class and consistent padding/rounding.
// Accepts an optional `className` prop for per-use overrides.
import { Children } from "react"

//Container that holds bg-lease-gradient for display
const DisplayBox = ({children, className}) => {
    return (
        <div className={`w-full bg-lease-gradient rounded-lg p-6 flex pb-20 ${className}`}>
            {children}
        </div>
    )
}
export default DisplayBox