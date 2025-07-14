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