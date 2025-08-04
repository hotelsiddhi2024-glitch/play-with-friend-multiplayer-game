import React from 'react'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>

const Button: React.FC<ButtonProps> = ({ children, className = '', ...props }) => (
  <button className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 ${className}`} {...props}>
    {children}
  </button>
)

export default Button
